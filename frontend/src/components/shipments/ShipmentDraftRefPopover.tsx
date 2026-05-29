import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const VISIBLE_MS = 10_000;
const FADE_MS = 280;

type Props = {
  anchorEl: HTMLElement | null;
  refCode: string;
  onClose: () => void;
};

/** Всплывающее уведомление у ячейки REF: ~10 с и плавное исчезновение. */
export default function ShipmentDraftRefPopover({ anchorEl, refCode, onClose }: Props) {
  const [pos, setPos] = useState({ top: 0, left: 0, width: 280 });
  const [leaving, setLeaving] = useState(false);

  const updatePos = useCallback(() => {
    if (!anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, 280), 360);
    const left = Math.min(rect.left, window.innerWidth - width - 12);
    setPos({
      top: rect.bottom + 8,
      left: Math.max(12, left),
      width,
    });
  }, [anchorEl]);

  useLayoutEffect(() => {
    updatePos();
  }, [updatePos]);

  useEffect(() => {
    if (!anchorEl) return;
    const hideTimer = window.setTimeout(() => setLeaving(true), VISIBLE_MS);
    const closeTimer = window.setTimeout(onClose, VISIBLE_MS + FADE_MS);
    return () => {
      clearTimeout(hideTimer);
      clearTimeout(closeTimer);
    };
  }, [anchorEl, onClose]);

  useEffect(() => {
    if (!anchorEl) return;
    const onMove = () => updatePos();
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [anchorEl, updatePos]);

  if (!anchorEl) return null;

  const label = refCode.trim() || '—';

  return createPortal(
    <div
      role="alert"
      aria-live="polite"
      className={`fixed z-[10070] rounded-lg border border-rose-300 bg-rose-50 px-3 py-2.5 shadow-lg ring-1 ring-rose-200/60 transition-opacity duration-300 ${
        leaving ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ top: pos.top, left: pos.left, width: pos.width }}
    >
      <div
        className="absolute -top-1.5 left-4 h-3 w-3 rotate-45 border-l border-t border-rose-300 bg-rose-50"
        aria-hidden
      />
      <p className="text-[11px] font-semibold leading-snug text-rose-950">
        REF «{label}» не найден в номенклатуре
      </p>
      <p className="mt-1 text-[10px] leading-snug text-rose-800">
        Отгрузка сохранена как черновик — исправьте REF и нажмите «Сохранить» снова.
      </p>
    </div>,
    document.body,
  );
}
