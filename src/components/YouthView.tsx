import { useState } from 'react'
import { UtensilsCrossed, ShoppingCart, X } from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import { WEEKDAYS } from '../hooks/useSharedState'

const DAY_LABELS: Record<string, string> = {
  måndag: 'Måndag', tisdag: 'Tisdag', onsdag: 'Onsdag',
  torsdag: 'Torsdag', fredag: 'Fredag', lördag: 'Lördag', söndag: 'Söndag',
}

interface Props {
  onSwitchToFull: () => void
}

export default function YouthView({ onSwitchToFull }: Props) {
  const { meals, setMeal, extraItems, addExtraItem, removeExtraItem } = useAppContext()
  const [newItem, setNewItem] = useState('')

  function handleAdd() {
    const trimmed = newItem.trim()
    if (!trimmed) return
    addExtraItem(trimmed, 'ovrigt')
    setNewItem('')
  }

  return (
    <div className="p-4 pb-20">
      <section className="mb-8">
        <h2 className="font-serif text-primary text-xl mb-3 flex items-center gap-2"><UtensilsCrossed size={20} /> Önska mat</h2>
        <div className="bg-surface rounded-2xl overflow-hidden border border-border">
          {WEEKDAYS.map((day, i) => (
            <div
              key={day}
              className={`flex items-center px-4 py-3 gap-3${i < WEEKDAYS.length - 1 ? ' border-b border-border' : ''}`}
            >
              <span className="text-secondary text-sm w-16 shrink-0">{DAY_LABELS[day]}</span>
              <input
                className="flex-1 text-base border-0 outline-none bg-transparent font-[inherit] text-primary placeholder:text-text-muted"
                value={meals[day] ?? ''}
                onChange={e => setMeal(day, e.target.value)}
                placeholder="Vad vill du äta?"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="font-serif text-primary text-xl mb-3 flex items-center gap-2"><ShoppingCart size={20} /> Handla det här</h2>
        <div className="bg-surface rounded-2xl overflow-hidden border border-border">
          <div className="flex items-center px-4 py-3 border-b border-border">
            <input
              className="flex-1 text-base border-0 outline-none bg-transparent font-[inherit] text-primary placeholder:text-text-muted"
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="Skriv en vara och tryck Enter..."
            />
            <button
              onClick={handleAdd}
              className="ml-3 w-8 h-8 flex items-center justify-center rounded-full bg-primary text-white font-bold border-0 cursor-pointer text-lg leading-none shrink-0"
            >+</button>
          </div>
          {extraItems.length === 0 ? (
            <p className="text-secondary text-sm px-4 py-3">Inga varor tillagda ännu.</p>
          ) : (
            extraItems.map((item, i) => (
              <div
                key={item.id}
                className={`flex items-center px-4 py-3${i < extraItems.length - 1 ? ' border-b border-border' : ''}`}
              >
                <span className="flex-1 text-base">{item.name}</span>
                <button
                  onClick={() => removeExtraItem(item.id)}
                  className="text-secondary border-0 bg-transparent cursor-pointer ml-2 leading-none flex items-center"
                  aria-label="Ta bort"
                ><X size={18} /></button>
              </div>
            ))
          )}
        </div>
      </section>

      <button
        onClick={onSwitchToFull}
        className="bg-transparent border-0 text-secondary text-sm cursor-pointer underline block mx-auto"
      >
        Byt till fullständigt läge
      </button>
    </div>
  )
}
