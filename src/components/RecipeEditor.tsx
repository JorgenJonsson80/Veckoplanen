import { useState, useEffect } from 'react'
import type { Ingredient, Category, RecipeDraft } from '../types'

interface IngredientWithId extends Ingredient {
  _id: string
}

interface Props {
  recipe: RecipeDraft
  categories: Category[]
  onSave: (recipe: RecipeDraft) => void
  onClose: () => void
}

const styles = {
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'flex-end' },
  sheet: { background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '600px', margin: '0 auto', padding: '20px 16px 32px', maxHeight: '85vh', overflowY: 'auto' as const },
  handle: { width: '40px', height: '4px', background: 'var(--clr-border)', borderRadius: '2px', margin: '0 auto 16px' },
  title: { fontFamily: 'Georgia, serif', color: 'var(--clr-primary)', fontSize: '20px', margin: '0 0 16px' },
  row: { display: 'grid', gridTemplateColumns: '1fr 80px 110px 32px', gap: '6px', marginBottom: '8px', alignItems: 'center' },
  input: { padding: '7px 8px', border: '1.5px solid var(--clr-border)', borderRadius: '7px', fontSize: '14px', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' } as React.CSSProperties,
  select: { padding: '7px 4px', border: '1.5px solid var(--clr-border)', borderRadius: '7px', fontSize: '13px', fontFamily: 'inherit', width: '100%', background: '#fff' } as React.CSSProperties,
  deleteBtn: { background: 'none', border: 'none', color: 'var(--clr-error)', fontSize: '18px', cursor: 'pointer', padding: '0', lineHeight: '1' },
  addBtn: { background: 'var(--clr-bg)', border: '1.5px dashed var(--clr-secondary)', color: 'var(--clr-primary)', borderRadius: '8px', padding: '8px', width: '100%', fontSize: '14px', cursor: 'pointer', marginTop: '4px', marginBottom: '16px' } as React.CSSProperties,
  footer: { display: 'flex', gap: '10px', marginTop: '8px' },
  saveBtn: { flex: 1, padding: '12px', background: 'var(--clr-primary)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '16px', cursor: 'pointer', fontFamily: 'Georgia, serif' } as React.CSSProperties,
  cancelBtn: { flex: 1, padding: '12px', background: 'var(--clr-bg)', color: 'var(--clr-primary)', border: '1.5px solid var(--clr-border)', borderRadius: '10px', fontSize: '16px', cursor: 'pointer' } as React.CSSProperties,
  colHeader: { fontSize: '11px', color: '#888', fontWeight: '600', textTransform: 'uppercase' as const },
}

function withIds(ings: Ingredient[]): IngredientWithId[] {
  return (ings || []).map(i => ({ ...i, _id: (i as IngredientWithId)._id || crypto.randomUUID() }))
}

export default function RecipeEditor({ recipe, categories, onSave, onClose }: Props) {
  const [name, setName] = useState(recipe?.name || '')
  const [ingredients, setIngredients] = useState<IngredientWithId[]>(
    recipe?.ingredients?.length ? withIds(recipe.ingredients) : [{ name: '', amount: '', category: categories[0]?.id || '', _id: crypto.randomUUID() }]
  )
  const [nameErr, setNameErr] = useState('')

  useEffect(() => {
    setName(recipe?.name || '')
    setIngredients(
      recipe?.ingredients?.length ? withIds(recipe.ingredients) : [{ name: '', amount: '', category: categories[0]?.id || '', _id: crypto.randomUUID() }]
    )
  }, [recipe])

  function updateIngredient(idx: number, field: keyof Ingredient, value: string) {
    setIngredients(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  function addIngredient() {
    setIngredients(prev => [...prev, { name: '', amount: '', category: categories[0]?.id || '', _id: crypto.randomUUID() }])
  }

  function removeIngredient(idx: number) {
    setIngredients(prev => prev.filter((_, i) => i !== idx))
  }

  function handleSave() {
    if (!name.trim()) { setNameErr('Receptet måste ha ett namn.'); return }
    setNameErr('')
    const valid = ingredients.filter(i => i.name.trim()).map(({ _id: _, ...ing }) => ing)
    onSave({ ...recipe, name: name.trim(), ingredients: valid })
  }

  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.sheet}>
        <div style={styles.handle} />
        <h2 style={styles.title}>Redigera recept</h2>

        <label style={{ fontSize: '13px', color: '#555', display: 'block', marginBottom: '4px' }}>Rättens namn</label>
        <input
          style={{ ...styles.input, marginBottom: nameErr ? '4px' : '16px', fontSize: '16px', borderColor: nameErr ? 'var(--clr-error)' : undefined }}
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="t.ex. Tacos"
        />
        {nameErr && <p style={{ color: 'var(--clr-error)', fontSize: '13px', margin: '0 0 12px' }}>{nameErr}</p>}

        <div style={{ ...styles.row, marginBottom: '4px' }}>
          <span style={styles.colHeader}>Ingrediens</span>
          <span style={styles.colHeader}>Mängd</span>
          <span style={styles.colHeader}>Kategori</span>
          <span />
        </div>

        {ingredients.map((ing, idx) => (
          <div key={ing._id} style={styles.row}>
            <input style={styles.input} value={ing.name} onChange={e => updateIngredient(idx, 'name', e.target.value)} placeholder="Vara" />
            <input style={styles.input} value={ing.amount} onChange={e => updateIngredient(idx, 'amount', e.target.value)} placeholder="Mängd" />
            <select style={styles.select} value={ing.category} onChange={e => updateIngredient(idx, 'category', e.target.value)}>
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.emoji} {cat.name}</option>)}
            </select>
            <button aria-label="Ta bort ingrediens" style={styles.deleteBtn} onClick={() => removeIngredient(idx)}>×</button>
          </div>
        ))}

        <button style={styles.addBtn} onClick={addIngredient}>+ Lägg till ingrediens</button>

        <div style={styles.footer}>
          <button style={styles.cancelBtn} onClick={onClose}>Avbryt</button>
          <button style={styles.saveBtn} onClick={handleSave}>Spara</button>
        </div>
      </div>
    </div>
  )
}
