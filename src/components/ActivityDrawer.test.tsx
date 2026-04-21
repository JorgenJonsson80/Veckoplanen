import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ActivityDrawer from './ActivityDrawer'
import type { ActivityLogEntry } from '../types'

const entries: ActivityLogEntry[] = [
  { user: 'Anna', action: 'valde "Tacos" till måndag', time: new Date(Date.now() - 300000).toISOString() },
  { user: 'Björn', action: 'sparade matsedeln', time: new Date(Date.now() - 7200000).toISOString() },
]

describe('ActivityDrawer', () => {
  it('renders heading', () => {
    render(<ActivityDrawer log={[]} onClose={vi.fn()} />)
    expect(screen.getByText('📋 Aktivitet')).toBeTruthy()
  })

  it('shows empty state when log is empty', () => {
    render(<ActivityDrawer log={[]} onClose={vi.fn()} />)
    expect(screen.getByText('Ingen aktivitet än.')).toBeTruthy()
  })

  it('renders each log entry', () => {
    render(<ActivityDrawer log={entries} onClose={vi.fn()} />)
    expect(screen.getByText('Anna')).toBeTruthy()
    expect(screen.getByText('valde "Tacos" till måndag')).toBeTruthy()
    expect(screen.getByText('Björn')).toBeTruthy()
    expect(screen.getByText('sparade matsedeln')).toBeTruthy()
  })

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn()
    render(<ActivityDrawer log={[]} onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when clicking the overlay backdrop', () => {
    const onClose = vi.fn()
    const { container } = render(<ActivityDrawer log={[]} onClose={onClose} />)
    const overlay = container.firstChild as HTMLElement
    fireEvent.click(overlay, { target: overlay })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('formats recent entries as "X min sedan"', () => {
    render(<ActivityDrawer log={entries} onClose={vi.fn()} />)
    expect(screen.getByText(/min sedan/)).toBeTruthy()
  })

  it('formats older entries as hours', () => {
    render(<ActivityDrawer log={entries} onClose={vi.fn()} />)
    expect(screen.getByText(/tim sedan/)).toBeTruthy()
  })
})
