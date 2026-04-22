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
      style={{ display: 'flex', alignItems: 'center', background: '#fff', borderRadius: '10px', padding: '10px 12px', marginBottom: '8px', boxShadow: isDragging ? 'none' : '0 1px 3px rgba(0,0,0,0.06)', gap: '10px', userSelect: 'none', border: '2px solid transparent', transform: CSS.Transform.toString(transform), transition: transition || 'transform 200ms ease', opacity: isDragging ? 0.3 : 1 }}
    >
      <span {...listeners} style={{ color: '#bbb', fontSize: '22px', padding: '4px 6px', cursor: 'grab', touchAction: 'none' }}>⠿</span>
      <span style={{ fontSize: '20px' }}>{cat.emoji}</span>
      <span style={{ flex: 1, fontSize: '15px' }}>{cat.name}</span>
    </div>
  )
}

function StoreRowGhost({ cat }: { cat: Category }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', background: '#fff', borderRadius: '10px', padding: '10px 12px', boxShadow: '0 12px 32px rgba(45,80,22,0.25)', gap: '10px', cursor: 'grabbing', userSelect: 'none', border: '2px solid var(--clr-primary)' }}>
      <span style={{ color: '#bbb', fontSize: '18px' }}>⠿</span>
      <span style={{ fontSize: '20px' }}>{cat.emoji}</span>
      <span style={{ flex: 1, fontSize: '15px' }}>{cat.name}</span>
    </div>
  )
}

const s = {
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'flex-end' },
  sheet: { background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '600px', margin: '0 auto', padding: '20px 16px 32px', maxHeight: '90vh', overflowY: 'auto' as const },
  handle: { width: '40px', height: '4px', background: 'var(--clr-border)', borderRadius: '2px', margin: '0 auto 16px' },
  title: { fontFamily: 'Georgia, serif', color: 'var(--clr-primary)', fontSize: '20px', margin: '0 0 16px' },
  label: { display: 'block', fontWeight: '600', color: 'var(--clr-primary)', marginBottom: '6px', fontSize: '13px' },
  input: { width: '100%', padding: '10px 12px', border: '1.5px solid var(--clr-border)', borderRadius: '8px', fontSize: '16px', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '14px' } as React.CSSProperties,
  emojiRow: { display: 'flex', flexWrap: 'wrap' as const, gap: '6px', marginBottom: '16px' },
  emojiBtn: { width: '38px', height: '38px', border: '2px solid transparent', borderRadius: '8px', fontSize: '20px', cursor: 'pointer', background: 'var(--clr-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' } as React.CSSProperties,
  emojiBtnSel: { borderColor: 'var(--clr-primary)', background: 'var(--clr-bg-subtle)' },
  footer: { display: 'flex', gap: '10px', marginTop: '16px' },
  saveBtn: { flex: 1, padding: '12px', background: 'var(--clr-primary)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '16px', cursor: 'pointer', fontFamily: 'Georgia, serif' } as React.CSSProperties,
  cancelBtn: { flex: 1, padding: '12px', background: 'var(--clr-bg)', color: 'var(--clr-primary)', border: '1.5px solid var(--clr-border)', borderRadius: '10px', fontSize: '16px', cursor: 'pointer' } as React.CSSProperties,
  deleteBtn: { padding: '12px 16px', background: '#ffebee', color: 'var(--clr-error)', border: 'none', borderRadius: '10px', fontSize: '16px', cursor: 'pointer' },
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
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.sheet}>
        <div style={s.handle} />
        <h2 style={s.title}>{isNew ? 'Lägg till butik' : 'Redigera butik'}</h2>

        <label style={s.label}>Butiksnamn</label>
        <input style={s.input} value={name} onChange={e => setName(e.target.value)} placeholder="t.ex. ICA Maxi" autoFocus />

        <label style={s.label}>Ikon</label>
        <div style={s.emojiRow}>
          {STORE_EMOJIS.map(e => (
            <button key={e} aria-label={e} style={{ ...s.emojiBtn, ...(emoji === e ? s.emojiBtnSel : {}) }} onClick={() => setEmoji(e)}>{e}</button>
          ))}
        </div>

        <label style={s.label}>Kategoriordning i den här butiken</label>
        <p style={{ fontSize: '12px', color: '#888', margin: '0 0 10px' }}>Dra för att sätta butikens ordning</p>

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

        <div style={s.footer}>
          <button style={s.cancelBtn} onClick={onClose}>Avbryt</button>
          {!isNew && store?.id && (
            <button aria-label="Radera butik" style={s.deleteBtn} onClick={() => onDelete(store.id!)}>🗑</button>
          )}
          <button style={s.saveBtn} onClick={handleSave}>Spara</button>
        </div>
      </div>
    </div>
  )
}
