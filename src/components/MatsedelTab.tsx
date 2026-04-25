import { useEffect, useMemo, useState } from 'react'
import { WEEKDAYS } from '../hooks/useSharedState'
import { getWeekLabel } from '../utils/date'
import type { Recipe, SavedWeekPlan, FavoriteWeekPlan, RecipeDraft } from '../types'

const QUICK_START_MEALS = ['Tacos', 'Spagetti Bolognese', 'Kycklinggryta', 'Pannkakor', 'Laxpasta']

interface Props {
  meals: Record<string, string>
  allRecipes: Recipe[]
  favoriteRecipeIds: string[]
  favoriteWeeks: FavoriteWeekPlan[]
  savedMeals: Record<string, SavedWeekPlan>
  currentWeek: string
  onSetMeal: (day: string, value: string) => void
  onSaveMealPlan: () => void
  onLoadMealPlan: (weekKey: string) => void
  onSaveFavoriteWeek: (name: string) => void
  onLoadFavoriteWeek: (favoriteWeekId: string) => void
  onDeleteFavoriteWeek: (favoriteWeekId: string) => void
  onGenerateWeek: (selectedMeals: string[]) => void
  onToggleFavoriteRecipe: (recipeId: string) => void
  onEditRecipe: (recipe: RecipeDraft) => void
  onClearMeals: () => void
}

