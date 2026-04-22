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
    <div
      ref={setNodeRef}
      {...attributes}
      className="flex items-center bg-white rounded-xl px-3 py-2.5 mb-2 gap-2.5 select-none border-2 border-transparent"
      style={{
        boxShadow: isDragging ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
        transform: CSS.Transform.toString(transform),
        transition: transition || 'transform 200ms ease',
        opacity: isDragging ? 0.3 : 1,
      }}
    >
      <span {...listeners} className="text-[#bbb] text-[22px] leading-none px-1.5 py-1 cursor-grab touch-none">⠿</span>
      <span className="text-[22px]">{cat.emoji}</span>
      <span className="flex-1 text-[15px] text-[#222]">{cat.name}</span>
      {isCustom && (
        <button
          aria-label="Ta bort kategori"
          className="bg-[#ffebee] border-0 rounded-md px-2 py-1 cursor-pointer text-error text-sm"
          onClick={() => onRemove(cat.id)}
        >×</button>
      )}
    </div>
  )
}

function CatDragGhost({ cat }: { cat: Category }) {
  const isCustom = cat.id.startsWith('custom_')
  return (
    <div className="flex items-center bg-white rounded-xl px-3 py-2.5 gap-2.5 cursor-grabbing select-none border-2 border-primary shadow-[0_12px_32px_rgba(45,80,22,0.25)]">
      <span className="text-[#bbb] text-lg leading-none">⠿</span>
      <span className="text-[22px]">{cat.emoji}</span>
      <span className="flex-1 text-[15px] text-[#222]">{cat.name}</span>
      {isCustom && <span className="w-7.75" />}
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
      <h2 className="font-serif text-primary text-[22px] mb-4">Butiksavdelningar</h2>
      <p className="text-secondary text-sm mb-4">Ordningen bestämmer hur varorna sorteras i handlingslistan.</p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={({ active }: DragStartEvent) => setActiveCatId(active.id as string)}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveCatId(null)}
      >
        <SortableContext items={categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {categories.map(cat => <SortableCatItem key={cat.id} cat={cat} onRemove={onRemoveCategory} />)}
        </SortableContext>
        <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
          {ghostCat && <CatDragGhost cat={ghostCat} />}
        </DragOverlay>
      </DndContext>

      <button
        className="w-full py-3 mt-2 bg-bg border border-dashed border-secondary rounded-xl text-primary text-[15px] cursor-pointer"
        onClick={() => setShowNewCat(v => !v)}
      >
        {showNewCat ? 'Avbryt' : '+ Lägg till kategori'}
      </button>
      {showNewCat && <NewCategoryForm onAdd={handleAddCategory} />}

      {session.roomCode && (
        <div className="mt-8 pt-5 border-t border-[#ffcdd2]">
          <p className="text-[#aaa] text-xs mb-2">Farozon</p>
          <button
            onClick={handleDeleteRoom}
            className={`w-full py-3 border border-[#ef9a9a] rounded-xl text-[15px] cursor-pointer transition-colors duration-200 ${confirmDelete ? 'bg-error text-white' : 'bg-white text-error'}`}
          >
            {confirmDelete ? '⚠️ Tryck igen — detta går inte att ångra' : `🗑 Radera rummet ${session.roomCode}`}
          </button>
        </div>
      )}
    </div>
  )
}
