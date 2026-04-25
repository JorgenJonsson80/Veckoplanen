export const TABS = [
  { key: 'matsedel', label: '🍽 Matsedel' },
  { key: 'handlingslista', label: '🛒 Handlingslista' },
  { key: 'kategorier', label: '📂 Kategorier' },
] as const

export type TabKey = typeof TABS[number]['key']

interface TabsProps {
  activeTab: TabKey
  onChange: (tab: TabKey) => void
}

export default function Tabs({ activeTab, onChange }: TabsProps) {
  return (
    <nav className="flex bg-white border-b-2 border-bg-subtle sticky top-14 z-9">
      {TABS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`flex-1 py-3 px-1 border-0 bg-transparent text-sm cursor-pointer font-semibold border-b-2 -mb-0.5 transition-colors duration-150 ${activeTab === key ? 'text-primary border-primary' : 'text-secondary border-transparent'}`}
        >{label}</button>
      ))}
    </nav>
  )
}
