/**
 * AgentEval — Credential Store
 * 
 * AES-256-GCM encryption for stored credentials.
 * Uses CREDENTIAL_ENCRYPTION_KEY from environment.
 * 
 * SECURITY:
 * - Never logs plaintext credentials
 * - Never returns raw secrets via API
 * - Uses authenticated encryption (GCM) to prevent tampering
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits

function getEncryptionKey(): Buffer {
  const key = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!key) {
    // In development, derive a key from a default — NOT for production
    console.warn('[CredentialStore] CREDENTIAL_ENCRYPTION_KEY not set. Using derived dev key.');
    return crypto.scryptSync('agenteval-dev-key-do-not-use-in-prod', 'salt', KEY_LENGTH);
  }
  // If the key is hex-encoded
  if (/^[0-9a-f]{64}$/i.test(key)) {
    return Buffer.from(key, 'hex');
  }
  // Derive key from passphrase
  return crypto.scryptSync(key, 'agenteval-credential-store', KEY_LENGTH);
}

/**
 * Encrypt a plaintext credential.
 * Returns a base64-encoded string containing IV + ciphertext + auth tag.
 */
export function encryptCredential(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const tag = cipher.getAuthTag();

  // Format: IV (16) + TAG (16) + CIPHERTEXT
  const combined = Buffer.concat([iv, tag, encrypted]);
  return combined.toString('base64');
}

/**
 * Decrypt an encrypted credential.
 * Input is the base64 string from encryptCredential().
 */
export function decryptCredential(encrypted: string): string {
  const key = getEncryptionKey();
  const combined = Buffer.from(encrypted, 'base64');

  if (combined.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error('Invalid encrypted credential: too short');
  }

  const iv = combined.subarray(0, IV_LENGTH);
  const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString('utf8');
}

/**
 * Generate a new webhook signing secret.
 * Returns { plaintext, encrypted } — show plaintext to user ONCE,
 * store encrypted in database.
 */
export function generateWebhookSecret(): { plaintext: string; encrypted: string } {
  const secret = `whsec_${crypto.randomBytes(32).toString('hex')}`;
  return {
    plaintext: secret,
    encrypted: encryptCredential(secret),
  };
}

/**
 * Generate a random credential reference ID.
 */
export function generateCredentialId(): string {
  return `cred_${crypto.randomBytes(8).toString('hex')}`;
}
