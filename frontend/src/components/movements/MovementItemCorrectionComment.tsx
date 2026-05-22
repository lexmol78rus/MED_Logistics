import { MessageSquare } from 'lucide-react';

type Props = {
  comment: string;
};

export function MovementItemCorrectionComment({ comment }: Props) {
  return (
    <p
      className="movement-item-correction-comment mt-1.5 flex items-start gap-1 text-[11px] leading-snug"
      style={{ color: '#b45309' }}
    >
      <MessageSquare className="mt-px h-3 w-3 shrink-0 opacity-80" aria-hidden />
      <span className="min-w-0 break-words">
        <span className="font-medium">Комментарий корректировки:</span>{' '}
        <span className="whitespace-pre-wrap">{comment}</span>
      </span>
    </p>
  );
}
