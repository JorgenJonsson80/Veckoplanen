import { useState, useEffect } from 'react'
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
import { GripVertical, X, Home, Check, Users, Minus, Plus, Bell, Smartphone, TriangleAlert, Trash2, Monitor, Sun, Moon } from 'lucide-react'
import NewCategoryForm from './NewCategoryForm'
import { useAppContext } from '../context/AppContext'
import { usePushNotifications } from '../hooks/usePushNotifications'
import { useTheme, type ThemePreference } from '../hooks/useTheme'
import type { Category } from '../types'

const THEME_OPTIONS: { key: ThemePreference; label: string; icon: typeof Monitor }[] = [
  { key: 'system', label: 'Auto', icon: Monitor },
  { key: 'light', label: 'Ljust', icon: Sun },
  { key: 'dark', label: 'Mörkt', icon: Moon },
]

interface Props {
  onDeleteRoom: () => void
  onEnableSimpleMode: () => void
  onHome: () => void
}

function SortableCatItem({ cat, onRemove }: { cat: Category; onRemove: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat.id })
  const isCustom = cat.id.startsWith('custom_')
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
      <span {...listeners} className="text-text-muted leading-none px-1.5 py-1 cursor-grab touch-none"><GripVertical size={18} /></span>
      <span className="text-[22px]">{cat.emoji}</span>
      <span className="flex-1 text-[15px] text-text">{cat.name}</span>
      {isCustom && (
        <button
          aria-label="Ta bort kategori"
          className="bg-error/10 border-0 rounded-md px-2 py-1 cursor-pointer text-error flex items-center"
          onClick={() => onRemove(cat.id)}
        ><X size={14} /></button>
      )}
    </div>
  )
}

function CatDragGhost({ cat }: { cat: Category }) {
  const isCustom = cat.id.startsWith('custom_')
  return (
    <div className="flex items-center bg-surface rounded-xl px-3 py-2.5 gap-2.5 cursor-grabbing select-none border-2 border-primary shadow-[0_12px_32px_rgba(45,80,22,0.25)]">
      <span className="text-text-muted leading-none"><GripVertical size={18} /></span>
      <span className="text-[22px]">{cat.emoji}</span>
      <span className="flex-1 text-[15px] text-text">{cat.name}</span>
      {isCustom && <span className="w-7.75" />}
    </div>
  )
}

