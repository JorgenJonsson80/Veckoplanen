import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NewCategoryForm from './NewCategoryForm'

describe('NewCategoryForm', () => {
  it('renders input and add button', () => {
    render(<NewCategoryForm onAdd={vi.fn()} />)
    expect(screen.getByPlaceholderText('t.ex. Ekologiskt')).toBeTruthy()
    expect(screen.getByText('Lägg till')).toBeTruthy()
  })

  it('does not call onAdd when input is empty', async () => {
    const onAdd = vi.fn()
    render(<NewCategoryForm onAdd={onAdd} />)
    await userEvent.click(screen.getByText('Lägg till'))
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('calls onAdd with correct category when form is submitted', async () => {
    const onAdd = vi.fn()
    render(<NewCategoryForm onAdd={onAdd} />)
    await userEvent.type(screen.getByPlaceholderText('t.ex. Ekologiskt'), 'Frukt')
    await userEvent.click(screen.getByText('Lägg till'))
    expect(onAdd).toHaveBeenCalledOnce()
    const arg = onAdd.mock.calls[0][0]
    expect(arg.name).toBe('Frukt')
    expect(arg.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(arg.emoji).toBeTruthy()
    expect(arg.shelfLife).toBe(30)
  })

  it('clears the input after adding', async () => {
    render(<NewCategoryForm onAdd={vi.fn()} />)
    const input = screen.getByPlaceholderText('t.ex. Ekologiskt')
    await userEvent.type(input, 'Frukt')
    await userEvent.click(screen.getByText('Lägg till'))
    expect((input as HTMLInputElement).value).toBe('')
  })

  it('submits on Enter key', async () => {
    const onAdd = vi.fn()
    render(<NewCategoryForm onAdd={onAdd} />)
    await userEvent.type(screen.getByPlaceholderText('t.ex. Ekologiskt'), 'Grönt{Enter}')
    expect(onAdd).toHaveBeenCalledOnce()
    expect(onAdd.mock.calls[0][0].name).toBe('Grönt')
  })

  it('selecting an emoji updates the category emoji', async () => {
    const onAdd = vi.fn()
    render(<NewCategoryForm onAdd={onAdd} />)
    await userEvent.click(screen.getByTitle('🥕'))
    await userEvent.type(screen.getByPlaceholderText('t.ex. Ekologiskt'), 'Rotsaker')
    await userEvent.click(screen.getByText('Lägg till'))
    expect(onAdd.mock.calls[0][0].emoji).toBe('🥕')
  })
})
