// Bottom sheet modal för att redigera ingredienser i ett recept
import { useState, useEffect } from 'react';

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.45)',
    zIndex: 100,
    display: 'flex',
    alignItems: 'flex-end',
  },
  sheet: {
    background: '#fff',
    borderRadius: '20px 20px 0 0',
    width: '100%',
    maxWidth: '600px',
    margin: '0 auto',
    padding: '20px 16px 32px',
    maxHeight: '85vh',
    overflowY: 'auto',
  },
  handle: {
    width: '40px',
    height: '4px',
    background: '#c8e6c9',
    borderRadius: '2px',
    margin: '0 auto 16px',
  },
  title: {
    fontFamily: 'Georgia, serif',
    color: '#2d5016',
    fontSize: '20px',
    margin: '0 0 16px',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 80px 110px 32px',
    gap: '6px',
    marginBottom: '8px',
    alignItems: 'center',
  },
  input: {
    padding: '7px 8px',
    border: '1.5px solid #c8e6c9',
    borderRadius: '7px',
    fontSize: '14px',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
  },
  select: {
    padding: '7px 4px',
    border: '1.5px solid #c8e6c9',
    borderRadius: '7px',
    fontSize: '13px',
    fontFamily: 'inherit',
    width: '100%',
    background: '#fff',
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: '#c62828',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '0',
    lineHeight: '1',
  },
  addBtn: {
    background: '#f0f7ef',
    border: '1.5px dashed #6b8f5e',
    color: '#2d5016',
    borderRadius: '8px',
    padding: '8px',
    width: '100%',
    fontSize: '14px',
    cursor: 'pointer',
    marginTop: '4px',
    marginBottom: '16px',
  },
  footer: {
    display: 'flex',
    gap: '10px',
    marginTop: '8px',
  },
  saveBtn: {
    flex: 1,
    padding: '12px',
    background: '#2d5016',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    cursor: 'pointer',
    fontFamily: 'Georgia, serif',
  },
  cancelBtn: {
    flex: 1,
    padding: '12px',
    background: '#f0f7ef',
    color: '#2d5016',
    border: '1.5px solid #c8e6c9',
    borderRadius: '10px',
    fontSize: '16px',
    cursor: 'pointer',
  },
  colHeader: {
    fontSize: '11px',
    color: '#888',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
};

export default function RecipeEditor({ recipe, categories, onSave, onClose }) {
  function withIds(ings) {
    return (ings || []).map(i => ({ ...i, _id: i._id || crypto.randomUUID() }));
  }

  const [name, setName] = useState(recipe?.name || '');
  const [ingredients, setIngredients] = useState(
    recipe?.ingredients?.length ? withIds(recipe.ingredients) : [{ name: '', amount: '', category: categories[0]?.id || '', _id: crypto.randomUUID() }]
  );

  useEffect(() => {
    setName(recipe?.name || '');
    setIngredients(
      recipe?.ingredients?.length ? withIds(recipe.ingredients) : [{ name: '', amount: '', category: categories[0]?.id || '', _id: crypto.randomUUID() }]
    );
  }, [recipe]);

  function updateIngredient(idx, field, value) {
    setIngredients(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  function addIngredient() {
    setIngredients(prev => [...prev, { name: '', amount: '', category: categories[0]?.id || '', _id: crypto.randomUUID() }]);
  }

  function removeIngredient(idx) {
    setIngredients(prev => prev.filter((_, i) => i !== idx));
  }

  const [nameErr, setNameErr] = useState('');

  function handleSave() {
    if (!name.trim()) { setNameErr('Receptet måste ha ett namn.'); return; }
    setNameErr('');
    const valid = ingredients.filter(i => i.name.trim());
    onSave({ ...recipe, name: name.trim(), ingredients: valid });
  }

  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.sheet}>
        <div style={styles.handle} />
        <h2 style={styles.title}>Redigera recept</h2>

        <label style={{ fontSize: '13px', color: '#555', display: 'block', marginBottom: '4px' }}>
          Rättens namn
        </label>
        <input
          style={{ ...styles.input, marginBottom: nameErr ? '4px' : '16px', fontSize: '16px', borderColor: nameErr ? '#c62828' : undefined }}
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="t.ex. Tacos"
        />
        {nameErr && <p style={{ color: '#c62828', fontSize: '13px', margin: '0 0 12px' }}>{nameErr}</p>}

        {/* Kolumnrubriker */}
        <div style={{ ...styles.row, marginBottom: '4px' }}>
          <span style={styles.colHeader}>Ingrediens</span>
          <span style={styles.colHeader}>Mängd</span>
          <span style={styles.colHeader}>Kategori</span>
          <span />
        </div>

        {ingredients.map((ing, idx) => (
          <div key={ing._id} style={styles.row}>
            <input
              style={styles.input}
              value={ing.name}
              onChange={e => updateIngredient(idx, 'name', e.target.value)}
              placeholder="Vara"
            />
            <input
              style={styles.input}
              value={ing.amount}
              onChange={e => updateIngredient(idx, 'amount', e.target.value)}
              placeholder="Mängd"
            />
            <select
              style={styles.select}
              value={ing.category}
              onChange={e => updateIngredient(idx, 'category', e.target.value)}
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.emoji} {cat.name}
                </option>
              ))}
            </select>
            <button style={styles.deleteBtn} onClick={() => removeIngredient(idx)}>×</button>
          </div>
        ))}

        <button style={styles.addBtn} onClick={addIngredient}>
          + Lägg till ingrediens
        </button>

        <div style={styles.footer}>
          <button style={styles.cancelBtn} onClick={onClose}>Avbryt</button>
          <button style={styles.saveBtn} onClick={handleSave}>Spara</button>
        </div>
      </div>
    </div>
  );
}