export default function KategorierTab({ onDeleteRoom, onEnableSimpleMode, onHome }: Props) {
  const {
    categories,
    session,
    roomName,
    renameRoom,
    convertToFamilyRoom,
    householdSize,
    setHouseholdSize,
    handleCatReorder: onReorder,
    addCategory: onAddCategory,
    removeCategory: onRemoveCategory,
  } = useAppContext()
  const { supported: pushSupported, unsupportedReason, subscribed, loading: pushLoading, error: pushError, subscribe, unsubscribe } = usePushNotifications(session?.roomCode ?? null)
  const { theme, setTheme } = useTheme()
  const [activeCatId, setActiveCatId] = useState<string | null>(null)
  const [showNewCat, setShowNewCat] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [roomNameDraft, setRoomNameDraft] = useState(roomName ?? '')
  const [roomNameSaved, setRoomNameSaved] = useState(false)

  useEffect(() => { setRoomNameDraft(roomName ?? '') }, [roomName])

  function handleSaveRoomName() {
    renameRoom(roomNameDraft)
    setRoomNameSaved(true)
    setTimeout(() => setRoomNameSaved(false), 2000)
  }

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

      {session?.roomCode && (
        <div className="mt-8 pt-5 border-t border-border">
          <p className="text-secondary text-xs mb-2">Rum</p>
          <button
            type="button"
            onClick={onHome}
            className="w-full py-2.5 mb-3 bg-bg border border-border rounded-xl text-primary text-sm font-semibold cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Home size={16} /> Till startsidan
          </button>
          <div className="bg-surface rounded-xl px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] mb-3">
            <span className="flex items-center gap-1.5 text-[15px] text-primary font-medium mb-2"><Home size={16} /> Rummets namn</span>
            <div className="flex items-center gap-2">
              <input
                className="flex-1 px-3 py-2 border-2 border-border rounded-lg text-[15px] box-border font-[inherit]"
                value={roomNameDraft}
                onChange={e => setRoomNameDraft(e.target.value)}
                placeholder="t.ex. Familjen Andersson"
                onKeyDown={e => e.key === 'Enter' && handleSaveRoomName()}
              />
              <button
                type="button"
                onClick={handleSaveRoomName}
                disabled={roomNameDraft.trim() === (roomName ?? '')}
                className="shrink-0 px-3.5 py-2 rounded-lg border-0 text-sm font-semibold cursor-pointer bg-primary text-white disabled:opacity-40 disabled:cursor-default"
              >
                {roomNameSaved ? <Check size={16} /> : 'Spara'}
              </button>
            </div>
            <span className="block text-secondary text-xs mt-2">Rumskod: <span className="font-mono">{session.roomCode}</span></span>
          </div>

          {session.mode === 'solo' && (
            <div className="bg-surface rounded-xl px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex items-center gap-4 mb-3">
              <div className="flex-1">
                <span className="flex items-center gap-1.5 text-[15px] text-primary font-medium"><Users size={16} /> Gör om till familjerum</span>
                <span className="block text-secondary text-sm mt-0.5">Bjud in andra att dela det här rummet med dig.</span>
              </div>
              <button
                type="button"
                onClick={convertToFamilyRoom}
                className="shrink-0 px-3.5 py-1.5 rounded-xl border-0 text-sm font-semibold cursor-pointer bg-primary text-white"
              >
                Gör om
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mt-8 pt-5 border-t border-border">
        <p className="text-secondary text-xs mb-2">Hushåll</p>
        <div className="bg-surface rounded-xl px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex items-center gap-4 mb-3">
          <div className="flex-1">
            <span className="flex items-center gap-1.5 text-[15px] text-primary font-medium"><Users size={16} /> Antal i hushållet</span>
            <span className="block text-secondary text-sm mt-0.5">Mängderna i handlingslistan skalas automatiskt</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="w-8 h-8 bg-bg border border-border rounded-lg text-primary cursor-pointer flex items-center justify-center" onClick={() => setHouseholdSize(Math.max(1, householdSize - 1))}><Minus size={16} /></button>
            <span className="text-base font-bold text-primary w-6 text-center">{householdSize}</span>
            <button type="button" className="w-8 h-8 bg-bg border border-border rounded-lg text-primary cursor-pointer flex items-center justify-center" onClick={() => setHouseholdSize(Math.min(20, householdSize + 1))}><Plus size={16} /></button>
          </div>
        </div>

        <div className="bg-surface rounded-xl px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex items-center gap-4 mb-3">
          <div className="flex-1">
            <span className="flex items-center gap-1.5 text-[15px] text-primary font-medium"><Bell size={16} /> Middagsnotis kl 16:30</span>
            <span className="block text-secondary text-sm mt-0.5">
              {unsupportedReason ?? (subscribed ? 'Du får en notis varje dag med vad som är planerat.' : 'Påminnelse varje dag om vad som är på matsedeln.')}
            </span>
            {pushError && <span className="block text-error text-xs mt-1">{pushError}</span>}
          </div>
          {pushSupported && (
            <button
              onClick={subscribed ? unsubscribe : subscribe}
              disabled={pushLoading}
              className={`shrink-0 px-3.5 py-1.5 rounded-xl border-0 text-sm font-semibold cursor-pointer transition-colors ${subscribed ? 'bg-surface-muted text-text-muted' : 'bg-primary text-white'} ${pushLoading ? 'opacity-50 cursor-default' : ''}`}
            >
              {pushLoading ? '...' : subscribed ? 'Stäng av' : 'Aktivera'}
            </button>
          )}
        </div>

        <p className="text-secondary text-xs mb-2 mt-4">Utseende</p>
        <div className="flex bg-bg border border-border rounded-xl p-1 mb-3 gap-1">
          {THEME_OPTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTheme(key)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold cursor-pointer flex items-center justify-center gap-1.5 transition-colors ${theme === key ? 'bg-primary text-white' : 'bg-transparent text-primary'}`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        <p className="text-secondary text-xs mb-2 mt-4">Läge</p>
        <button
          onClick={onEnableSimpleMode}
          className="w-full py-3 bg-bg border border-border rounded-xl text-[15px] cursor-pointer text-primary text-left px-4"
        >
          <span className="flex items-center gap-1.5"><Smartphone size={16} /> Byt till enkelt läge</span>
          <span className="block text-secondary text-sm mt-0.5">Visa bara "Önska mat" och "Handla det här"</span>
        </button>
      </div>

      {session?.roomCode && (
        <div className="mt-6 pt-5 border-t border-error/25">
          <p className="text-text-muted text-xs mb-2">Farozon</p>
          <button
            onClick={handleDeleteRoom}
            className={`w-full py-3 border border-error/40 rounded-xl text-[15px] cursor-pointer transition-colors duration-200 flex items-center justify-center gap-1.5 ${confirmDelete ? 'bg-error text-white' : 'bg-surface text-error'}`}
          >
            {confirmDelete ? <><TriangleAlert size={16} /> Tryck igen — detta går inte att ångra</> : <><Trash2 size={16} /> Radera rummet {session?.roomCode}</>}
          </button>
        </div>
      )}
    </div>
  )
}
