const encoder = new TextEncoder()
const decoder = new TextDecoder()

async function deriveKey(signature: string): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(signature),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: encoder.encode('neurorights-vault'), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptData(data: string, walletSignature: string): Promise<{ encrypted: ArrayBuffer; iv: Uint8Array }> {
  const key = await deriveKey(walletSignature)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(data)
  )
  return { encrypted, iv }
}

export async function decryptData(encrypted: ArrayBuffer, iv: Uint8Array, walletSignature: string): Promise<string> {
  const key = await deriveKey(walletSignature)
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as unknown as Uint8Array<ArrayBuffer> },
    key,
    encrypted
  )
  return decoder.decode(decrypted)
}

export function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export function hexToArrayBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)))
  return bytes.buffer
}
