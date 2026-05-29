import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  fetchProductRuDocuments,
  uploadProductRuDocument,
  type ProductRuDocument,
} from '../../lib/api/product-ru';
import { canAttachProductRu, type UserRole } from '../../lib/rbac/permissions';

type Props = {
  productId: string | null;
  /** Для черновика товара: создать карточку в БД перед загрузкой РУ. */
  ensureProductId?: () => Promise<string>;
  userRole: UserRole | null;
};

export default function ReceivingProductRu({
  productId,
  ensureProductId,
  userRole,
}: Props) {
  const canAttach = canAttachProductRu(userRole);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [resolvedProductId, setResolvedProductId] = useState<string | null>(productId);
  const [items, setItems] = useState<ProductRuDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setResolvedProductId(productId);
  }, [productId]);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await fetchProductRuDocuments(id);
      setItems(res.items);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!resolvedProductId) {
      setItems([]);
      setLoading(false);
      return;
    }
    void load(resolvedProductId);
  }, [resolvedProductId, load]);

  const resolveProductId = async (): Promise<string | null> => {
    if (resolvedProductId) return resolvedProductId;
    if (!ensureProductId) return null;
    const id = await ensureProductId();
    setResolvedProductId(id);
    return id;
  };

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
      const id = await resolveProductId();
      if (!id) {
        toast.error('Сначала сохраните карточку товара');
        return;
      }
      await uploadProductRuDocument(id, file);
      toast.success('РУ прикреплено');
      await load(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось загрузить файл');
    } finally {
      setUploading(false);
    }
  };

  const isPendingProduct = !resolvedProductId && Boolean(ensureProductId);

  return (
    <div className="flex flex-col gap-1.5 h-full justify-start">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
        РУ (рег. удостоверение)
      </label>
      <div className="flex flex-wrap items-center gap-2 min-h-10">
        {resolvedProductId && loading ? (
          <span className="text-[11px] text-slate-400">Загрузка…</span>
        ) : resolvedProductId && items.length > 0 ? (
          <span
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-2 py-1 max-w-full"
            title={items.map((d) => d.originalName).join(', ')}
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              {items.length === 1
                ? items[0].originalName
                : `${items.length} файлов прикреплено`}
            </span>
          </span>
        ) : (
          <span className="text-[11px] text-slate-400">
            {isPendingProduct ? 'Новый товар — прикрепите PDF' : 'Не прикреплено'}
          </span>
        )}
        {canAttach && (
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
              variant="outline"
              size="sm"
              className="h-8 text-[10px] font-bold border-slate-300 shrink-0"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <Plus className="w-3 h-3 mr-1" />
              {uploading ? 'Загрузка…' : 'Прикрепить РУ'}
            </Button>
          </>
        )}
      </div>
      <p className="text-[10px] text-slate-400 leading-tight">
        PDF до 10 МБ · привязано к товару, не к партии
        {isPendingProduct ? ' · карточка сохранится при прикреплении' : ''}
      </p>
    </div>
  );
}
