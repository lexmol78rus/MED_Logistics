import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

@Injectable()
export class SettingsCryptoService {
  private readonly logger = new Logger(SettingsCryptoService.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return this.resolveKeyBuffer() !== null;
  }

  encrypt(plaintext: string): string {
    const key = this.resolveKeyBuffer();
    if (!key) {
      throw new Error('SETTINGS_ENCRYPTION_KEY is not configured');
    }
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return [
      'v1',
      iv.toString('base64'),
      tag.toString('base64'),
      encrypted.toString('base64'),
    ].join(':');
  }

  decrypt(ciphertext: string): string {
    const key = this.resolveKeyBuffer();
    if (!key) {
      throw new Error('SETTINGS_ENCRYPTION_KEY is not configured');
    }
    const parts = ciphertext.split(':');
    if (parts.length !== 4 || parts[0] !== 'v1') {
      throw new Error('Invalid encrypted secret format');
    }
    const [, ivB64, tagB64, dataB64] = parts;
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const data = Buffer.from(dataB64, 'base64');
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      'utf8',
    );
  }

  private resolveKeyBuffer(): Buffer | null {
    const raw = this.config.get<string>('settingsEncryptionKey')?.trim();
    if (!raw) {
      return null;
    }
    if (/^[0-9a-f]{64}$/i.test(raw)) {
      return Buffer.from(raw, 'hex');
    }
    const buf = Buffer.from(raw, 'base64');
    if (buf.length >= 32) {
      return buf.subarray(0, 32);
    }
    this.logger.warn(
      'SETTINGS_ENCRYPTION_KEY must be 32 bytes (64 hex chars or 44+ base64 chars)',
    );
    return null;
  }
}
