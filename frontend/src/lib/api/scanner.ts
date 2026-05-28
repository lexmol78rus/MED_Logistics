import type { ScannerProcessResult } from '../../types/api';
import { fixScannerKeyboardLayout } from '../scanner/fixKeyboardLayout';
import { apiFetch } from './client';

export function processScanner(barcode: string) {
  return apiFetch<ScannerProcessResult>('/scanner/process', {
    method: 'POST',
    body: JSON.stringify({ barcode: fixScannerKeyboardLayout(barcode) }),
  });
}
