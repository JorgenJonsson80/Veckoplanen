import { useState } from 'react'
import type { Category } from '../types'

interface Props {
  onAdd: (cat: Category) => void
}

const EMOJI_OPTIONS = [
  '🥬','🥕','🍎','🍋','🌽','🫑','🧅','🥒','🍅',
  '🥚','🧀','🥩','🐟','🍗','🥦','🧄','🌿',
  '🍞','🥐','🧁','🍰','🎂',
  '🍝','🍜','🍚','🥗','🫙','🥫','🧂','🫒',
  '🧊','🍦','🧃','🥤','🍷','🫖',
  '🍫','🍬','🍭','🥜','🍿',
  '🧴','🧹','🧼','🪥','🛒','📦',
]

export default function NewCategoryForm({ onAdd }: Props) {
  const [selectedEmoji, setSelectedEmoji] = useState('🛒')
  const [catName, setCatName] = useState('')

  function handleAdd() {
    if (!catName.trim()) return
    onAdd({ id: crypto.randomUUID(), name: catName.trim(), emoji: selectedEmoji, shelfLife: 30 })
    setCatName('')
  }

  return (
    <div className="bg-bg rounded-xl p-3.5 mt-3">
      <p className="font-bold text-primary text-[15px] mb-2.5">Ny kategori</p>
      <div className="flex flex-wrap gap-1.5 mb-2.5">
        {EMOJI_OPTIONS.map(emoji => (
          <button
            key={emoji}
            onClick={() => setSelectedEmoji(emoji)}
            title={emoji}
            className={`w-9 h-9 border-2 rounded-lg text-xl cursor-pointer flex items-center justify-center transition-colors ${selectedEmoji === emoji ? 'border-primary bg-bg-subtle' : 'border-transparent bg-surface'}`}
          >{emoji}</button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 px-2.5 py-2 border border-border rounded-lg text-[15px] font-[inherit]"
          value={catName}
          onChange={e => setCatName(e.target.value)}
          placeholder="t.ex. Ekologiskt"
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button className="px-4 py-2 bg-primary text-white border-0 rounded-lg text-[15px] cursor-pointer whitespace-nowrap" onClick={handleAdd}>Lägg till</button>
      </div>
    </div>
  )
}
