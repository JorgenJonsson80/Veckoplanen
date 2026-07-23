import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Check, Star, X, Mic, Copy, Pencil, UtensilsCrossed, Users, Minus, Plus,
  RotateCcw, RefreshCw, Save, TriangleAlert, Trash2, Calendar, ChevronUp,
  ChevronDown, Undo2, BookOpen,
} from 'lucide-react'
import { WEEKDAYS } from '../hooks/useSharedState'
import { getWeekLabel, getDateForWeekday } from '../utils/date'
import { useAppContext } from '../context/AppContext'
import { useVoiceDictation } from '../hooks/useVoiceDictation'
import type { Recipe, RecipeDraft } from '../types'

const QUICK_START_MEALS = ['Tacos', 'Spagetti Bolognese', 'Kycklinggryta', 'Pannkakor', 'Laxpasta']

interface Props {
  onEditRecipe: (recipe: RecipeDraft) => void
  onLoadFavoriteWeek: (favoriteWeekId: string) => void
  onGenerateWeek: (selectedMeals: string[]) => void
}

export default function MatsedelTab({ onEditRecipe, onLoadFavoriteWeek, onGenerateWeek }: Props) {
  const {
    meals, allRecipes,
    favoriteRecipes: favoriteRecipeIds,
    favoriteWeeks, savedMeals, currentWeek,
    budget, weeklySpend, budgetSummary,
    householdSize,
    mealPortions,
    setMealPortion: onSetMealPortion,
    resetMealPortion: onResetMealPortion,
    mealRotationSuggestions,
    setMeal: onSetMeal,
    saveMealPlan: onSaveMealPlan,
    loadMealPlan: onLoadMealPlan,
    saveFavoriteWeek: onSaveFavoriteWeek,
    deleteFavoriteWeek: onDeleteFavoriteWeek,
    toggleFavoriteRecipe: onToggleFavoriteRecipe,
    clearMeals: onClearMeals,
    logAteOut: onLogAteOut,
    removeAteOut: onRemoveAteOut,
    ateOut,
  } = useAppContext()
  const [autocomplete, setAutocomplete] = useState<{ day: string | null; results: string[] }>({ day: null, results: [] })
  const [ateOutInput, setAteOutInput] = useState<{ day: string; amount: string } | null>(null)
  const [copyingDay, setCopyingDay] = useState<string | null>(null)
  const [listeningDay, setListeningDay] = useState<string | null>(null)
  const listeningDayRef = useRef<string | null>(null)

  const { isListening, isSupported: voiceSupported, error: voiceError, start: startVoice, stop: stopVoice } = useVoiceDictation({
    onResult: (text: string) => {
      if (listeningDayRef.current) {
        handleMealInput(listeningDayRef.current, text)
      }
      listeningDayRef.current = null
      setListeningDay(null)
    },
  })

  function startVoiceForDay(day: string) {
    if (isListening) stopVoice()
    listeningDayRef.current = day
    setListeningDay(day)
    // Small delay when switching days so previous recognition closes cleanly
    setTimeout(startVoice, 50)
  }

  function cancelVoice() {
    listeningDayRef.current = null
    setListeningDay(null)
    stopVoice()
  }
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
  const bestFavoriteWeekSpend = useMemo(() => {
    const spends = favoriteWeeks
      .map(week => week.estimatedSpend)
      .filter((spend): spend is number => spend != null)
    return spends.length ? Math.min(...spends) : null
  }, [favoriteWeeks])

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
        <div className="mb-3 rounded-lg bg-bg px-3 py-2 text-xs text-secondary flex flex-wrap gap-x-3 gap-y-1">
          {budget != null ? <span>Budget: {budget} kr</span> : <span>Sätt budget i handlingslistan</span>}
          {weeklySpend != null && <span>Senast: {weeklySpend} kr</span>}
          {budgetSummary.averageSpend != null && <span>Snitt: {budgetSummary.averageSpend} kr</span>}
          {bestFavoriteWeekSpend != null && <span>Billig favorit: ca {bestFavoriteWeekSpend} kr</span>}
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
                <span className="font-bold inline-flex items-center gap-1">{selected && <Check size={13} />}{mealName}</span>
                {isFavorite && <Star size={12} fill="currentColor" className={`ml-1.5 inline ${selected ? 'text-white/75' : 'text-secondary'}`} />}
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
                      <span className="block text-xs text-secondary mt-0.5">
                        {mealCount} rätter
                      </span>
                    </button>
                    {week.estimatedSpend != null && (
                      <span className="shrink-0 rounded-full bg-bg px-2.5 py-1 text-xs font-bold text-primary">ca {week.estimatedSpend} kr</span>
                    )}
                    <button
                      type="button"
                      aria-label={`Ta bort favoritveckan ${week.name}`}
                      onClick={() => onDeleteFavoriteWeek(week.id)}
                      className="bg-bg border border-border rounded-md text-secondary cursor-pointer px-2 py-1 flex items-center"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {voiceError && (
        <p className="text-xs text-error bg-error/5 border border-error/20 rounded-lg px-3 py-2 mb-3">{voiceError}</p>
      )}

      {WEEKDAYS.map(day => {
        const dayLabel = day.charAt(0).toUpperCase() + day.slice(1)
        const mealValue = meals[day] || ''
        const isOpen = autocomplete.day === day && autocomplete.results.length > 0
        const recipe = allRecipes.find(r => r.name.toLowerCase() === mealValue.toLowerCase())
        const isCopying = copyingDay === day
        const date = getDateForWeekday(day)
        const ateOutEntry = ateOut.find(e => e.date === date)
        const isAteOutOpen = ateOutInput?.day === day
        const dayPortions = mealPortions[day] ?? householdSize
        const portionsCustomized = mealPortions[day] != null && mealPortions[day] !== householdSize

        return (
          <div key={day} className="bg-white rounded-xl px-3.5 py-3 mb-2.5 shadow-[0_1px_4px_rgba(0,0,0,0.07)]">
            {/* Rad 1: dag-label + input + mikrofon */}
            <div className="flex items-center gap-2">
              <span className="w-18 shrink-0 font-bold text-primary text-sm">{dayLabel}</span>
              <div className="flex-1 relative min-w-0">
                <input
                  className="w-full px-2.5 py-2 border border-border rounded-lg text-[15px] font-[inherit] box-border"
                  value={mealValue}
                  onChange={e => handleMealInput(day, e.target.value)}
                  onBlur={() => setTimeout(() => setAutocomplete({ day: null, results: [] }), 150)}
                  placeholder={listeningDay === day ? 'Lyssnar...' : 'Välj rätt...'}
                />
                {isOpen && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-border rounded-b-lg z-20 shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
                    {autocomplete.results.map(name => (
                      <div key={name} className="px-3 py-2.5 cursor-pointer text-[15px] border-b border-bg" onMouseDown={() => selectAutocomplete(day, name)}>{name}</div>
                    ))}
                  </div>
                )}
              </div>
              {voiceSupported && (
                listeningDay === day ? (
                  <button
                    aria-label="Avbryt röstinmatning"
                    onClick={cancelVoice}
                    className="shrink-0 px-3 h-9 flex items-center gap-1.5 bg-error text-white border-0 rounded-lg text-sm font-semibold cursor-pointer"
                  >
                    <X size={14} /><span>Avbryta</span>
                  </button>
                ) : (
                  <button
                    aria-label={`Diktera rätt för ${dayLabel}`}
                    onClick={() => startVoiceForDay(day)}
                    className="shrink-0 w-9 h-9 flex items-center justify-center bg-bg border border-border rounded-lg cursor-pointer"
                  >
                    <Mic size={16} />
                  </button>
                )
              )}
            </div>

            {/* Rad 2: åtgärdsknappar (visas när rätt eller åt-ute finns) */}
            {(mealValue || ateOutEntry) && (
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                {mealValue && (
                  <div className="relative">
                    <button
                      className={`border border-border rounded-md cursor-pointer px-2.5 py-1 flex items-center gap-1 text-xs ${isCopying ? 'bg-primary text-white border-primary' : 'bg-bg text-primary'}`}
                      onClick={() => setCopyingDay(isCopying ? null : day)}
                    >
                      <Copy size={12} /><span>Kopiera</span>
                    </button>
                    {isCopying && (
                      <div className="absolute top-full left-0 mt-1.5 bg-white border border-border rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.12)] z-30 p-2 min-w-35">
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
                )}
                {mealValue && (
                  <button
                    className="bg-bg border border-border rounded-md cursor-pointer text-primary px-2.5 py-1 flex items-center gap-1 text-xs"
                    onClick={() => onEditRecipe(recipe ?? { id: null, name: mealValue, ingredients: [] })}
                  >
                    <Pencil size={12} /><span>Recept</span>
                  </button>
                )}
                <button
                  className={`border rounded-md cursor-pointer px-2.5 py-1 flex items-center gap-1 text-xs ${ateOutEntry ? 'bg-warning/10 border-warning text-warning' : 'bg-bg border-border text-secondary'}`}
                  onClick={() => {
                    if (ateOutEntry) { onRemoveAteOut(date); setAteOutInput(null) }
                    else setAteOutInput(isAteOutOpen ? null : { day, amount: '' })
                  }}
                >
                  <UtensilsCrossed size={12} /><span>{ateOutEntry ? 'Åt ute' : 'Ute?'}</span>
                </button>
              </div>
            )}
            {isAteOutOpen && !ateOutEntry && (
              <div className="mt-2 flex gap-2 items-center pl-22.5">
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="Kostnad (valfritt)"
                  className="flex-1 px-2.5 py-1.5 border border-border rounded-lg text-sm font-[inherit] box-border"
                  value={ateOutInput?.amount ?? ''}
                  onChange={e => setAteOutInput(prev => prev ? { ...prev, amount: e.target.value } : null)}
                  autoFocus
                />
                <button
                  type="button"
                  className="px-3 py-1.5 bg-primary text-white border-0 rounded-lg text-sm cursor-pointer"
                  onClick={() => {
                    const amt = ateOutInput?.amount ? parseFloat(ateOutInput.amount) : undefined
                    onLogAteOut(date, amt)
                    setAteOutInput(null)
                  }}
                >
                  Logga
                </button>
              </div>
            )}
            {ateOutEntry && (
              <div className="mt-1 pl-22.5 text-xs text-warning">
                Åt ute{ateOutEntry.amount ? ` — ${ateOutEntry.amount} kr` : ''}
              </div>
            )}
            {mealValue && !ateOutEntry && !isAteOutOpen && (
              <div className="mt-1.5 pl-22.5 flex items-center gap-2 flex-wrap">
                {recipe?.imageUrl && (
                  <img
                    src={recipe.imageUrl}
                    alt={recipe.name}
                    className="w-8 h-8 rounded object-cover shrink-0"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                )}
                <div className="flex items-center gap-1">
                  <Users size={12} className="text-secondary" />
                  <button
                    aria-label="Färre portioner"
                    onClick={() => onSetMealPortion(day, dayPortions - 1)}
                    className="w-5 h-5 flex items-center justify-center bg-bg border border-border rounded cursor-pointer leading-none"
                  ><Minus size={11} /></button>
                  <span className={`text-xs font-semibold w-5 text-center ${portionsCustomized ? 'text-primary' : 'text-secondary'}`}>{dayPortions}</span>
                  <button
                    aria-label="Fler portioner"
                    onClick={() => onSetMealPortion(day, dayPortions + 1)}
                    className="w-5 h-5 flex items-center justify-center bg-bg border border-border rounded cursor-pointer leading-none"
                  ><Plus size={11} /></button>
                  <span className="text-xs text-secondary">port.</span>
                  {portionsCustomized && (
                    <button
                      onClick={() => onResetMealPortion(day)}
                      className="text-xs text-secondary bg-transparent border-0 cursor-pointer ml-0.5 p-0 underline flex items-center"
                      title={`Återställ till ${householdSize}`}
                    ><RotateCcw size={12} /></button>
                  )}
                </div>
                {recipe && (
                  <div className="text-xs text-[#aaa] flex flex-wrap gap-1">
                    {(recipe.ingredients || []).slice(0, 4).map((ing, i) => (
                      <span key={i} className="bg-bg rounded px-1.5 py-px">{ing.name}</span>
                    ))}
                    {(recipe.ingredients || []).length > 4 && <span>+{recipe.ingredients.length - 4}</span>}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {mealRotationSuggestions.length > 0 && (
        <div className="mt-3 bg-bg-subtle rounded-xl px-3.5 py-3 border border-border">
          <h3 className="text-sm font-bold text-primary mb-2.5 flex items-center gap-1.5"><RefreshCw size={14} /> Dags att laga igen?</h3>
          <div className="flex flex-col gap-2">
            {mealRotationSuggestions.map(({ mealName, weeksAgo }) => (
              <div key={mealName} className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-sm text-[#222] font-medium">{mealName}</span>
                  <span className="text-xs text-[#aaa] ml-2">{weeksAgo} veckor sedan</span>
                </div>
                <button
                  onClick={() => {
                    const firstEmpty = WEEKDAYS.find(d => !meals[d])
                    if (firstEmpty) onSetMeal(firstEmpty, mealName)
                  }}
                  className="shrink-0 px-3 py-1 bg-primary text-white border-0 rounded-lg text-xs cursor-pointer font-medium"
                >
                  + Lägg till
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
        <span className="inline-flex items-center gap-1.5"><Save size={16} /> Spara matsedeln ({getWeekLabel(currentWeek)})</span>
      </button>

      {hasMeal && (
        <div className="mt-2">
          {!showFavoriteWeekForm ? (
            <button
              type="button"
              onClick={() => setShowFavoriteWeekForm(true)}
              className="w-full py-2.5 bg-white border border-border rounded-xl text-primary text-sm cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Star size={14} /> Spara som favoritvecka
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
          className={`w-full py-2.5 mt-1.5 rounded-xl text-sm cursor-pointer border flex items-center justify-center gap-1.5 ${confirmClear ? 'bg-[#fff3e0] border-warning text-warning' : 'bg-transparent border-border text-secondary'}`}
        >
          {confirmClear ? <><TriangleAlert size={14} /> Tryck igen för att rensa hela veckan</> : <><Trash2 size={14} /> Rensa matsedeln</>}
        </button>
      )}

      {Object.keys(savedMeals).length > 0 && (
        <div className="mt-6 border-t border-bg-subtle pt-5">
          <h3 className="font-serif text-primary text-lg mb-3 flex items-center gap-1.5"><Calendar size={18} /> Sparade matsedlar</h3>
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
                    <span className="text-secondary">{isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
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
                      className="mt-3 px-4 py-2 bg-primary text-white border-0 rounded-lg text-sm cursor-pointer font-serif flex items-center gap-1.5"
                    ><Undo2 size={14} /> Ladda den här matsedeln</button>
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
          <h3 className="font-serif text-primary text-lg m-0 flex items-center gap-1.5">
            <BookOpen size={18} /> Alla recept <span className="text-sm text-secondary font-sans">({allRecipes.length})</span>
          </h3>
          <span className="text-secondary">{showRecipes ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
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
                {recipe.imageUrl && (
                  <img
                    src={recipe.imageUrl}
                    alt={recipe.name}
                    className="w-9 h-9 rounded-lg object-cover shrink-0"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                )}
                <span className="flex-1 font-bold text-primary text-[15px]">{recipe.name}</span>
                <span className="text-xs text-[#aaa]">{recipe.ingredients?.length || 0} ingredienser</span>
                <button
                  aria-label={isFavorite ? `Ta bort ${recipe.name} från favoriter` : `Lägg ${recipe.name} som favorit`}
                  title={isFavorite ? 'Ta bort favorit' : 'Lägg till favorit'}
                  onClick={e => { e.stopPropagation(); onToggleFavoriteRecipe(recipe.id) }}
                  className={`bg-transparent border-0 cursor-pointer px-1 py-0 leading-none flex items-center ${isFavorite ? 'text-[#d89100]' : 'text-[#c8c0b5]'}`}
                ><Star size={16} fill={isFavorite ? 'currentColor' : 'none'} /></button>
                <button
                  aria-label={`Redigera recept ${recipe.name}`}
                  onClick={e => { e.stopPropagation(); onEditRecipe(recipe) }}
                  className="bg-transparent border-0 cursor-pointer px-1 py-0.5 text-secondary flex items-center"
                ><Pencil size={14} /></button>
                <span className="text-secondary text-xs">{isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
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
