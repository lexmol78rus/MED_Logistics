import { useCallback, useEffect, useRef } from 'react';
import { loadSettings } from '../settings/storage';
import { playErrorSound, playScanSound, playSuccessSound } from './scanner-audio';

type ScannerHandlers = {
  onScan: (value: string) => void | Promise<void>;
  enabled?: boolean;
};

export function useScannerField({ onScan, enabled = true }: ScannerHandlers) {
  const inputRef = useRef<HTMLInputElement>(null);
  const lastScanRef = useRef<{ value: string; at: number } | null>(null);
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  const restoreFocus = useCallback(() => {
    const settings = loadSettings();
    if (!settings.scannerAutoFocus || !enabled) return;
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [enabled]);

  const enqueueScan = useCallback(
    (raw: string) => {
      const value = raw.trim();
      if (!value) return;

      const now = Date.now();
      const last = lastScanRef.current;
      if (last && last.value === value && now - last.at < 800) {
        return;
      }
      lastScanRef.current = { value, at: now };

      if (loadSettings().scannerSoundEnabled !== false) {
        playScanSound();
      }

      queueRef.current = queueRef.current
        .then(async () => {
          try {
            await onScan(value);
            if (loadSettings().scannerSoundEnabled !== false) {
              playSuccessSound();
            }
          } catch {
            if (loadSettings().scannerSoundEnabled !== false) {
              playErrorSound();
            }
            throw new Error('scan failed');
          } finally {
            restoreFocus();
          }
        })
        .catch(() => undefined);
    },
    [onScan, restoreFocus],
  );

  useEffect(() => {
    if (!enabled) return;
    const settings = loadSettings();
    if (!settings.scannerAutoFocus) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        e.key.length === 1 &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);

  useEffect(() => {
    restoreFocus();
  }, [restoreFocus]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      enqueueScan(e.currentTarget.value);
      e.currentTarget.value = '';
      e.currentTarget.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  return { inputRef, enqueueScan, restoreFocus, handleKeyDown };
}
