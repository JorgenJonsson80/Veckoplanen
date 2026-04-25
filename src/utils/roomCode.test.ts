import { describe, it, expect, vi } from 'vitest'
import { generateRoomCode, isValidRoomCode, normalizeRoomCode, ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from './roomCode'

describe('roomCode utils', () => {
  it('normalizes casing and whitespace', () => {
    expect(normalizeRoomCode(' abcd 2345 ')).toBe('ABCD2345')
    expect(normalizeRoomCode('ABCD 2345')).toBe('ABCD2345')
  })

  it('validates only codes from the shared alphabet', () => {
    expect(isValidRoomCode('ABCD2345')).toBe(true)
    expect(isValidRoomCode('ABCD234')).toBe(false)
    expect(isValidRoomCode('ABCD23456')).toBe(false)
    expect(isValidRoomCode('ABCI2345')).toBe(false)
    expect(isValidRoomCode('ABC12345')).toBe(false)
    expect(isValidRoomCode('ABC02345')).toBe(false)
  })

  it('generates a valid code with expected length', () => {
    vi.spyOn(crypto, 'getRandomValues').mockImplementation(array => {
      const bytes = array as Uint8Array
      bytes.fill(0)
      return array
    })

    const code = generateRoomCode()

    expect(code).toHaveLength(ROOM_CODE_LENGTH)
    expect(code).toBe(ROOM_CODE_ALPHABET[0].repeat(ROOM_CODE_LENGTH))
    expect(isValidRoomCode(code)).toBe(true)
  })
})
