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
    expect(screen.getByText('Försök igen')).toBeTruthy()
  })

  it('retry button clears the error', async () => {
    let shouldThrow = true
    function RecoverableBomb() {
      return <Bomb shouldThrow={shouldThrow} />
    }

    render(<ErrorBoundary><RecoverableBomb /></ErrorBoundary>)
    shouldThrow = false
    await userEvent.click(screen.getByText('Försök igen'))
    expect(screen.getByText('Allt ok')).toBeTruthy()
  })
})
