import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RoomSetup from './RoomSetup'

describe('RoomSetup', () => {
  it('joins with a normalized valid room code', async () => {
    const onStart = vi.fn()
    render(<RoomSetup onStart={onStart} initialJoinCode={null} />)

    await userEvent.click(screen.getByText('Gå med i rum'))
    await userEvent.type(screen.getByPlaceholderText('t.ex. Erik'), 'Anna')
    await userEvent.type(screen.getByPlaceholderText('t.ex. ABCD2345'), 'abcd2345')
    await userEvent.click(screen.getByText('Gå med'))

    expect(onStart).toHaveBeenCalledWith({ name: 'Anna', roomCode: 'ABCD2345', mode: 'join' })
  })

  it('rejects room codes with characters outside the shared alphabet', async () => {
    const onStart = vi.fn()
    render(<RoomSetup onStart={onStart} initialJoinCode={null} />)

    await userEvent.click(screen.getByText('Gå med i rum'))
    await userEvent.type(screen.getByPlaceholderText('t.ex. Erik'), 'Anna')
    await userEvent.type(screen.getByPlaceholderText('t.ex. ABCD2345'), 'ABCI2345')
    await userEvent.click(screen.getByText('Gå med'))

    expect(onStart).not.toHaveBeenCalled()
    expect(screen.getByText('Rumskoden måste vara 8 tecken och bara innehålla giltiga tecken.')).toBeTruthy()
  })
})
