import { toast } from 'sonner';
import { ApiError } from '../api/client';
import { fetchProductRuDocuments, fetchProductRuFileBlob } from '../api/product-ru';

/** Открыть последнее прикреплённое РУ товара в новой вкладке (для печати). */
export async function openProductRuDocument(productId: string): Promise<void> {
  const { items } = await fetchProductRuDocuments(productId);
  if (items.length === 0) {
    toast.error('РУ не прикреплено к этому товару');
    return;
  }

  const doc = items[0];
  const blob = await fetchProductRuFileBlob(productId, doc.id);
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);

  if (items.length > 1) {
    toast.info(`Открыто: ${doc.originalName} (всего РУ: ${items.length})`, { duration: 4000 });
  }
}

export async function openProductRuDocumentSafe(productId: string): Promise<void> {
  try {
    await openProductRuDocument(productId);
  } catch (err) {
    toast.error(err instanceof ApiError ? err.message : 'Не удалось открыть РУ');
  }
}
