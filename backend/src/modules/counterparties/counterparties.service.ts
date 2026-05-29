import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { ContractDocType, CounterpartyType, Prisma, ShipmentStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { createReadStream, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { basename, extname, join } from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { normalizeUploadedFileName } from '../../common/utils/upload-filename.util';
import { CreateCounterpartyDto, UpdateCounterpartyDto } from './dto/counterparty.dto';
import { CreateContractMetaDto, UpdateContractMetaDto } from './dto/contracts.dto';
import {
  extractProcurementItemsFromHtml,
  extractProcurementItemsFromPdfText,
  type ContractProcurementItem,
} from './contract-procurement.parser';
import pdfParse = require('pdf-parse');
import mammoth from 'mammoth';

const MAX_CONTRACT_FILE_SIZE_BYTES = 25 * 1024 * 1024;

function inferDocTypeByExt(ext: string): ContractDocType {
  switch (ext.toLowerCase()) {
    case '.docx':
      return ContractDocType.DOCX;
    case '.html':
    case '.htm':
      return ContractDocType.HTML;
    case '.pdf':
      return ContractDocType.PDF;
    default:
      return ContractDocType.OTHER;
  }
}

function isAllowedContract(ext: string, mime: string): boolean {
  const e = ext.toLowerCase();
  const m = (mime || '').toLowerCase();
  if (e === '.docx') {
    return (
      m === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      m === 'application/octet-stream' ||
      m === 'application/zip'
    );
  }
  if (e === '.html' || e === '.htm') {
    return m === 'text/html' || m === 'application/octet-stream';
  }
  if (e === '.pdf') {
    return m === 'application/pdf' || m === 'application/octet-stream';
  }
  return false;
}

@Injectable()
export class CounterpartiesService {
  private readonly uploadsRoot: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.uploadsRoot = config.get<string>('uploadsDir') ?? join(process.cwd(), 'uploads');
  }

  async list(type: CounterpartyType, q?: string) {
    const query = (q ?? '').trim();
    const items = await this.prisma.counterparty.findMany({
      where: {
        type,
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { inn: { contains: query, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      take: 200,
    });
    return { items };
  }

  async create(dto: CreateCounterpartyDto) {
    return this.prisma.counterparty.create({
      data: {
        type: dto.type,
        name: dto.name.trim(),
        fullName: dto.fullName?.trim() || null,
        inn: dto.inn?.trim() || null,
        kpp: dto.kpp?.trim() || null,
        comment: dto.comment?.trim() || null,
      },
    });
  }

  async remove(id: string) {
    const row = await this.prisma.counterparty.findUnique({
      where: { id },
      include: {
        contracts: { select: { id: true, storagePath: true } },
        _count: { select: { customerShipments: true, legalEntityShipments: true } },
      },
    });
    if (!row) throw new NotFoundException('Контрагент не найден');

    const activeShipments = await this.prisma.shipment.count({
      where: {
        OR: [{ counterpartyId: id }, { legalEntityId: id }],
        status: {
          in: [
            ShipmentStatus.DRAFT,
            ShipmentStatus.NEW,
            ShipmentStatus.PICKING,
            ShipmentStatus.PICKING_ON_HOLD,
            ShipmentStatus.PICKED,
          ],
        },
      },
    });
    if (activeShipments > 0) {
      throw new ConflictException(
        'Нельзя удалить заказчика: есть активные отгрузки (новые, в сборке или ожидают списания). Сначала завершите их.',
      );
    }

    for (const c of row.contracts) {
      if (c.storagePath && existsSync(c.storagePath)) {
        try {
          unlinkSync(c.storagePath);
        } catch {
          /* ignore */
        }
      }
    }

    await this.prisma.counterparty.delete({ where: { id } });
    return {
      ok: true as const,
      removedContracts: row.contracts.length,
      detachedShipments: row._count.customerShipments + row._count.legalEntityShipments,
    };
  }

  async update(id: string, dto: UpdateCounterpartyDto) {
    const existing = await this.prisma.counterparty.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Контрагент не найден');
    return this.prisma.counterparty.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        ...(dto.fullName !== undefined ? { fullName: dto.fullName?.trim() || null } : {}),
        inn: dto.inn?.trim() ?? undefined,
        kpp: dto.kpp?.trim() ?? undefined,
        comment: dto.comment?.trim() ?? undefined,
        isActive: dto.isActive,
      },
    });
  }

  private contractDir(counterpartyId: string): string {
    return join(this.uploadsRoot, 'contracts', counterpartyId);
  }

  async listContracts(counterpartyId: string, q?: string) {
    const query = (q ?? '').trim();
    const items = await this.prisma.contract.findMany({
      where: {
        counterpartyId,
        ...(query
          ? {
              OR: [
                { number: { contains: query, mode: 'insensitive' } },
                { title: { contains: query, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 200,
    });
    return { items: items.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })) };
  }

  async searchContractsByNumber(number: string) {
    const n = number.trim();
    if (!n) return { items: [] };
    const items = await this.prisma.contract.findMany({
      where: { number: { contains: n, mode: 'insensitive' } },
      include: { counterparty: { select: { id: true, name: true, type: true } } },
      orderBy: [{ createdAt: 'desc' }],
      take: 50,
    });
    return {
      items: items.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
      })),
    };
  }

  async uploadContract(
    counterpartyId: string,
    file: Express.Multer.File | undefined,
    meta: CreateContractMetaDto,
    uploadedBy?: string,
    clientOriginalName?: string,
  ) {
    const cp = await this.prisma.counterparty.findUnique({ where: { id: counterpartyId } });
    if (!cp) throw new NotFoundException('Контрагент не найден');

    if (!file) throw new BadRequestException('Файл не передан');
    if (file.size <= 0) throw new BadRequestException('Пустой файл');
    if (file.size > MAX_CONTRACT_FILE_SIZE_BYTES) {
      throw new BadRequestException('Размер файла не должен превышать 25 МБ');
    }

    const rawName = clientOriginalName?.trim() || file.originalname || 'contract';
    const originalName = basename(normalizeUploadedFileName(rawName));
    const ext = extname(originalName || '').toLowerCase();
    if (!isAllowedContract(ext, file.mimetype)) {
      throw new BadRequestException('Допустимы только .docx, .html, .pdf');
    }

    const docType = inferDocTypeByExt(ext);
    const dir = this.contractDir(counterpartyId);
    mkdirSync(dir, { recursive: true });

    const record = await this.prisma.contract.create({
      data: {
        counterpartyId,
        number: meta.number.trim(),
        date: meta.date ? new Date(meta.date) : null,
        title: meta.title?.trim() || null,
        docType,
        originalName,
        mimeType: file.mimetype || 'application/octet-stream',
        fileSize: file.size,
        fileName: '',
        storagePath: '',
        uploadedBy: uploadedBy ?? null,
      },
    });

    const storedName = `${record.id}${ext || ''}`;
    const storagePath = join(dir, storedName);
    writeFileSync(storagePath, file.buffer);

    const updated = await this.prisma.contract.update({
      where: { id: record.id },
      data: { fileName: storedName, storagePath },
    });

    return { ...updated, createdAt: updated.createdAt.toISOString() };
  }

  async getContractFile(contractId: string): Promise<{ stream: StreamableFile; fileName: string }> {
    const row = await this.prisma.contract.findUnique({ where: { id: contractId } });
    if (!row) throw new NotFoundException('Контракт не найден');
    if (!existsSync(row.storagePath)) {
      throw new NotFoundException('Файл контракта отсутствует на диске');
    }
    const displayName = normalizeUploadedFileName(row.originalName);
    const stream = createReadStream(row.storagePath);
    return {
      stream: new StreamableFile(stream, {
        type: row.mimeType,
        disposition: `inline; filename*=UTF-8''${encodeURIComponent(displayName)}`,
      }),
      fileName: displayName,
    };
  }

  async getContractProcurementItems(contractId: string, opts?: { force?: boolean }) {
    const force = Boolean(opts?.force);
    const row = await this.prisma.contract.findUnique({ where: { id: contractId } });
    if (!row) throw new NotFoundException('Контракт не найден');
    if (!existsSync(row.storagePath)) {
      throw new NotFoundException('Файл контракта отсутствует на диске');
    }

    if (!force && row.procurementItems && row.procurementParsedAt && !row.procurementParseError) {
      return { contractId, items: row.procurementItems as ContractProcurementItem[] };
    }

    let items: ContractProcurementItem[] = [];
    let parseError: string | null = null;
    try {
      const buf = readFileSync(row.storagePath);
      if (row.docType === ContractDocType.HTML) {
        const html = buf.toString('utf-8');
        items = extractProcurementItemsFromHtml(html);
      } else if (row.docType === ContractDocType.DOCX) {
        const res = await mammoth.convertToHtml({ buffer: buf });
        items = extractProcurementItemsFromHtml(res.value);
      } else if (row.docType === ContractDocType.PDF) {
        const res = await (pdfParse as unknown as (b: Buffer) => Promise<{ text: string }>)(buf);
        items = extractProcurementItemsFromPdfText(res.text);
      } else {
        throw new BadRequestException('Тип файла контракта не поддерживается для авторазбора');
      }

      if (!items.length) {
        throw new BadRequestException('Не удалось извлечь позиции из раздела «Объект закупки»');
      }
    } catch (e) {
      parseError = e instanceof Error ? e.message : 'Ошибка разбора контракта';
      items = [];
    }

    await this.prisma.contract.update({
      where: { id: contractId },
      data: {
        procurementItems: items.length ? (items as unknown as object) : Prisma.DbNull,
        procurementParsedAt: new Date(),
        procurementParseError: parseError,
      },
    });

    if (parseError) throw new BadRequestException(parseError);
    return { contractId, items };
  }

  async removeContract(contractId: string): Promise<{ ok: true }> {
    const row = await this.prisma.contract.findUnique({ where: { id: contractId } });
    if (!row) throw new NotFoundException('Контракт не найден');

    if (row.storagePath && existsSync(row.storagePath)) {
      try {
        unlinkSync(row.storagePath);
      } catch {
        /* ignore */
      }
    }

    await this.prisma.contract.delete({ where: { id: contractId } });
    return { ok: true };
  }

  async updateContractMeta(contractId: string, dto: UpdateContractMetaDto) {
    const row = await this.prisma.contract.findUnique({ where: { id: contractId } });
    if (!row) throw new NotFoundException('Контракт не найден');

    const hasAny =
      dto.number !== undefined || dto.date !== undefined || dto.title !== undefined;
    if (!hasAny) throw new BadRequestException('Нет данных для обновления');

    const next = await this.prisma.contract.update({
      where: { id: contractId },
      data: {
        ...(dto.number !== undefined ? { number: dto.number.trim() } : {}),
        ...(dto.date !== undefined
          ? { date: dto.date ? new Date(dto.date) : null }
          : {}),
        ...(dto.title !== undefined ? { title: dto.title?.trim() || null } : {}),
      },
    });

    return { ...next, createdAt: next.createdAt.toISOString() };
  }
}

