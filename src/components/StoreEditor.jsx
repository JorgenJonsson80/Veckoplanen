// Bottom sheet för att skapa och redigera en butik med egen kategoriordning
import { useState, useRef } from 'react';

const STORE_EMOJIS = ['🏪','🛒','🏬','🏦','🌿','🥩','🥖','🧺','🏡','🚗','🌊','❄️','🌻','🇸🇪'];

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
    width: '40px', height: '4px', background: '#c8e6c9',
    borderRadius: '2px', margin: '0 auto 16px',
  },
  title: {
    fontFamily: 'Georgia, serif', color: '#2d5016',
    fontSize: '20px', margin: '0 0 16px',
  },
  label: {
    display: 'block', fontWeight: '600', color: '#2d5016',
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
    background: '#f0f7ef', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  emojiBtnSel: { borderColor: '#2d5016', background: '#e8f5e9' },
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
    flex: 1, padding: '12px', background: '#2d5016', color: '#fff',
    border: 'none', borderRadius: '10px', fontSize: '16px',
    cursor: 'pointer', fontFamily: 'Georgia, serif',
  },
  cancelBtn: {
    flex: 1, padding: '12px', background: '#f0f7ef', color: '#2d5016',
    border: '1.5px solid #c8e6c9', borderRadius: '10px',
    fontSize: '16px', cursor: 'pointer',
  },
  deleteBtn: {
    padding: '12px 16px', background: '#ffebee', color: '#c62828',
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
  const dragIdxRef = useRef(null);
  const [dragOver, setDragOver] = useState(null);

  function commitReorder(toIdx) {
    const from = dragIdxRef.current;
    if (from === null || from === toIdx) { dragIdxRef.current = null; setDragOver(null); return; }
    const next = [...catOrder];
    const [moved] = next.splice(from, 1);
    next.splice(toIdx, 0, moved);
    dragIdxRef.current = null;
    setDragOver(null);
    setCatOrder(next);
  }

  function onTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('[data-storeidx]');
    if (el) {
      const idx = parseInt(el.dataset.storeidx, 10);
      if (!isNaN(idx)) setDragOver(idx);
    }
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

        {sortedCats.map((cat, idx) => (
          <div
            key={cat.id}
            data-storeidx={idx}
            draggable
            onDragStart={() => { dragIdxRef.current = idx; }}
            onDragOver={e => { e.preventDefault(); setDragOver(idx); }}
            onDrop={() => commitReorder(idx)}
            onDragEnd={() => { dragIdxRef.current = null; setDragOver(null); }}
            onTouchStart={() => { dragIdxRef.current = idx; }}
            onTouchMove={onTouchMove}
            onTouchEnd={() => commitReorder(dragOver ?? dragIdxRef.current)}
            style={{ ...s.catRow, ...(dragOver === idx ? s.catRowOver : {}) }}
          >
            <span style={{ color: '#bbb', fontSize: '18px', userSelect: 'none' }}>⠿</span>
            <span style={{ fontSize: '20px' }}>{cat.emoji}</span>
            <span style={{ flex: 1, fontSize: '15px' }}>{cat.name}</span>
          </div>
        ))}

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
