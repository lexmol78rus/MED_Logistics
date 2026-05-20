/**
 * Full SMTP diagnostic: DB settings, decrypt, nodemailer verify.
 * Usage: node backend/scripts/smtp-diagnose.mjs
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createDecipheriv } from 'crypto';
import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';

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
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnv(envPath);

function resolveKeyBuffer(raw) {
  if (!raw?.trim()) return null;
  const t = raw.trim();
  if (/^[0-9a-f]{64}$/i.test(t)) return Buffer.from(t, 'hex');
  const buf = Buffer.from(t, 'base64');
  if (buf.length >= 32) return buf.subarray(0, 32);
  return null;
}

function decrypt(ciphertext, key) {
  const parts = ciphertext.split(':');
  if (parts.length !== 4 || parts[0] !== 'v1') {
    throw new Error('Invalid encrypted secret format');
  }
  const [, ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

const encKey = process.env.SETTINGS_ENCRYPTION_KEY ?? '';
const keyBuf = resolveKeyBuffer(encKey);
console.log('=== SETTINGS_ENCRYPTION_KEY ===');
console.log('configured:', Boolean(keyBuf));
console.log('key length (hex):', encKey.length);

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@127.0.0.1:5432/${process.env.POSTGRES_DB}`,
    },
  },
});

const row = await prisma.systemSetting.findUnique({ where: { id: 'default' } });
const mail = row?.payload?.mail;
const smtp = mail?.smtp;

console.log('\n=== DB mail.smtp (no password) ===');
if (!smtp) {
  console.log('no mail.smtp in DB');
} else {
  console.log(JSON.stringify({
    host: smtp.host,
    port: smtp.port,
    user: smtp.user,
    from: smtp.from,
    secure: smtp.secure,
    hasPasswordEnc: Boolean(smtp.passwordEnc),
    passwordEncPrefix: smtp.passwordEnc?.slice(0, 20),
  }, null, 2));
}

console.log('\n=== ENV SMTP (deploy/.env) ===');
console.log(JSON.stringify({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  user: process.env.SMTP_USER || '(empty)',
  hasPassword: Boolean(process.env.SMTP_PASSWORD),
}, null, 2));

let resolved = null;
let source = 'none';

if (smtp?.host && smtp?.user && smtp?.passwordEnc) {
  console.log('\n=== DECRYPT passwordEnc ===');
  if (!keyBuf) {
    console.log('decrypt: FAIL — SETTINGS_ENCRYPTION_KEY invalid or missing');
  } else {
    try {
      const password = decrypt(smtp.passwordEnc, keyBuf);
      console.log('decrypt: SUCCESS');
      console.log('password length:', password.length);
      resolved = {
        host: smtp.host,
        port: smtp.port ?? 465,
        user: smtp.user,
        password,
        from: smtp.from || smtp.user,
        secure: smtp.secure ?? smtp.port === 465,
      };
      source = 'database';
    } catch (e) {
      console.log('decrypt: FAIL —', e.message);
      if (e.code) console.log('code:', e.code);
    }
  }
}

if (!resolved) {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD?.trim();
  if (host && user && password) {
    const port = Number.parseInt(process.env.SMTP_PORT ?? '465', 10);
    resolved = { host, port, user, password, from: process.env.SMTP_FROM?.trim() || user, secure: port === 465 };
    source = 'environment';
  }
}

console.log('\n=== RESOLVED config for nodemailer ===');
if (!resolved) {
  console.log('source: none — transport not configured');
  await prisma.$disconnect();
  process.exit(2);
}

console.log(JSON.stringify({
  source,
  host: resolved.host,
  port: resolved.port,
  secure: resolved.secure,
  user: resolved.user,
  from: resolved.from,
  passwordLength: resolved.password.length,
}, null, 2));

const transport = nodemailer.createTransport({
  host: resolved.host,
  port: resolved.port,
  secure: resolved.secure,
  auth: { user: resolved.user, pass: resolved.password },
});

console.log('\n=== nodemailer verify() ===');
try {
  await transport.verify();
  console.log('[SMTP] ready');
} catch (error) {
  console.log('[SMTP] verify failed');
  console.log('message:', error?.message);
  console.log('code:', error?.code);
  console.log('responseCode:', error?.responseCode);
  console.log('response:', error?.response);
  await prisma.$disconnect();
  process.exit(1);
}

await prisma.$disconnect();
console.log('\nDiagnostic OK — verify passed');
