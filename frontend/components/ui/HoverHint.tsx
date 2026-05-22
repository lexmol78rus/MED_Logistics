import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

const SHOW_DELAY_MS = 500;
const HIDE_DELAY_MS = 300;

type Props = {
  tip: string;
  children: ReactNode;
  className?: string;
};

/** Light hover hint (same look as AG Grid tooltip) without native browser title. */
export function HoverHint({ tip, children, className }: Props) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const showTimer = useRef<ReturnType<typeof setTimeout>>();
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();

  const clearTimers = useCallback(() => {
    if (showTimer.current) clearTimeout(showTimer.current);
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  const updatePosition = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({
      top: rect.bottom + 4,
      left: Math.min(rect.left, window.innerWidth - 520),
    });
  }, []);

  const scheduleShow = useCallback(() => {
    if (!tip.trim()) return;
    clearTimers();
    showTimer.current = setTimeout(() => {
      updatePosition();
      setOpen(true);
    }, SHOW_DELAY_MS);
  }, [clearTimers, tip, updatePosition]);

  const scheduleHide = useCallback(() => {
    clearTimers();
    hideTimer.current = setTimeout(() => setOpen(false), HIDE_DELAY_MS);
  }, [clearTimers]);

  const cancelHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const text = tip.trim();
  if (!text) {
    return <span className={className}>{children}</span>;
  }

  return (
    <>
      <span
        ref={anchorRef}
        className={cn(className)}
        onMouseEnter={scheduleShow}
        onMouseLeave={scheduleHide}
        onFocus={scheduleShow}
        onBlur={scheduleHide}
      >
        {children}
      </span>
      {open &&
        createPortal(
          <div
            role="tooltip"
            className="ag-tooltip fixed z-[10060] max-w-[min(520px,90vw)] rounded-md border border-slate-200 bg-white px-3 py-2 text-xs leading-snug text-slate-800 shadow-lg"
            style={{ top: pos.top, left: pos.left }}
            onMouseEnter={cancelHide}
            onMouseLeave={scheduleHide}
          >
            {text}
          </div>,
          document.body,
        )}
    </>
  );
}
