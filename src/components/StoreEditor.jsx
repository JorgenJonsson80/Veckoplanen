// Bottom sheet för att skapa och redigera en butik med egen kategoriordning
import { useState } from 'react';
import {
  DndContext, closestCenter, PointerSensor,
  KeyboardSensor, useSensor, useSensors, DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable,
  verticalListSortingStrategy, arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const STORE_EMOJIS = ['🏪','🛒','🏬','🏦','🌿','🥩','🥖','🧺','🏡','🚗','🌊','❄️','🌻','🇸🇪'];

function SortableStoreRow({ cat }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      style={{
        display: 'flex', alignItems: 'center',
        background: '#fff', borderRadius: '10px',
        padding: '10px 12px', marginBottom: '8px',
        boxShadow: isDragging ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
        gap: '10px', userSelect: 'none',
        border: '2px solid transparent',
        transform: CSS.Transform.toString(transform),
        transition: transition || 'transform 200ms ease',
        opacity: isDragging ? 0.3 : 1,
      }}
    >
      <span
        {...listeners}
        style={{ color: '#bbb', fontSize: '22px', padding: '4px 6px', cursor: 'grab', touchAction: 'none' }}
      >⠿</span>
      <span style={{ fontSize: '20px' }}>{cat.emoji}</span>
      <span style={{ flex: 1, fontSize: '15px' }}>{cat.name}</span>
    </div>
  );
}

function StoreRowGhost({ cat }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      background: '#fff', borderRadius: '10px',
      padding: '10px 12px',
      boxShadow: '0 12px 32px rgba(45,80,22,0.25)',
      gap: '10px', cursor: 'grabbing', userSelect: 'none',
      border: '2px solid #2d5016',
    }}>
      <span style={{ color: '#bbb', fontSize: '18px' }}>⠿</span>
      <span style={{ fontSize: '20px' }}>{cat.emoji}</span>
      <span style={{ flex: 1, fontSize: '15px' }}>{cat.name}</span>
    </div>
  );
}

const s = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.45)',
    zIndex: 100, display: 'flex', alignItems: 'flex-end',
  },
  sheet: {
    background: '#fff', borderRadius: '20px 20px 0 0',
    width: '100%', maxWidth: '600px', margin: '0 auto',
    padding: '20px 16px 32px', maxHeight: '90vh', overflowY: 'auto',
  },
  handle: {
    width: '40px', height: '4px', background: 'var(--clr-border)',
    borderRadius: '2px', margin: '0 auto 16px',
  },
  title: {
    fontFamily: 'Georgia, serif', color: 'var(--clr-primary)',
    fontSize: '20px', margin: '0 0 16px',
  },
  label: {
    display: 'block', fontWeight: '600', color: 'var(--clr-primary)',
    marginBottom: '6px', fontSize: '13px',
  },
  input: {
    width: '100%', padding: '10px 12px',
    border: '1.5px solid #c8e6c9', borderRadius: '8px',
    fontSize: '16px', fontFamily: 'inherit', boxSizing: 'border-box',
    marginBottom: '14px',
  },
  emojiRow: {
    display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px',
  },
  emojiBtn: {
    width: '38px', height: '38px', border: '2px solid transparent',
    borderRadius: '8px', fontSize: '20px', cursor: 'pointer',
    background: 'var(--clr-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  emojiBtnSel: { borderColor: 'var(--clr-primary)', background: 'var(--clr-bg-subtle)' },
  catRow: {
    display: 'flex', alignItems: 'center',
    background: '#fff', borderRadius: '10px',
    padding: '10px 12px', marginBottom: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)', gap: '10px',
    cursor: 'grab', touchAction: 'none',
    border: '2px solid transparent',
  },
  catRowOver: { border: '2px solid #2d5016' },
  footer: { display: 'flex', gap: '10px', marginTop: '16px' },
  saveBtn: {
    flex: 1, padding: '12px', background: 'var(--clr-primary)', color: '#fff',
    border: 'none', borderRadius: '10px', fontSize: '16px',
    cursor: 'pointer', fontFamily: 'Georgia, serif',
  },
  cancelBtn: {
    flex: 1, padding: '12px', background: 'var(--clr-bg)', color: 'var(--clr-primary)',
    border: '1.5px solid #c8e6c9', borderRadius: '10px',
    fontSize: '16px', cursor: 'pointer',
  },
  deleteBtn: {
    padding: '12px 16px', background: '#ffebee', color: 'var(--clr-error)',
    border: 'none', borderRadius: '10px', fontSize: '16px', cursor: 'pointer',
  },
};

