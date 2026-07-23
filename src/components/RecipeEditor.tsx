import { useState, useEffect, useRef } from 'react'
import { Link, Minus, Plus, X, TriangleAlert, Trash2 } from 'lucide-react'
import type { Ingredient, Category, RecipeDraft } from '../types'

interface IngredientWithId extends Ingredient {
  _id: string
}

interface Props {
  recipe: RecipeDraft
  categories: Category[]
  onSave: (recipe: RecipeDraft) => void
  onDelete?: (recipeId: string) => void
  onClose: () => void
}

function withIds(ings: Ingredient[]): IngredientWithId[] {
  return (ings || []).map(i => ({ ...i, _id: (i as IngredientWithId)._id || crypto.randomUUID() }))
}

export default function RecipeEditor({ recipe, categories, onSave, onDelete, onClose }: Props) {
  const [name, setName] = useState(recipe?.name || '')
  const [portions, setPortions] = useState(recipe?.portions ?? 4)
  const [imageUrl, setImageUrl] = useState(recipe?.imageUrl || '')
  const [ingredients, setIngredients] = useState<IngredientWithId[]>(
    recipe?.ingredients?.length ? withIds(recipe.ingredients) : [{ name: '', amount: '', category: categories[0]?.id || '', _id: crypto.randomUUID() }]
  )
  const [nameErr, setNameErr] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [importUrl, setImportUrl] = useState('')
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [importError, setImportError] = useState('')
  const importInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setName(recipe?.name || '')
    setPortions(recipe?.portions ?? 4)
    setImageUrl(recipe?.imageUrl || '')
    setIngredients(
      recipe?.ingredients?.length ? withIds(recipe.ingredients) : [{ name: '', amount: '', category: categories[0]?.id || '', _id: crypto.randomUUID() }]
    )
  }, [recipe])

  async function handleImportUrl() {
    const url = importUrl.trim()
    if (!url) return
    setImportStatus('loading')
    setImportError('')
    try {
      const res = await fetch('/api/import-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok) { setImportStatus('error'); setImportError(data.error ?? 'Okänt fel'); return }
      if (data.name) setName(data.name)
      if (data.imageUrl) setImageUrl(data.imageUrl)
      if (Array.isArray(data.ingredients) && data.ingredients.length > 0) {
        setIngredients(data.ingredients.map((ing: { name: string; amount: string }) => ({
          name: ing.name,
          amount: ing.amount,
          category: categories[0]?.id || '',
          _id: crypto.randomUUID(),
        })))
      }
      setImportStatus('idle')
      setImportUrl('')
    } catch {
      setImportStatus('error')
      setImportError('Nätverksfel — försök igen')
    }
  }

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
    onSave({ ...recipe, name: name.trim(), portions, ingredients: valid, imageUrl: imageUrl.trim() || undefined })
  }

  const inputCls = 'px-2 py-1.5 border border-border rounded-lg text-sm font-[inherit] w-full box-border'

  return (
    <div className="fixed inset-0 bg-black/45 z-100 flex items-end" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-t-[20px] w-full max-w-150 mx-auto px-4 pt-5 pb-8 max-h-[85vh] overflow-y-auto">
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
        <h2 className="font-serif text-primary text-xl mb-4">Redigera recept</h2>

        {/* URL-import */}
        <div className="mb-4 bg-bg rounded-xl p-3 border border-border">
          <p className="text-xs font-semibold text-secondary mb-2 flex items-center gap-1.5"><Link size={14} /> Importera från webbadress</p>
          <div className="flex gap-2">
            <input
              ref={importInputRef}
              className={`flex-1 px-2.5 py-2 border rounded-lg text-sm font-[inherit] box-border ${importStatus === 'error' ? 'border-error' : 'border-border'}`}
              value={importUrl}
              onChange={e => { setImportUrl(e.target.value); setImportStatus('idle') }}
              placeholder="https://ica.se/recept/..."
              onKeyDown={e => e.key === 'Enter' && handleImportUrl()}
              disabled={importStatus === 'loading'}
            />
            <button
              type="button"
              onClick={handleImportUrl}
              disabled={!importUrl.trim() || importStatus === 'loading'}
              className={`shrink-0 px-3 py-2 border-0 rounded-lg text-sm text-white ${importUrl.trim() && importStatus !== 'loading' ? 'bg-primary cursor-pointer' : 'bg-[#ccc] cursor-default'}`}
            >
              {importStatus === 'loading' ? '...' : 'Hämta'}
            </button>
          </div>
          {importStatus === 'error' && <p className="text-xs text-error mt-1">{importError}</p>}
        </div>

        <label className="text-sm text-[#555] block mb-1">Rättens namn</label>
        <input
          className={`${inputCls} text-base mb-4 ${nameErr ? 'border-error mb-1' : ''}`}
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="t.ex. Tacos"
        />
        {nameErr && <p className="text-error text-sm mb-3">{nameErr}</p>}

        <label className="text-sm text-[#555] block mb-1">Portioner (receptet räcker till)</label>
        <div className="flex items-center gap-3 mb-4">
          <button type="button" className="w-8 h-8 bg-bg border border-border rounded-lg text-primary cursor-pointer flex-none flex items-center justify-center" onClick={() => setPortions(p => Math.max(1, p - 1))}><Minus size={16} /></button>
          <span className="text-base font-semibold text-primary w-8 text-center">{portions}</span>
          <button type="button" className="w-8 h-8 bg-bg border border-border rounded-lg text-primary cursor-pointer flex-none flex items-center justify-center" onClick={() => setPortions(p => Math.min(20, p + 1))}><Plus size={16} /></button>
          <span className="text-sm text-secondary">pers — mängderna skalas automatiskt</span>
        </div>

        <label className="text-sm text-[#555] block mb-1">Bild (URL, valfritt)</label>
        <div className="flex gap-2 items-center mb-4">
          <input
            className={`${inputCls} flex-1`}
            value={imageUrl}
            onChange={e => setImageUrl(e.target.value)}
            placeholder="https://..."
          />
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Förhandsvisning"
              className="w-10 h-10 rounded-lg object-cover shrink-0 border border-border"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          )}
        </div>

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
            <button aria-label="Ta bort ingrediens" className="bg-transparent border-0 text-error cursor-pointer p-0 leading-none flex items-center justify-center" onClick={() => removeIngredient(idx)}><X size={16} /></button>
          </div>
        ))}

        <button className="bg-bg border border-dashed border-secondary text-primary rounded-lg p-2 w-full text-sm cursor-pointer mt-1 mb-4" onClick={addIngredient}>+ Lägg till ingrediens</button>

        <div className="flex gap-2.5 mt-2">
          <button className="flex-1 py-3 bg-bg text-primary border border-border rounded-xl text-base cursor-pointer" onClick={onClose}>Avbryt</button>
          <button className="flex-1 py-3 bg-primary text-white border-0 rounded-xl text-base cursor-pointer font-serif" onClick={handleSave}>Spara</button>
        </div>

        {onDelete && recipe.id && (
          <button
            type="button"
            onClick={() => {
              if (!confirmDelete) { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 3000); return }
              onDelete(recipe.id!)
              onClose()
            }}
            className={`w-full mt-2 py-2.5 border-0 rounded-xl text-sm cursor-pointer transition-colors duration-150 flex items-center justify-center gap-1.5 ${confirmDelete ? 'bg-error text-white' : 'bg-transparent text-error'}`}
          >
            {confirmDelete ? <><TriangleAlert size={14} /> Tryck igen för att radera receptet</> : <><Trash2 size={14} /> Radera recept</>}
          </button>
        )}
      </div>
    </div>
  )
}
