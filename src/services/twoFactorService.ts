/**
 * Two-Factor Authentication Service
 * Handles TOTP (Time-based One-Time Password) generation and verification
 */

/**
 * Generate a random secret for TOTP
 */
export function generateTOTPSecret(): string {
  // Generate a 32-character base32 secret
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let secret = ''
  for (let i = 0; i < 32; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return secret
}

/**
 * Generate TOTP code from secret
 * This is a simplified implementation. In production, use a library like 'otpauth' or 'speakeasy'
 */
export function generateTOTPCode(secret: string): string {
  // This is a simplified TOTP implementation
  // In production, use a proper library like 'otpauth' or 'speakeasy'
  const time = Math.floor(Date.now() / 1000 / 30) // 30-second window
  const secretBytes = base32Decode(secret)
  const timeBytes = new ArrayBuffer(8)
  const timeView = new DataView(timeBytes)
  timeView.setUint32(4, time, false) // Big-endian

  // Simple hash (in production, use proper HMAC-SHA1)
  const hash = simpleHMAC(secretBytes, timeBytes)
  const offset = hash[hash.length - 1] & 0x0f
  const code = ((hash[offset] & 0x7f) << 24 |
                (hash[offset + 1] & 0xff) << 16 |
                (hash[offset + 2] & 0xff) << 8 |
                (hash[offset + 3] & 0xff)) % 1000000

  return code.toString().padStart(6, '0')
}

/**
 * Verify TOTP code
 */
export function verifyTOTPCode(secret: string, code: string, window: number = 1): boolean {
  const currentCode = generateTOTPCode(secret)
  
  // Check current code
  if (currentCode === code) {
    return true
  }

  // Check codes in the time window (previous and next periods)
  for (let i = -window; i <= window; i++) {
    if (i === 0) continue
    const time = Math.floor(Date.now() / 1000 / 30) + i
    const testCode = generateTOTPFromTime(secret, time)
    if (testCode === code) {
      return true
    }
  }

  return false
}

/**
 * Generate TOTP code for a specific time
 */
function generateTOTPFromTime(secret: string, time: number): string {
  const secretBytes = base32Decode(secret)
  const timeBytes = new ArrayBuffer(8)
  const timeView = new DataView(timeBytes)
  timeView.setUint32(4, time, false)

  const hash = simpleHMAC(secretBytes, timeBytes)
  const offset = hash[hash.length - 1] & 0x0f
  const code = ((hash[offset] & 0x7f) << 24 |
                (hash[offset + 1] & 0xff) << 16 |
                (hash[offset + 2] & 0xff) << 8 |
                (hash[offset + 3] & 0xff)) % 1000000

  return code.toString().padStart(6, '0')
}

/**
 * Base32 decode (simplified)
 */
function base32Decode(encoded: string): Uint8Array {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = 0
  let value = 0
  let index = 0
  const output: number[] = []

  for (let i = 0; i < encoded.length; i++) {
    value = (value << 5) | chars.indexOf(encoded[i].toUpperCase())
    bits += 5

    if (bits >= 8) {
      output[index++] = (value >>> (bits - 8)) & 255
      bits -= 8
    }
  }

  return new Uint8Array(output)
}

/**
 * HMAC-SHA1 using Web Crypto API
 */
async function hmacSHA1(key: Uint8Array, message: ArrayBuffer): Promise<Uint8Array> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    // Fallback for server-side or older browsers
    throw new Error('Web Crypto API not available')
  }

  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  )

  const signature = await window.crypto.subtle.sign('HMAC', cryptoKey, message)
  return new Uint8Array(signature)
}

/**
 * Generate TOTP code using Web Crypto API
 */
