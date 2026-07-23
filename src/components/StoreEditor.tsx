import { useState } from 'react'
import {
  DndContext, closestCenter, PointerSensor,
  KeyboardSensor, useSensor, useSensors, DragOverlay,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import {
  SortableContext, useSortable,
  verticalListSortingStrategy, arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2 } from 'lucide-react'
import type { Category, Store } from '../types'

type StoreDraft = Omit<Store, 'id'> & { id: string | null }

interface Props {
  store: StoreDraft | null
  allCategories: Category[]
  onSave: (store: Store) => void
  onDelete: (storeId: string) => void
  onClose: () => void
}

const STORE_EMOJIS = ['🏪','🛒','🏬','🏦','🌿','🥩','🥖','🧺','🏡','🚗','🌊','❄️','🌻','🇸🇪']

function SortableStoreRow({ cat }: { cat: Category }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat.id })
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      className="flex items-center bg-surface rounded-xl px-3 py-2.5 mb-2 gap-2.5 select-none border-2 border-transparent"
      style={{
        boxShadow: isDragging ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
        transform: CSS.Transform.toString(transform),
        transition: transition || 'transform 200ms ease',
        opacity: isDragging ? 0.3 : 1,
      }}
    >
      <span {...listeners} className="text-text-muted px-1.5 py-1 cursor-grab touch-none"><GripVertical size={18} /></span>
      <span className="text-xl">{cat.emoji}</span>
      <span className="flex-1 text-[15px]">{cat.name}</span>
    </div>
  )
}

function StoreRowGhost({ cat }: { cat: Category }) {
  return (
    <div className="flex items-center bg-surface rounded-xl px-3 py-2.5 gap-2.5 cursor-grabbing select-none border-2 border-primary shadow-[0_12px_32px_rgba(45,80,22,0.25)]">
      <span className="text-text-muted"><GripVertical size={18} /></span>
      <span className="text-xl">{cat.emoji}</span>
      <span className="flex-1 text-[15px]">{cat.name}</span>
    </div>
  )
}

export default function StoreEditor({ store, allCategories, onSave, onDelete, onClose }: Props) {
  const isNew = !store?.id
  const [name, setName] = useState(store?.name || '')
  const [emoji, setEmoji] = useState(store?.emoji || '🏪')
  const [catOrder, setCatOrder] = useState<string[]>(() => {
    if (store?.categoryOrder?.length) {
      const existing = store.categoryOrder.filter(id => allCategories.some(c => c.id === id))
      const missing = allCategories.filter(c => !existing.includes(c.id)).map(c => c.id)
      return [...existing, ...missing]
    }
    return allCategories.map(c => c.id)
  })
  const [activeStoreRowId, setActiveStoreRowId] = useState<string | null>(null)

  const storeSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleStoreDragEnd({ active, over }: DragEndEvent) {
    setActiveStoreRowId(null)
    if (!over || active.id === over.id) return
    const oldIndex = catOrder.indexOf(active.id as string)
    const newIndex = catOrder.indexOf(over.id as string)
    setCatOrder(arrayMove(catOrder, oldIndex, newIndex))
  }

  function handleSave() {
    if (!name.trim()) return
    onSave({ id: store?.id || crypto.randomUUID(), name: name.trim(), emoji, categoryOrder: catOrder })
  }

  const sortedCats = catOrder.map(id => allCategories.find(c => c.id === id)).filter((c): c is Category => c !== undefined)
  const ghostCat = activeStoreRowId ? sortedCats.find(c => c.id === activeStoreRowId) : undefined

  return (
    <div className="fixed inset-0 bg-black/45 z-100 flex items-end" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-surface rounded-t-[20px] w-full max-w-150 mx-auto px-4 pt-5 pb-8 max-h-[90vh] overflow-y-auto">
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
        <h2 className="font-serif text-primary text-xl mb-4">{isNew ? 'Lägg till butik' : 'Redigera butik'}</h2>

        <label className="block font-semibold text-primary text-sm mb-1.5">Butiksnamn</label>
        <input className="w-full px-3 py-2.5 border border-border rounded-lg text-base font-[inherit] box-border mb-3.5" value={name} onChange={e => setName(e.target.value)} placeholder="t.ex. ICA Maxi" autoFocus />

        <label className="block font-semibold text-primary text-sm mb-1.5">Ikon</label>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {STORE_EMOJIS.map(e => (
            <button
              key={e}
              aria-label={e}
              onClick={() => setEmoji(e)}
              className={`w-9.5 h-9.5 border-2 rounded-lg text-xl cursor-pointer bg-bg flex items-center justify-center ${emoji === e ? 'border-primary bg-bg-subtle' : 'border-transparent'}`}
            >{e}</button>
          ))}
        </div>

        <label className="block font-semibold text-primary text-sm mb-1.5">Kategoriordning i den här butiken</label>
        <p className="text-xs text-text-muted mb-2.5">Dra för att sätta butikens ordning</p>

        <DndContext
          sensors={storeSensors}
          collisionDetection={closestCenter}
          onDragStart={({ active }: DragStartEvent) => setActiveStoreRowId(active.id as string)}
          onDragEnd={handleStoreDragEnd}
          onDragCancel={() => setActiveStoreRowId(null)}
        >
          <SortableContext items={catOrder} strategy={verticalListSortingStrategy}>
            {sortedCats.map(cat => <SortableStoreRow key={cat.id} cat={cat} />)}
          </SortableContext>
          <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
            {ghostCat && <StoreRowGhost cat={ghostCat} />}
          </DragOverlay>
        </DndContext>

        <div className="flex gap-2.5 mt-4">
          <button className="flex-1 py-3 bg-bg text-primary border border-border rounded-xl text-base cursor-pointer" onClick={onClose}>Avbryt</button>
          {!isNew && store?.id && (
            <button aria-label="Radera butik" className="px-4 py-3 bg-error/10 text-error border-0 rounded-xl cursor-pointer flex items-center" onClick={() => onDelete(store.id!)}><Trash2 size={18} /></button>
          )}
          <button className="flex-1 py-3 bg-primary text-white border-0 rounded-xl text-base cursor-pointer font-serif" onClick={handleSave}>Spara</button>
        </div>
      </div>
    </div>
  )
}
