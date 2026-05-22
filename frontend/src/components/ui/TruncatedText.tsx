import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

const SHOW_DELAY_MS = 500;
const HIDE_DELAY_MS = 800;

type Props = {
  children: ReactNode;
  className?: string;
  as?: 'span' | 'p' | 'div';
};

/** Обрезка + интерактивный tooltip (можно навести и скопировать полный текст). */
export function TruncatedText({ children, className, as: Tag = 'span' }: Props) {
  const anchorRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [fullText, setFullText] = useState('');
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const showTimer = useRef<ReturnType<typeof setTimeout>>();
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();
  const truncatedRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (showTimer.current) clearTimeout(showTimer.current);
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  const measureTruncation = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return false;
    const text = el.textContent?.trim() ?? '';
    setFullText(text);
    return el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight;
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
    clearTimers();
    truncatedRef.current = measureTruncation();
    if (!truncatedRef.current) return;
    showTimer.current = setTimeout(() => {
      updatePosition();
      setOpen(true);
    }, SHOW_DELAY_MS);
  }, [clearTimers, measureTruncation, updatePosition]);

  const scheduleHide = useCallback(() => {
    clearTimers();
    hideTimer.current = setTimeout(() => setOpen(false), HIDE_DELAY_MS);
  }, [clearTimers]);

  const cancelHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  useEffect(() => {
    const el = anchorRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => measureTruncation());
    observer.observe(el);
    return () => observer.disconnect();
  }, [children, measureTruncation]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const onScroll = () => updatePosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open, updatePosition]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  return (
    <>
      <Tag
        ref={anchorRef as never}
        className={cn('truncate min-w-0 select-text', className)}
        onMouseEnter={scheduleShow}
        onMouseLeave={scheduleHide}
        onFocus={scheduleShow}
        onBlur={scheduleHide}
      >
        {children}
      </Tag>
      {open &&
        fullText &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            className="fixed z-[10060] max-w-[min(520px,90vw)] rounded-md border border-slate-200 bg-white px-3 py-2 text-xs leading-snug text-slate-800 shadow-lg select-text"
            style={{ top: pos.top, left: pos.left }}
            onMouseEnter={cancelHide}
            onMouseLeave={scheduleHide}
          >
            {fullText}
          </div>,
          document.body,
        )}
    </>
  );
}
