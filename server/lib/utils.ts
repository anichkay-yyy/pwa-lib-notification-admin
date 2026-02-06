import { randomBytes, createHash } from 'node:crypto';

export function generateId(): string {
  return crypto.randomUUID();
}

export function generateApiKey(): string {
  const bytes = randomBytes(24);
  return `pna_${bytes.toString('hex')}`;
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}
