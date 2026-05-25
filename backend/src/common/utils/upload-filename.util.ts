/**
 * Multer/busboy передаёт имя файла из multipart как байты в кодировке latin1.
 * Кириллица в UTF-8 (например «РУ 12601.pdf») часто превращается в «Ð Ð£ 12601.pdf».
 */
export function normalizeUploadedFileName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;

  // Уже корректная кириллица — не трогаем (иначе latin1-преобразование испортит строку).
  if (/[\u0400-\u04FF]/.test(trimmed)) {
    return trimmed;
  }

  const decoded = Buffer.from(trimmed, 'latin1').toString('utf8');
  if (decoded.includes('\uFFFD')) {
    return trimmed;
  }

  return decoded;
}
