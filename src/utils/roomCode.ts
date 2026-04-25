// I, O, 1, 0 excluded to avoid visual confusion when sharing codes verbally.
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const ROOM_CODE_LENGTH = 8

export function normalizeRoomCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '')
}

export function isValidRoomCode(value: string): boolean {
  const code = normalizeRoomCode(value)
  if (code.length !== ROOM_CODE_LENGTH) return false
  return [...code].every(char => ROOM_CODE_ALPHABET.includes(char))
}

export function generateRoomCode(): string {
  const bytes = new Uint8Array(ROOM_CODE_LENGTH)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, byte => ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length]).join('')
}