export async function generateTOTPCodeAsync(secret: string): Promise<string> {
  const time = Math.floor(Date.now() / 1000 / 30) // 30-second window
  const secretBytes = base32Decode(secret)
  
  const timeBytes = new ArrayBuffer(8)
  const timeView = new DataView(timeBytes)
  timeView.setUint32(4, time, false) // Big-endian

  const hash = await hmacSHA1(secretBytes, timeBytes)
  const offset = hash[hash.length - 1] & 0x0f
  const code = ((hash[offset] & 0x7f) << 24 |
                (hash[offset + 1] & 0xff) << 16 |
                (hash[offset + 2] & 0xff) << 8 |
                (hash[offset + 3] & 0xff)) % 1000000

  return code.toString().padStart(6, '0')
}

/**
 * Verify TOTP code using Web Crypto API
 */
export async function verifyTOTPCodeAsync(secret: string, code: string, window: number = 1): Promise<boolean> {
  try {
    const currentCode = await generateTOTPCodeAsync(secret)
    
    // Check current code
    if (currentCode === code) {
      return true
    }

    // Check codes in the time window (previous and next periods)
    for (let i = -window; i <= window; i++) {
      if (i === 0) continue
      const time = Math.floor(Date.now() / 1000 / 30) + i
      const testCode = await generateTOTPFromTimeAsync(secret, time)
      if (testCode === code) {
        return true
      }
    }

    return false
  } catch (error) {
    console.error('TOTP verification error:', error)
    return false
  }
}

/**
 * Generate TOTP code for a specific time using Web Crypto API
 */
async function generateTOTPFromTimeAsync(secret: string, time: number): Promise<string> {
  const secretBytes = base32Decode(secret)
  const timeBytes = new ArrayBuffer(8)
  const timeView = new DataView(timeBytes)
  timeView.setUint32(4, time, false)

  const hash = await hmacSHA1(secretBytes, timeBytes)
  const offset = hash[hash.length - 1] & 0x0f
  const code = ((hash[offset] & 0x7f) << 24 |
                (hash[offset + 1] & 0xff) << 16 |
                (hash[offset + 2] & 0xff) << 8 |
                (hash[offset + 3] & 0xff)) % 1000000

  return code.toString().padStart(6, '0')
}

/**
 * Generate QR code URL for authenticator apps
 */
export function generateQRCodeURL(secret: string, email: string, issuer: string = 'SaloneFix'): string {
  const encodedIssuer = encodeURIComponent(issuer)
  const encodedEmail = encodeURIComponent(email)
  return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`
}

/**
 * Get QR code image URL (using a QR code service)
 */
export function getQRCodeImageURL(qrCodeURL: string): string {
  // Using a public QR code API
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeURL)}`
}

/**
 * Check if 2FA is enabled for user
 */
export function is2FAEnabled(userId?: string): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    const key = userId ? `2fa_enabled_${userId}` : '2fa_enabled'
    return localStorage.getItem(key) === 'true'
  } catch {
    return false
  }
}

/**
 * Enable 2FA for user
 */
export function enable2FA(userId?: string, secret?: string): void {
  if (typeof window === 'undefined') return
  
  try {
    const key = userId ? `2fa_enabled_${userId}` : '2fa_enabled'
    localStorage.setItem(key, 'true')
    
    if (secret) {
      const secretKey = userId ? `2fa_secret_${userId}` : '2fa_secret'
      localStorage.setItem(secretKey, secret)
    }
  } catch (error) {
    console.error('Failed to enable 2FA:', error)
  }
}

/**
 * Disable 2FA for user
 */
export function disable2FA(userId?: string): void {
  if (typeof window === 'undefined') return
  
  try {
    const key = userId ? `2fa_enabled_${userId}` : '2fa_enabled'
    localStorage.removeItem(key)
    
    const secretKey = userId ? `2fa_secret_${userId}` : '2fa_secret'
    localStorage.removeItem(secretKey)
  } catch (error) {
    console.error('Failed to disable 2FA:', error)
  }
}

/**
 * Get 2FA secret for user
 */
export function get2FASecret(userId?: string): string | null {
  if (typeof window === 'undefined') return null
  
  try {
    const secretKey = userId ? `2fa_secret_${userId}` : '2fa_secret'
    return localStorage.getItem(secretKey)
  } catch {
    return null
  }
}

