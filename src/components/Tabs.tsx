import { UtensilsCrossed, ShoppingCart, LayoutGrid } from 'lucide-react'
import type { ComponentType } from 'react'

export const TABS: { key: 'matsedel' | 'handlingslista' | 'kategorier'; label: string; icon: ComponentType<{ size?: number }> }[] = [
  { key: 'matsedel', label: 'Matsedel', icon: UtensilsCrossed },
  { key: 'handlingslista', label: 'Handlingslista', icon: ShoppingCart },
  { key: 'kategorier', label: 'Kategorier', icon: LayoutGrid },
]

export type TabKey = typeof TABS[number]['key']

interface TabsProps {
  activeTab: TabKey
  onChange: (tab: TabKey) => void
}

export default function Tabs({ activeTab, onChange }: TabsProps) {
  return (
    <nav className="flex bg-white border-b-2 border-bg-subtle sticky top-14 z-9">
      {TABS.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-1 border-0 bg-transparent text-xs cursor-pointer font-semibold border-b-2 -mb-0.5 transition-colors duration-150 ${activeTab === key ? 'text-primary border-primary' : 'text-secondary border-transparent'}`}
        >
          <Icon size={20} />
          {label}
        </button>
      ))}
    </nav>
  )
}
