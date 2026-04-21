import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ErrorBoundary from './ErrorBoundary'

function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Testfel från Bomb')
  return <p>Allt ok</p>
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders children when there is no error', () => {
    render(<ErrorBoundary><Bomb shouldThrow={false} /></ErrorBoundary>)
    expect(screen.getByText('Allt ok')).toBeTruthy()
  })

  it('renders fallback UI when a child throws', () => {
    render(<ErrorBoundary><Bomb shouldThrow={true} /></ErrorBoundary>)
    expect(screen.getByText('Något gick fel')).toBeTruthy()
    expect(screen.getByText('Ladda om sidan')).toBeTruthy()
  })

  it('reload button calls window.location.reload', async () => {
    const reload = vi.fn()
    Object.defineProperty(window, 'location', { value: { reload }, writable: true })
    render(<ErrorBoundary><Bomb shouldThrow={true} /></ErrorBoundary>)
    await userEvent.click(screen.getByText('Ladda om sidan'))
    expect(reload).toHaveBeenCalledOnce()
  })
})
