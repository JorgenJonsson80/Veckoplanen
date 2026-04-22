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

  const inputCls = 'px-2 py-1.5 border border-border rounded-lg text-sm font-[inherit] w-full box-border'

  return (
    <div className="fixed inset-0 bg-black/45 z-100 flex items-end" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-t-[20px] w-full max-w-150 mx-auto px-4 pt-5 pb-8 max-h-[85vh] overflow-y-auto">
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
        <h2 className="font-serif text-primary text-xl mb-4">Redigera recept</h2>

        <label className="text-sm text-[#555] block mb-1">Rättens namn</label>
        <input
          className={`${inputCls} text-base mb-4 ${nameErr ? 'border-error mb-1' : ''}`}
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="t.ex. Tacos"
        />
        {nameErr && <p className="text-error text-sm mb-3">{nameErr}</p>}

        <div className="grid grid-cols-[1fr_80px_110px_32px] gap-1.5 mb-1 items-center">
          <span className="text-[11px] text-[#888] font-semibold uppercase">Ingrediens</span>
          <span className="text-[11px] text-[#888] font-semibold uppercase">Mängd</span>
          <span className="text-[11px] text-[#888] font-semibold uppercase">Kategori</span>
          <span />
        </div>

        {ingredients.map((ing, idx) => (
          <div key={ing._id} className="grid grid-cols-[1fr_80px_110px_32px] gap-1.5 mb-2 items-center">
            <input className={inputCls} value={ing.name} onChange={e => updateIngredient(idx, 'name', e.target.value)} placeholder="Vara" />
            <input className={inputCls} value={ing.amount} onChange={e => updateIngredient(idx, 'amount', e.target.value)} placeholder="Mängd" />
            <select className="px-1 py-1.5 border border-border rounded-lg text-sm font-[inherit] w-full bg-white" value={ing.category} onChange={e => updateIngredient(idx, 'category', e.target.value)}>
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.emoji} {cat.name}</option>)}
            </select>
            <button aria-label="Ta bort ingrediens" className="bg-transparent border-0 text-error text-lg cursor-pointer p-0 leading-none" onClick={() => removeIngredient(idx)}>×</button>
          </div>
        ))}

        <button className="bg-bg border border-dashed border-secondary text-primary rounded-lg p-2 w-full text-sm cursor-pointer mt-1 mb-4" onClick={addIngredient}>+ Lägg till ingrediens</button>

        <div className="flex gap-2.5 mt-2">
          <button className="flex-1 py-3 bg-bg text-primary border border-border rounded-xl text-base cursor-pointer" onClick={onClose}>Avbryt</button>
          <button className="flex-1 py-3 bg-primary text-white border-0 rounded-xl text-base cursor-pointer font-serif" onClick={handleSave}>Spara</button>
        </div>
      </div>
    </div>
  )
}
