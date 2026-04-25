import { createContext, useContext } from 'react'
import type { useAppState } from '../hooks/useAppState'

export type AppContextValue = ReturnType<typeof useAppState>

const AppContext = createContext<AppContextValue | null>(null)

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext must be used within AppContext.Provider')
  return ctx
}

export default AppContext