export default function StoreEditor({ store, allCategories, onSave, onDelete, onClose }) {
  const isNew = !store?.id;

  // Initiera kategoriordningen – ta butikens ordning eller global ordning
  const [name, setName] = useState(store?.name || '');
  const [emoji, setEmoji] = useState(store?.emoji || '🏪');
  const [catOrder, setCatOrder] = useState(() => {
    if (store?.categoryOrder?.length) {
      // Se till att alla kategorier finns med (nya kan ha tillkommit)
      const existing = store.categoryOrder.filter(id => allCategories.some(c => c.id === id));
      const missing = allCategories.filter(c => !existing.includes(c.id)).map(c => c.id);
      return [...existing, ...missing];
    }
    return allCategories.map(c => c.id);
  });

  // Drag-and-drop för kategoriordningen
  const [activeStoreRowId, setActiveStoreRowId] = useState(null);

  const storeSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleStoreDragEnd({ active, over }) {
    setActiveStoreRowId(null);
    if (!over || active.id === over.id) return;
    const oldIndex = catOrder.indexOf(active.id);
    const newIndex = catOrder.indexOf(over.id);
    setCatOrder(arrayMove(catOrder, oldIndex, newIndex));
  }

  function handleSave() {
    if (!name.trim()) return;
    onSave({
      id: store?.id || ('store_' + Date.now()),
      name: name.trim(),
      emoji,
      categoryOrder: catOrder,
    });
  }

  // Bygg upp den sorterade kategorilistan
  const sortedCats = catOrder
    .map(id => allCategories.find(c => c.id === id))
    .filter(Boolean);

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.sheet}>
        <div style={s.handle} />
        <h2 style={s.title}>{isNew ? 'Lägg till butik' : 'Redigera butik'}</h2>

        <label style={s.label}>Butiksnamn</label>
        <input
          style={s.input}
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="t.ex. ICA Maxi"
          autoFocus
        />

        <label style={s.label}>Ikon</label>
        <div style={s.emojiRow}>
          {STORE_EMOJIS.map(e => (
            <button
              key={e}
              style={{ ...s.emojiBtn, ...(emoji === e ? s.emojiBtnSel : {}) }}
              onClick={() => setEmoji(e)}
            >{e}</button>
          ))}
        </div>

        <label style={s.label}>Kategoriordning i den här butiken</label>
        <p style={{ fontSize: '12px', color: '#888', margin: '0 0 10px' }}>Dra för att sätta butikens ordning</p>

        <DndContext
          sensors={storeSensors}
          collisionDetection={closestCenter}
          onDragStart={({ active }) => setActiveStoreRowId(active.id)}
          onDragEnd={handleStoreDragEnd}
          onDragCancel={() => setActiveStoreRowId(null)}
        >
          <SortableContext items={catOrder} strategy={verticalListSortingStrategy}>
            {sortedCats.map(cat => (
              <SortableStoreRow key={cat.id} cat={cat} />
            ))}
          </SortableContext>
          <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
            {activeStoreRowId && <StoreRowGhost cat={sortedCats.find(c => c.id === activeStoreRowId)} />}
          </DragOverlay>
        </DndContext>

        <div style={s.footer}>
          <button style={s.cancelBtn} onClick={onClose}>Avbryt</button>
          {!isNew && (
            <button style={s.deleteBtn} onClick={() => onDelete(store.id)}>🗑</button>
          )}
          <button style={s.saveBtn} onClick={handleSave}>Spara</button>
        </div>
      </div>
    </div>
  );
}
