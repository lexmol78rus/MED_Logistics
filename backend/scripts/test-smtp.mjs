/**
 * Manual SMTP test — loads deploy/.env and sends one message.
 * Usage (from repo root):
 *   node backend/scripts/test-smtp.mjs [recipient]
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../../deploy/.env');

function loadEnv(filePath) {
  const text = readFileSync(filePath, 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnv(envPath);

const host = process.env.SMTP_HOST ?? '';
const port = Number.parseInt(process.env.SMTP_PORT ?? '465', 10);
const user = process.env.SMTP_USER ?? '';
const password = process.env.SMTP_PASSWORD ?? '';
const from = process.env.SMTP_FROM || user;
const to = process.argv[2] ?? 'am@medicine-2000.ru';

if (!host || !user || !password) {
  console.error(
    '[SMTP] missing SMTP_HOST, SMTP_USER, or SMTP_PASSWORD in deploy/.env',
  );
  process.exit(1);
}

const transport = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  auth: { user, pass: password },
});

try {
  await transport.verify();
  console.log('[SMTP] connection OK');
} catch (error) {
  console.error('[SMTP] connection failed:', error?.message ?? error);
  process.exit(1);
}

try {
  const info = await transport.sendMail({
    from,
    to,
    subject: 'MED-ЛОГИСТИКА SMTP test',
    text: `SMTP test from MED_Logistics at ${new Date().toISOString()}`,
  });
  console.log(`[SMTP] test email sent to ${to} (messageId=${info.messageId})`);
} catch (error) {
  console.error('[SMTP] send failed:', error?.message ?? error);
  process.exit(1);
}