export default function MatsedelTab({
  meals, allRecipes, favoriteRecipeIds, favoriteWeeks, savedMeals, currentWeek,
  onSetMeal, onSaveMealPlan, onLoadMealPlan, onSaveFavoriteWeek, onLoadFavoriteWeek, onDeleteFavoriteWeek, onGenerateWeek, onToggleFavoriteRecipe, onEditRecipe, onClearMeals,
}: Props) {
  const [autocomplete, setAutocomplete] = useState<{ day: string | null; results: string[] }>({ day: null, results: [] })
  const [copyingDay, setCopyingDay] = useState<string | null>(null)
  const [openMealKey, setOpenMealKey] = useState<string | null>(null)
  const [showRecipes, setShowRecipes] = useState(false)
  const [openRecipeId, setOpenRecipeId] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [showFavoriteWeekForm, setShowFavoriteWeekForm] = useState(false)
  const [favoriteWeekName, setFavoriteWeekName] = useState('')
  const hasMeal = WEEKDAYS.some(d => meals[d])
  const favoriteRecipes = useMemo(
    () => favoriteRecipeIds
      .map(id => allRecipes.find(recipe => recipe.id === id))
      .filter((recipe): recipe is Recipe => recipe !== undefined),
    [allRecipes, favoriteRecipeIds]
  )
  const quickStartMeals = useMemo(() => {
    const names = [
      ...favoriteRecipes.map(recipe => recipe.name),
      ...QUICK_START_MEALS,
    ]
    return Array.from(new Set(names)).slice(0, 5)
  }, [favoriteRecipes])
  const [quickMeals, setQuickMeals] = useState<string[]>(() => quickStartMeals.slice(0, 3))
  const canGenerateWeek = quickMeals.length >= 3 && quickMeals.length <= 5

  useEffect(() => {
    setQuickMeals(selected => {
      const valid = selected.filter(name => quickStartMeals.includes(name))
      if (valid.length >= 3) return valid.slice(0, 5)
      return quickStartMeals.slice(0, Math.min(3, quickStartMeals.length))
    })
  }, [quickStartMeals])

  function toggleQuickMeal(mealName: string) {
    setQuickMeals(selected => {
      if (selected.includes(mealName)) return selected.filter(name => name !== mealName)
      if (selected.length >= 5) return selected
      return [...selected, mealName]
    })
  }

  function copyMealToDay(fromDay: string, toDay: string) {
    onSetMeal(toDay, meals[fromDay] || '')
    setCopyingDay(null)
  }

  function handleMealInput(day: string, value: string) {
    onSetMeal(day, value)
    if (value.length > 0) {
      const results = allRecipes.filter(r => r.name.toLowerCase().startsWith(value.toLowerCase())).map(r => r.name).slice(0, 5)
      setAutocomplete({ day, results })
    } else {
      setAutocomplete({ day: null, results: [] })
    }
  }

  function selectAutocomplete(day: string, name: string) {
    onSetMeal(day, name)
    setAutocomplete({ day: null, results: [] })
  }

  function handleLoadMealPlan(weekKey: string) {
    onLoadMealPlan(weekKey)
    setOpenMealKey(null)
  }

  function handleSaveFavoriteWeek() {
    if (!favoriteWeekName.trim()) return
    onSaveFavoriteWeek(favoriteWeekName)
    setFavoriteWeekName('')
    setShowFavoriteWeekForm(false)
  }

  return (
    <div>
      <h2 className="font-serif text-primary text-[22px] mb-4">Veckans matsedel</h2>

      <div className="bg-white rounded-xl px-3.5 py-3.5 mb-4 shadow-[0_1px_4px_rgba(0,0,0,0.07)]">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="font-serif text-primary text-lg m-0">Snabbstart</h3>
            <p className="text-secondary text-sm m-0 mt-1">
              {favoriteRecipes.length >= 3 ? 'Bygg veckan från era favoriter.' : 'Välj 3-5 rätter så fyller vi veckan och listan.'}
            </p>
          </div>
          <span className="text-xs text-secondary whitespace-nowrap mt-1">{quickMeals.length}/5 valda</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
          {quickStartMeals.map(mealName => {
            const selected = quickMeals.includes(mealName)
            const isFavorite = favoriteRecipes.some(recipe => recipe.name === mealName)
            return (
              <button
                key={mealName}
                type="button"
                onClick={() => toggleQuickMeal(mealName)}
                className={`text-left px-3 py-2.5 rounded-lg border cursor-pointer font-[inherit] text-sm ${selected ? 'bg-primary text-white border-primary' : 'bg-bg text-primary border-border'}`}
              >
                <span className="font-bold">{selected ? '✓ ' : ''}{mealName}</span>
                {isFavorite && <span className={`ml-1.5 text-xs ${selected ? 'text-white/75' : 'text-secondary'}`}>★</span>}
              </button>
            )
          })}
        </div>
        <button
          type="button"
          onClick={() => onGenerateWeek(quickMeals)}
          disabled={!canGenerateWeek}
          className={`block w-full py-3 border-0 rounded-xl text-white text-[15px] font-serif ${canGenerateWeek ? 'bg-primary cursor-pointer' : 'bg-[#e0e0e0] cursor-default'}`}
        >
          Generera vecka
        </button>
      </div>

      {favoriteWeeks.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-serif text-primary text-lg m-0">Favoritveckor</h3>
            <span className="text-xs text-secondary">{favoriteWeeks.length} sparade</span>
          </div>
          <div className="flex flex-col gap-2">
            {favoriteWeeks.map(week => {
              const mealCount = WEEKDAYS.filter(day => week.meals?.[day]).length
              return (
                <div key={week.id} className="bg-white rounded-xl px-3.5 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.07)]">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => onLoadFavoriteWeek(week.id)}
                      className="flex-1 bg-transparent border-0 p-0 cursor-pointer text-left"
                    >
                      <span className="block font-bold text-primary text-[15px]">{week.name}</span>
                      <span className="block text-xs text-secondary mt-0.5">{mealCount} rätter</span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Ta bort favoritveckan ${week.name}`}
                      onClick={() => onDeleteFavoriteWeek(week.id)}
                      className="bg-bg border border-border rounded-md text-secondary cursor-pointer px-2 py-1 text-sm"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {WEEKDAYS.map(day => {
        const dayLabel = day.charAt(0).toUpperCase() + day.slice(1)
        const mealValue = meals[day] || ''
        const isOpen = autocomplete.day === day && autocomplete.results.length > 0
        const recipe = allRecipes.find(r => r.name.toLowerCase() === mealValue.toLowerCase())
        const isCopying = copyingDay === day

        return (
          <div key={day} className="bg-white rounded-xl px-3.5 py-3 mb-2.5 shadow-[0_1px_4px_rgba(0,0,0,0.07)]">
            <div className="flex items-center gap-2.5">
              <span className="min-w-20 font-bold text-primary text-sm">{dayLabel}</span>
              <div className="flex-1 relative">
                <input
                  className="w-full px-2.5 py-2 border border-border rounded-lg text-[15px] font-[inherit] box-border"
                  value={mealValue}
                  onChange={e => handleMealInput(day, e.target.value)}
                  onBlur={() => setTimeout(() => setAutocomplete({ day: null, results: [] }), 150)}
                  placeholder="Välj rätt..."
                />
                {isOpen && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-border rounded-b-lg z-20 shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
                    {autocomplete.results.map(name => (
                      <div key={name} className="px-3 py-2.5 cursor-pointer text-[15px] border-b border-bg" onMouseDown={() => selectAutocomplete(day, name)}>{name}</div>
                    ))}
                  </div>
                )}
              </div>
              {mealValue && (
                <>
                  <div className="relative">
                    <button
                      className={`border border-border rounded-md cursor-pointer px-2 py-1 flex flex-col items-center gap-px leading-none ${isCopying ? 'bg-primary text-white' : 'bg-bg text-primary'}`}
                      onClick={() => setCopyingDay(isCopying ? null : day)}
                      title="Kopiera till annan dag"
                    >
                      <span className="text-sm">⧉</span>
                      <span className="text-[9px] font-semibold tracking-[0.3px]">Kopiera</span>
                    </button>
                    {isCopying && (
                      <div className="absolute top-full right-0 mt-1.5 bg-white border border-border rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.12)] z-30 p-2 min-w-35">
                        <div className="text-[11px] text-[#aaa] mb-1.5 pl-1">Kopiera till:</div>
                        {WEEKDAYS.filter(d => d !== day).map(d => (
                          <button
                            key={d}
                            onMouseDown={() => copyMealToDay(day, d)}
                            className={`block w-full text-left px-2.5 py-1.5 border-0 rounded-md cursor-pointer text-sm text-[#333] ${meals[d] ? 'bg-[#fff8e1]' : 'bg-white'}`}
                          >
                            {d.charAt(0).toUpperCase() + d.slice(1)}
                            {meals[d] && <span className="text-[11px] text-[#aaa] ml-1.5">({meals[d].slice(0, 12)}{meals[d].length > 12 ? '…' : ''})</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    className="bg-bg border border-border rounded-md cursor-pointer text-primary px-2 py-1 flex flex-col items-center gap-px leading-none"
                    onClick={() => onEditRecipe(recipe ?? { id: null, name: mealValue, ingredients: [] })}
                    title="Öppna recepteditor"
                  >
                    <span className="text-sm">✏️</span>
                    <span className="text-[9px] font-semibold tracking-[0.3px]">Recept</span>
                  </button>
                </>
              )}
            </div>
            {recipe && (
              <div className="mt-2 pl-22.5">
                <div className="text-xs text-[#888] flex flex-wrap gap-1">
                  {(recipe.ingredients || []).slice(0, 5).map((ing, i) => (
                    <span key={i} className="bg-bg rounded px-1.5 py-px">{ing.name}</span>
                  ))}
                  {(recipe.ingredients || []).length > 5 && <span className="text-[#aaa]">+{recipe.ingredients.length - 5} till</span>}
                </div>
              </div>
            )}
          </div>
        )
      })}

      <button
        className="block w-full py-3 mt-2 bg-bg border border-dashed border-secondary rounded-xl text-primary text-[15px] cursor-pointer"
        onClick={() => onEditRecipe({ id: null, name: '', ingredients: [] })}
      >
        + Skapa nytt recept
      </button>

      <button
        onClick={onSaveMealPlan}
        disabled={!hasMeal}
        className={`block w-full py-3 mt-2 border-0 rounded-xl text-white text-[15px] font-serif ${hasMeal ? 'bg-primary cursor-pointer' : 'bg-[#e0e0e0] cursor-default'}`}
      >
        💾 Spara matsedeln ({getWeekLabel(currentWeek)})
      </button>

      {hasMeal && (
        <div className="mt-2">
          {!showFavoriteWeekForm ? (
            <button
              type="button"
              onClick={() => setShowFavoriteWeekForm(true)}
              className="block w-full py-2.5 bg-white border border-border rounded-xl text-primary text-sm cursor-pointer"
            >
              ★ Spara som favoritvecka
            </button>
          ) : (
            <div className="bg-white border border-border rounded-xl p-3">
              <label className="block text-xs text-secondary mb-1">Namn på favoritveckan</label>
              <div className="flex gap-2">
                <input
                  className="flex-1 px-2.5 py-2 border border-border rounded-lg text-[15px] font-[inherit] box-border"
                  value={favoriteWeekName}
                  onChange={e => setFavoriteWeekName(e.target.value)}
                  placeholder="t.ex. Snabba veckan"
                  onKeyDown={e => e.key === 'Enter' && handleSaveFavoriteWeek()}
                />
                <button
                  type="button"
                  onClick={handleSaveFavoriteWeek}
                  disabled={!favoriteWeekName.trim()}
                  className={`px-3 py-2 border-0 rounded-lg text-sm text-white ${favoriteWeekName.trim() ? 'bg-primary cursor-pointer' : 'bg-[#e0e0e0] cursor-default'}`}
                >
                  Spara
                </button>
              </div>
              <button
                type="button"
                onClick={() => { setShowFavoriteWeekForm(false); setFavoriteWeekName('') }}
                className="mt-2 bg-transparent border-0 text-secondary text-xs cursor-pointer p-0"
              >
                Avbryt
              </button>
            </div>
          )}
        </div>
      )}

      {hasMeal && (
        <button
          onClick={() => {
            if (confirmClear) { onClearMeals(); setConfirmClear(false) }
            else { setConfirmClear(true); setTimeout(() => setConfirmClear(false), 3000) }
          }}
          className={`block w-full py-2.5 mt-1.5 rounded-xl text-sm cursor-pointer border ${confirmClear ? 'bg-[#fff3e0] border-warning text-warning' : 'bg-transparent border-border text-secondary'}`}
        >
          {confirmClear ? '⚠️ Tryck igen för att rensa hela veckan' : '🗑 Rensa matsedeln'}
        </button>
      )}

      {Object.keys(savedMeals).length > 0 && (
        <div className="mt-6 border-t border-bg-subtle pt-5">
          <h3 className="font-serif text-primary text-lg mb-3">📅 Sparade matsedlar</h3>
          {Object.entries(savedMeals).sort(([a], [b]) => b.localeCompare(a)).map(([week, data]) => {
            const isOpen = openMealKey === week
            const count = WEEKDAYS.filter(d => data.meals?.[d]).length
            return (
              <div key={week} className="rounded-xl border border-border mb-2 overflow-hidden">
                <button
                  onClick={() => setOpenMealKey(isOpen ? null : week)}
                  className={`w-full px-3.5 py-3 border-0 cursor-pointer flex justify-between items-center text-left ${isOpen ? 'bg-bg-subtle' : 'bg-white'}`}
                >
                  <span className="font-bold text-primary text-[15px]">{getWeekLabel(week)}</span>
                  <div className="flex gap-2.5 items-center">
                    <span className="text-sm text-secondary">{count} rätter</span>
                    <span className="text-secondary">{isOpen ? '▲' : '▼'}</span>
                  </div>
                </button>
                {isOpen && (
                  <div className="px-3.5 pt-1 pb-3.5 bg-bg-card">
                    {WEEKDAYS.filter(d => data.meals?.[d]).map(d => (
                      <div key={d} className="flex gap-3 py-1.5 border-b border-bg text-sm">
                        <span className="min-w-18 text-[#888] capitalize">{d}</span>
                        <span className="text-[#222]">{data.meals[d]}</span>
                      </div>
                    ))}
                    <button
                      onClick={() => handleLoadMealPlan(week)}
                      className="mt-3 px-4 py-2 bg-primary text-white border-0 rounded-lg text-sm cursor-pointer font-serif"
                    >↩ Ladda den här matsedeln</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-6 border-t border-bg-subtle pt-5">
        <button
          onClick={() => setShowRecipes(v => !v)}
          className="w-full flex justify-between items-center bg-transparent border-0 cursor-pointer pb-3"
        >
          <h3 className="font-serif text-primary text-lg m-0">
            📖 Alla recept <span className="text-sm text-secondary font-sans">({allRecipes.length})</span>
          </h3>
          <span className="text-secondary">{showRecipes ? '▲' : '▼'}</span>
        </button>
        {showRecipes && allRecipes.map(recipe => {
          const isOpen = openRecipeId === recipe.id || openRecipeId === recipe.name
          const isFavorite = favoriteRecipeIds.includes(recipe.id)
          return (
            <div key={recipe.id || recipe.name} className="rounded-xl border border-border mb-2 overflow-hidden">
              <div
                className={`flex items-center px-3.5 py-3 gap-2.5 cursor-pointer ${isOpen ? 'bg-bg-subtle' : 'bg-white'}`}
                onClick={() => setOpenRecipeId(isOpen ? null : (recipe.id || recipe.name))}
              >
                <span className="flex-1 font-bold text-primary text-[15px]">{recipe.name}</span>
                <span className="text-xs text-[#aaa]">{recipe.ingredients?.length || 0} ingredienser</span>
                <button
                  aria-label={isFavorite ? `Ta bort ${recipe.name} från favoriter` : `Lägg ${recipe.name} som favorit`}
                  title={isFavorite ? 'Ta bort favorit' : 'Lägg till favorit'}
                  onClick={e => { e.stopPropagation(); onToggleFavoriteRecipe(recipe.id) }}
                  className={`bg-transparent border-0 cursor-pointer text-lg px-1 py-0 leading-none ${isFavorite ? 'text-[#d89100]' : 'text-[#c8c0b5]'}`}
                >★</button>
                <button
                  aria-label={`Redigera recept ${recipe.name}`}
                  onClick={e => { e.stopPropagation(); onEditRecipe(recipe) }}
                  className="bg-transparent border-0 cursor-pointer text-sm px-1 py-0.5 text-secondary"
                >✏️</button>
                <span className="text-secondary text-xs">{isOpen ? '▲' : '▼'}</span>
              </div>
              {isOpen && (
                <div className="px-3.5 pt-2 pb-3.5 bg-bg-card">
                  <div className="flex flex-wrap gap-1.5">
                    {(recipe.ingredients || []).map((ing, i) => (
                      <span key={i} className="text-sm bg-white border border-border rounded-md px-2 py-0.5 text-[#444]">
                        {ing.amount ? `${ing.amount} ` : ''}{ing.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
