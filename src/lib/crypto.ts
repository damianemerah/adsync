import 'server-only' // Prevent client-side usage
import crypto from 'crypto'

// Primary encryption key (current version)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY! // Must be 32 chars (hex)
// Legacy key for decryption during key rotation (optional)
const ENCRYPTION_KEY_V1 = process.env.ENCRYPTION_KEY_V1 // Previous key
const IV_LENGTH = 16 // For AES, this is always 16
const CURRENT_KEY_VERSION = 'v2' // Increment when rotating keys

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
  // In dev, you might want to warn. In prod, throw error.
  console.warn("WARNING: ENCRYPTION_KEY is missing or invalid length (must be 32 chars)")
}

/**
 * Encrypts text using the current encryption key.
 * Prepends key version for future rotation support.
 * Format: "v2:IV_HEX:ENCRYPTED_HEX"
 */
export function encrypt(text: string) {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv)
  let encrypted = cipher.update(text)
  encrypted = Buffer.concat([encrypted, cipher.final()])
  return `${CURRENT_KEY_VERSION}:${iv.toString('hex')}:${encrypted.toString('hex')}`
}

/**
 * Decrypts text encrypted with current or legacy keys.
 * Supports key rotation by checking version prefix.
 */
export function decrypt(text: string): string {
  // Check if text has version prefix
  const parts = text.split(':')

  // New format: "v2:IV:ENCRYPTED"
  if (parts[0].startsWith('v')) {
    const version = parts[0]
    const iv = Buffer.from(parts[1], 'hex')
    const encryptedText = Buffer.from(parts[2], 'hex')

    // Select key based on version
    const key = version === 'v1' && ENCRYPTION_KEY_V1
      ? ENCRYPTION_KEY_V1
      : ENCRYPTION_KEY

    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv)
    let decrypted = decipher.update(encryptedText)
    decrypted = Buffer.concat([decrypted, decipher.final()])
    return decrypted.toString()
  }

  // Legacy format (no version): "IV:ENCRYPTED"
  // Try current key first, fallback to V1 if available
  const iv = Buffer.from(parts[0], 'hex')
  const encryptedText = Buffer.from(parts[1], 'hex')

  try {
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv)
    let decrypted = decipher.update(encryptedText)
    decrypted = Buffer.concat([decrypted, decipher.final()])
    return decrypted.toString()
  } catch (err) {
    // If decryption fails and we have a legacy key, try that
    if (ENCRYPTION_KEY_V1) {
      const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY_V1), iv)
      let decrypted = decipher.update(encryptedText)
      decrypted = Buffer.concat([decrypted, decipher.final()])
      return decrypted.toString()
    }
    throw err
  }
}