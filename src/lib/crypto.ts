import 'server-only' // Prevent client-side usage
import crypto from 'crypto'

// Primary encryption key (current version)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY! // Must be 32 chars (hex)
// Legacy key for decryption during key rotation (optional)
const ENCRYPTION_KEY_V1 = process.env.ENCRYPTION_KEY_V1 // Previous key
const IV_LENGTH = 16 // For AES-CBC, IV is always 16 bytes
const CURRENT_KEY_VERSION = 'v2' // Increment when rotating keys

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
  // In dev, you might want to warn. In prod, throw error.
  console.warn("WARNING: ENCRYPTION_KEY is missing or invalid length (must be 32 chars)")
}

/**
 * Normalise the key the same way Deno edge functions do:
 * padEnd(32).slice(0, 32) — ensures a consistent 32-byte buffer
 * even if the raw string is already 32 chars (no-op in that case).
 */
function keyBuffer(key: string): Buffer {
  return Buffer.from(key.padEnd(32).slice(0, 32))
}

/**
 * Encrypts text using AES-256-CBC with a versioned format.
 * Format: "v2:IV_HEX(16B):CIPHERTEXT_HEX"
 * This format is readable by all Tenzu edge functions.
 */
export function encrypt(text: string) {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer(ENCRYPTION_KEY), iv)
  let encrypted = cipher.update(text)
  encrypted = Buffer.concat([encrypted, cipher.final()])
  return `${CURRENT_KEY_VERSION}:${iv.toString('hex')}:${encrypted.toString('hex')}`
}

/**
 * Decrypts tokens regardless of which service encrypted them.
 *
 * Supported formats (in detection order):
 *  1. "v1:IV_HEX:CIPHERTEXT_HEX"  — CBC, written by legacy Next.js path
 *  2. "v2:IV_HEX:CIPHERTEXT_HEX"  — CBC, written by current Next.js encrypt()
 *  3. "IV_HEX(12B):AUTH_TAG_HEX(16B):CIPHERTEXT_HEX" — GCM, written by
 *     refresh-meta-tokens / process-account-health edge functions when they
 *     re-encrypt a refreshed token. IV is 12 bytes = 24 hex chars.
 *  4. "IV_HEX(16B):CIPHERTEXT_HEX" — legacy CBC, no version prefix
 */
export function decrypt(text: string): string {
  const parts = text.split(':')

  // ── Format 1 & 2: versioned CBC ("v1:…" or "v2:…") ─────────────────────
  if (parts[0].startsWith('v')) {
    const version = parts[0]
    const iv = Buffer.from(parts[1], 'hex')
    const encryptedText = Buffer.from(parts[2], 'hex')

    const key = version === 'v1' && ENCRYPTION_KEY_V1
      ? ENCRYPTION_KEY_V1
      : ENCRYPTION_KEY

    const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer(key), iv)
    let decrypted = decipher.update(encryptedText)
    decrypted = Buffer.concat([decrypted, decipher.final()])
    return decrypted.toString()
  }

  // ── Format 3: GCM (written by edge functions after a token refresh) ──────
  // IV is 12 bytes (24 hex chars); auth tag is 16 bytes (32 hex chars).
  // Format: "IV_12B:AUTH_TAG_16B:CIPHERTEXT"
  if (parts.length === 3) {
    const ivBytes = Buffer.from(parts[0], 'hex')
    if (ivBytes.length === 12) {
      const authTag = Buffer.from(parts[1], 'hex')
      const ciphertext = Buffer.from(parts[2], 'hex')
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        keyBuffer(ENCRYPTION_KEY),
        ivBytes,
      ) as crypto.DecipherGCM
      decipher.setAuthTag(authTag)
      let decrypted = decipher.update(ciphertext)
      decrypted = Buffer.concat([decrypted, decipher.final()])
      return decrypted.toString()
    }
  }

  // ── Format 4: legacy CBC, no version prefix ("IV_16B:CIPHERTEXT") ────────
  const iv = Buffer.from(parts[0], 'hex')
  const encryptedText = Buffer.from(parts[1], 'hex')

  try {
    const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer(ENCRYPTION_KEY), iv)
    let decrypted = decipher.update(encryptedText)
    decrypted = Buffer.concat([decrypted, decipher.final()])
    return decrypted.toString()
  } catch (err) {
    if (ENCRYPTION_KEY_V1) {
      const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer(ENCRYPTION_KEY_V1), iv)
      let decrypted = decipher.update(encryptedText)
      decrypted = Buffer.concat([decrypted, decipher.final()])
      return decrypted.toString()
    }
    throw err
  }
}