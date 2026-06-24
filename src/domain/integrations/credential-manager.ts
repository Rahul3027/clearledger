/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, no-restricted-imports */
import crypto from 'crypto';

/**
 * For MVP, we use a simple environment variable key.
 * In production, this should be replaced by AWS KMS or HashiCorp Vault.
 */
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

// Normally this would be injected via environment variables
// Using a static dev key for implementation if missing
const MASTER_KEY_SECRET = process.env.ENCRYPTION_MASTER_KEY || 'default-dev-master-key-must-be-32-bytes-long!';

export class CredentialManager {
  
  private static getKey(): Buffer {
    // Hash the secret to ensure it's exactly 32 bytes for aes-256
    return crypto.createHash('sha256').update(MASTER_KEY_SECRET).digest();
  }

  /**
   * Encrypts a JSON payload into a base64 encoded string containing the IV, Salt, Tag, and Ciphertext.
   */
  static encrypt(payload: Record<string, any>): string {
    const text = JSON.stringify(payload);
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = this.getKey();

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();

    // Format: iv:salt:tag:encryptedData
    return Buffer.from(
      `${iv.toString('hex')}:${salt.toString('hex')}:${tag.toString('hex')}:${encrypted}`
    ).toString('base64');
  }

  /**
   * Decrypts a base64 encoded string back into the original JSON payload.
   */
  static decrypt(encryptedBase64: string): Record<string, any> {
    const raw = Buffer.from(encryptedBase64, 'base64').toString('utf8');
    const parts = raw.split(':');
    
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted credential format');
    }

    const [ivHex, saltHex, tagHex, encryptedText] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const key = this.getKey();

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }

  /**
   * Re-encrypts credentials (e.g. if key is rotated, or token refreshed)
   */
  static rotate(oldEncryptedBase64: string, newPayloadUpdates: Record<string, any>): string {
    const current = this.decrypt(oldEncryptedBase64);
    const updated = { ...current, ...newPayloadUpdates };
    return this.encrypt(updated);
  }
}

