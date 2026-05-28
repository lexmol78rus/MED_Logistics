import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { FileText, Plus, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  deleteProductRuDocument,
  fetchProductRuDocuments,
  fetchProductRuFileBlob,
  uploadProductRuDocument,
  type ProductRuDocument,
} from '../../lib/api/product-ru';
import { ApiError } from '../../lib/api/client';
import { formatAppDateTime } from '../../lib/datetime';
import { canEditProduct, type UserRole } from '../../lib/rbac/permissions';

type Props = {
  productId: string;
  userRole: UserRole | null;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function formatDate(iso: string): string {
  try {
    return formatAppDateTime(iso);
  } catch {
    return iso;
  }
}

export default function ProductRuTab({ productId, userRole }: Props) {
  const canEdit = canEditProduct(userRole);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<ProductRuDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchProductRuDocuments(productId);
      setItems(res.items);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Не удалось загрузить РУ');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const isPdf =
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      toast.error('Допустим только PDF');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Размер файла не должен превышать 10 МБ');
      return;
    }

    setUploading(true);
    try {
      await uploadProductRuDocument(productId, file);
      toast.success('РУ прикреплено');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось загрузить файл');
    } finally {
      setUploading(false);
    }
  };

  const openDocument = async (doc: ProductRuDocument) => {
    try {
      const blob = await fetchProductRuFileBlob(productId, doc.id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось открыть файл');
    }
  };

  const handleDelete = async (doc: ProductRuDocument) => {
    if (!window.confirm(`Удалить «${doc.originalName}»?`)) return;
    try {
      await deleteProductRuDocument(productId, doc.id);
      toast.success('РУ удалено');
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Не удалось удалить');
    }
  };

  return (
    <div className="flex-1 bg-white border border-slate-300 rounded shadow-sm flex flex-col min-h-[300px]">
      <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
        <div className="flex items-center min-w-0">
          <FileText className="w-4 h-4 mr-2 shrink-0 text-blue-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 truncate">
            Регистрационные удостоверения (РУ)
          </h3>
        </div>
        {canEdit && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => void handleFileChange(e)}
            />
            <Button
              type="button"
              size="sm"
              className="h-8 shrink-0 text-xs font-semibold"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              {uploading ? 'Загрузка…' : 'Прикрепить РУ'}
            </Button>
          </>
        )}
      </div>

      <div className="flex-1 p-4 min-h-0 overflow-y-auto">
        {loading ? (
          <p className="text-xs text-slate-500">Загрузка…</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-slate-400">
            {canEdit
              ? 'Нет прикреплённых РУ. Нажмите «Прикрепить РУ» и выберите PDF-скан.'
              : 'Регистрационные удостоверения не прикреплены.'}
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((doc) => (
              <li
                key={doc.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-slate-800">{doc.originalName}</div>
                  <div className="mt-0.5 text-[10px] text-slate-500">
                    {formatFileSize(doc.fileSize)} · {formatDate(doc.createdAt)}
                    {doc.uploadedBy ? ` · ${doc.uploadedBy}` : ''}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] font-semibold"
                    onClick={() => void openDocument(doc)}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Открыть
                  </Button>
                  {canEdit && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px] font-semibold text-red-700 border-red-200 hover:bg-red-50"
                      onClick={() => void handleDelete(doc)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
