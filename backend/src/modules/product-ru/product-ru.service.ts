import {
  BadRequestException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream, existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { basename, extname, join } from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { normalizeUploadedFileName } from '../../common/utils/upload-filename.util';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = 'application/pdf';

export type ProductRuDto = {
  id: string;
  productId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  uploadedBy: string | null;
  createdAt: string;
};

@Injectable()
export class ProductRuService {
  private readonly uploadsRoot: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.uploadsRoot = config.get<string>('uploadsDir') ?? join(process.cwd(), 'uploads');
  }

  private async ensureProductExists(productId: string): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Товар не найден');
  }

  private productRuDir(productId: string): string {
    return join(this.uploadsRoot, 'ru', productId);
  }

  private toDto(row: {
    id: string;
    productId: string;
    fileName: string;
    originalName: string;
    mimeType: string;
    fileSize: number;
    uploadedBy: string | null;
    createdAt: Date;
  }): ProductRuDto {
    return {
      id: row.id,
      productId: row.productId,
      fileName: row.fileName,
      originalName: normalizeUploadedFileName(row.originalName),
      mimeType: row.mimeType,
      fileSize: row.fileSize,
      uploadedBy: row.uploadedBy,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async list(productId: string): Promise<{ items: ProductRuDto[] }> {
    await this.ensureProductExists(productId);
    const rows = await this.prisma.productRegistrationCertificate.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
    });
    return { items: rows.map((row) => this.toDto(row)) };
  }

  async upload(
    productId: string,
    file: Express.Multer.File | undefined,
    uploadedBy?: string,
    clientOriginalName?: string,
  ): Promise<ProductRuDto> {
    await this.ensureProductExists(productId);
    if (!file) throw new BadRequestException('Файл не передан');
    if (file.size <= 0) throw new BadRequestException('Пустой файл');
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException('Размер файла не должен превышать 10 МБ');
    }
    const mime = file.mimetype?.toLowerCase() ?? '';
    const ext = extname(file.originalname || '').toLowerCase();
    if (mime !== ALLOWED_MIME && ext !== '.pdf') {
      throw new BadRequestException('Допустим только PDF');
    }

    const dir = this.productRuDir(productId);
    mkdirSync(dir, { recursive: true });

    const rawName =
      clientOriginalName?.trim() || file.originalname || 'document.pdf';
    const originalName = basename(normalizeUploadedFileName(rawName));

    const record = await this.prisma.productRegistrationCertificate.create({
      data: {
        productId,
        fileName: '',
        originalName,
        mimeType: ALLOWED_MIME,
        fileSize: file.size,
        storagePath: '',
        uploadedBy: uploadedBy ?? null,
      },
    });

    const storedName = `${record.id}.pdf`;
    const storagePath = join(dir, storedName);
    writeFileSync(storagePath, file.buffer);

    const updated = await this.prisma.productRegistrationCertificate.update({
      where: { id: record.id },
      data: {
        fileName: storedName,
        storagePath,
      },
    });

    return this.toDto(updated);
  }

  async getFile(
    productId: string,
    certId: string,
  ): Promise<{ stream: StreamableFile; fileName: string }> {
    const row = await this.prisma.productRegistrationCertificate.findFirst({
      where: { id: certId, productId },
    });
    if (!row) throw new NotFoundException('РУ не найдено');
    if (!existsSync(row.storagePath)) {
      throw new NotFoundException('Файл РУ отсутствует на диске');
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

  async remove(productId: string, certId: string): Promise<{ ok: true }> {
    const row = await this.prisma.productRegistrationCertificate.findFirst({
      where: { id: certId, productId },
    });
    if (!row) throw new NotFoundException('РУ не найдено');

    if (existsSync(row.storagePath)) {
      try {
        unlinkSync(row.storagePath);
      } catch {
        /* ignore missing file on disk */
      }
    }

    await this.prisma.productRegistrationCertificate.delete({
      where: { id: certId },
    });

    return { ok: true };
  }
}
