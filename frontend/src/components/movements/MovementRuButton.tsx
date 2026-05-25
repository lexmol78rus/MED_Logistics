import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { openProductRuDocumentSafe } from '../../lib/product-ru/openProductRu';

type Props = {
  productId: string | null | undefined;
  className?: string;
};

export function MovementRuButton({ productId, className }: Props) {
  const [loading, setLoading] = useState(false);

  if (!productId) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      title="Открыть регистрационное удостоверение"
      disabled={loading}
      className={
        className ??
        'movement-ru-btn h-6 min-w-[34px] px-1.5 text-[10px] font-bold text-blue-800 border-blue-200 bg-blue-50/80 hover:bg-blue-100'
      }
      onClick={(e) => {
        e.stopPropagation();
        setLoading(true);
        void openProductRuDocumentSafe(productId).finally(() => setLoading(false));
      }}
    >
      {loading ? '…' : 'РУ'}
    </Button>
  );
}
