import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getKey(): Buffer {
  const key = process.env.EMAIL_ENCRYPTION_KEY;
  if (!key) throw new Error('EMAIL_ENCRYPTION_KEY is not set');
  const buf = Buffer.from(key, 'hex');
  if (buf.length !== 32) throw new Error('EMAIL_ENCRYPTION_KEY must be 64 hex chars (32 bytes)');
  return buf;
}

// Stored format: <iv_hex>:<tag_hex>:<ciphertext_hex>
export function encryptEmail(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptEmail(stored: string): string {
  const parts = stored.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted email format');
  const [ivHex, tagHex, dataHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const data = Buffer.from(dataHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(tag);
  return decipher.update(data).toString('utf8') + decipher.final('utf8');
}
