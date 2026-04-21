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
import NewCategoryForm from './NewCategoryForm'
import type { Category, Session } from '../types'

interface Props {
  categories: Category[]
  session: Session
  onReorder: (cats: Category[]) => void
  onAddCategory: (cat: Category) => void
  onRemoveCategory: (catId: string) => void
  onDeleteRoom: () => void
}

function SortableCatItem({ cat, onRemove }: { cat: Category; onRemove: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat.id })
  const isCustom = cat.id.startsWith('custom_')
  return (
    <div ref={setNodeRef} {...attributes} style={{ display: 'flex', alignItems: 'center', background: '#fff', borderRadius: '10px', padding: '10px 12px', marginBottom: '8px', boxShadow: isDragging ? 'none' : '0 1px 3px rgba(0,0,0,0.06)', gap: '10px', userSelect: 'none', border: '2px solid transparent', transform: CSS.Transform.toString(transform), transition: transition || 'transform 200ms ease', opacity: isDragging ? 0.3 : 1 }}>
      <span {...listeners} style={{ color: '#bbb', fontSize: '22px', lineHeight: 1, padding: '4px 6px', cursor: 'grab', touchAction: 'none' }}>⠿</span>
      <span style={{ fontSize: '22px' }}>{cat.emoji}</span>
      <span style={{ flex: 1, fontSize: '15px', color: '#222' }}>{cat.name}</span>
      {isCustom && (
        <button style={{ background: '#ffebee', border: 'none', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', color: 'var(--clr-error)', fontSize: '14px' }} onClick={() => onRemove(cat.id)}>×</button>
      )}
    </div>
  )
}

function CatDragGhost({ cat }: { cat: Category }) {
  const isCustom = cat.id.startsWith('custom_')
  return (
    <div style={{ display: 'flex', alignItems: 'center', background: '#fff', borderRadius: '10px', padding: '10px 12px', boxShadow: '0 12px 32px rgba(45,80,22,0.25)', gap: '10px', cursor: 'grabbing', userSelect: 'none', border: '2px solid #2d5016' }}>
      <span style={{ color: '#bbb', fontSize: '18px', lineHeight: 1 }}>⠿</span>
      <span style={{ fontSize: '22px' }}>{cat.emoji}</span>
      <span style={{ flex: 1, fontSize: '15px', color: '#222' }}>{cat.name}</span>
      {isCustom && <span style={{ width: 31 }} />}
    </div>
  )
}

export default function KategorierTab({ categories, session, onReorder, onAddCategory, onRemoveCategory, onDeleteRoom }: Props) {
  const [activeCatId, setActiveCatId] = useState<string | null>(null)
  const [showNewCat, setShowNewCat] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function handleDeleteRoom() {
    if (!confirmDelete) { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 3000); return }
    setConfirmDelete(false)
    onDeleteRoom()
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveCatId(null)
    if (!over || active.id === over.id) return
    const oldIndex = categories.findIndex(c => c.id === active.id)
    const newIndex = categories.findIndex(c => c.id === over.id)
    onReorder(arrayMove(categories, oldIndex, newIndex))
  }

  function handleAddCategory(cat: Category) {
    onAddCategory(cat)
    setShowNewCat(false)
  }

  const ghostCat = activeCatId ? categories.find(c => c.id === activeCatId) : undefined

  return (
    <div>
      <h2 style={{ fontFamily: 'Georgia, serif', color: 'var(--clr-primary)', margin: '0 0 16px', fontSize: '22px' }}>Butiksavdelningar</h2>
      <p style={{ color: 'var(--clr-secondary)', fontSize: '13px', margin: '0 0 16px' }}>Ordningen bestämmer hur varorna sorteras i handlingslistan.</p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={({ active }: DragStartEvent) => setActiveCatId(active.id as string)} onDragEnd={handleDragEnd} onDragCancel={() => setActiveCatId(null)}>
        <SortableContext items={categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {categories.map(cat => <SortableCatItem key={cat.id} cat={cat} onRemove={onRemoveCategory} />)}
        </SortableContext>
        <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
          {ghostCat && <CatDragGhost cat={ghostCat} />}
        </DragOverlay>
      </DndContext>

      <button style={{ width: '100%', padding: '12px', marginTop: '8px', background: 'var(--clr-bg)', border: '1.5px dashed #6b8f5e', borderRadius: '10px', color: 'var(--clr-primary)', fontSize: '15px', cursor: 'pointer' }} onClick={() => setShowNewCat(v => !v)}>
        {showNewCat ? 'Avbryt' : '+ Lägg till kategori'}
      </button>
      {showNewCat && <NewCategoryForm onAdd={handleAddCategory} />}

      {session.roomCode && (
        <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid #ffcdd2' }}>
          <p style={{ color: '#aaa', fontSize: '12px', margin: '0 0 8px' }}>Farozon</p>
          <button onClick={handleDeleteRoom} style={{ width: '100%', padding: '12px', background: confirmDelete ? 'var(--clr-error)' : '#fff', border: '1.5px solid #ef9a9a', borderRadius: '10px', color: confirmDelete ? '#fff' : 'var(--clr-error)', fontSize: '15px', cursor: 'pointer', transition: 'background 0.2s' }}>
            {confirmDelete ? '⚠️ Tryck igen — detta går inte att ångra' : `🗑 Radera rummet ${session.roomCode}`}
          </button>
        </div>
      )}
    </div>
  )
}
