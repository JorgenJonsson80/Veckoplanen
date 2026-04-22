import { useState } from 'react'
import { WEEKDAYS } from '../hooks/useSharedState'
import { getWeekLabel } from '../utils/date'
import type { Recipe, SavedWeekPlan, RecipeDraft } from '../types'

interface Props {
  meals: Record<string, string>
  allRecipes: Recipe[]
  savedMeals: Record<string, SavedWeekPlan>
  currentWeek: string
  onSetMeal: (day: string, value: string) => void
  onSaveMealPlan: () => void
  onLoadMealPlan: (weekKey: string) => void
  onEditRecipe: (recipe: RecipeDraft) => void
  onClearMeals: () => void
}

export default function MatsedelTab({
  meals, allRecipes, savedMeals, currentWeek,
  onSetMeal, onSaveMealPlan, onLoadMealPlan, onEditRecipe, onClearMeals,
}: Props) {
  const [autocomplete, setAutocomplete] = useState<{ day: string | null; results: string[] }>({ day: null, results: [] })
  const [openMealKey, setOpenMealKey] = useState<string | null>(null)
  const [showRecipes, setShowRecipes] = useState(false)
  const [openRecipeId, setOpenRecipeId] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const hasMeal = WEEKDAYS.some(d => meals[d])

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

  return (
    <div>
      <h2 style={{ fontFamily: 'Georgia, serif', color: 'var(--clr-primary)', margin: '0 0 16px', fontSize: '22px' }}>Veckans matsedel</h2>

      {WEEKDAYS.map(day => {
        const dayLabel = day.charAt(0).toUpperCase() + day.slice(1)
        const mealValue = meals[day] || ''
        const isOpen = autocomplete.day === day && autocomplete.results.length > 0
        const recipe = allRecipes.find(r => r.name.toLowerCase() === mealValue.toLowerCase())

        return (
          <div key={day} style={{ background: '#fff', borderRadius: '12px', padding: '12px 14px', marginBottom: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ minWidth: '80px', fontWeight: '700', color: 'var(--clr-primary)', fontSize: '14px' }}>{dayLabel}</span>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #c8e6c9', borderRadius: '8px', fontSize: '15px', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  value={mealValue}
                  onChange={e => handleMealInput(day, e.target.value)}
                  onBlur={() => setTimeout(() => setAutocomplete({ day: null, results: [] }), 150)}
                  placeholder="Välj rätt..."
                />
                {isOpen && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1.5px solid #c8e6c9', borderRadius: '0 0 8px 8px', zIndex: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    {autocomplete.results.map(name => (
                      <div key={name} style={{ padding: '10px 12px', cursor: 'pointer', fontSize: '15px', borderBottom: '1px solid #f0f7ef' }} onMouseDown={() => selectAutocomplete(day, name)}>{name}</div>
                    ))}
                  </div>
                )}
              </div>
              {mealValue && (
                <button
                  style={{ background: 'var(--clr-bg)', border: '1px solid #c8e6c9', borderRadius: '6px', cursor: 'pointer', color: 'var(--clr-primary)', padding: '4px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', lineHeight: 1 }}
                  onClick={() => onEditRecipe(recipe ?? { id: null, name: mealValue, ingredients: [] })}
                  title="Öppna recepteditor"
                >
                  <span style={{ fontSize: '14px' }}>✏️</span>
                  <span style={{ fontSize: '9px', fontWeight: '600', letterSpacing: '0.3px' }}>Recept</span>
                </button>
              )}
            </div>
            {recipe && (
              <div style={{ marginTop: '8px', paddingLeft: '90px' }}>
                <div style={{ fontSize: '12px', color: '#888', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {(recipe.ingredients || []).slice(0, 5).map((ing, i) => (
                    <span key={i} style={{ background: 'var(--clr-bg)', borderRadius: '4px', padding: '1px 6px' }}>{ing.name}</span>
                  ))}
                  {(recipe.ingredients || []).length > 5 && <span style={{ color: '#aaa' }}>+{recipe.ingredients.length - 5} till</span>}
                </div>
              </div>
            )}
          </div>
        )
      })}

      <button style={{ display: 'block', width: '100%', padding: '12px', marginTop: '8px', background: 'var(--clr-bg)', border: '1.5px dashed #6b8f5e', borderRadius: '10px', color: 'var(--clr-primary)', fontSize: '15px', cursor: 'pointer' }} onClick={() => onEditRecipe({ id: null, name: '', ingredients: [] })}>
        + Skapa nytt recept
      </button>

      <button onClick={onSaveMealPlan} disabled={!hasMeal} style={{ display: 'block', width: '100%', padding: '12px', marginTop: '8px', background: hasMeal ? 'var(--clr-primary)' : '#e0e0e0', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '15px', cursor: hasMeal ? 'pointer' : 'default', fontFamily: 'Georgia, serif' }}>
        💾 Spara matsedeln ({getWeekLabel(currentWeek)})
      </button>

      {hasMeal && (
        <button
          onClick={() => {
            if (confirmClear) { onClearMeals(); setConfirmClear(false) }
            else { setConfirmClear(true); setTimeout(() => setConfirmClear(false), 3000) }
          }}
          style={{ display: 'block', width: '100%', padding: '10px', marginTop: '6px', background: confirmClear ? '#fff3e0' : 'none', border: `1.5px solid ${confirmClear ? 'var(--clr-warning)' : 'var(--clr-border)'}`, borderRadius: '10px', color: confirmClear ? 'var(--clr-warning)' : 'var(--clr-secondary)', fontSize: '14px', cursor: 'pointer' }}
        >
          {confirmClear ? '⚠️ Tryck igen för att rensa hela veckan' : '🗑 Rensa matsedeln'}
        </button>
      )}

      {Object.keys(savedMeals).length > 0 && (
        <div style={{ marginTop: '24px', borderTop: '1px solid #e8f5e9', paddingTop: '20px' }}>
          <h3 style={{ fontFamily: 'Georgia, serif', color: 'var(--clr-primary)', fontSize: '18px', margin: '0 0 12px' }}>📅 Sparade matsedlar</h3>
          {Object.entries(savedMeals).sort(([a], [b]) => b.localeCompare(a)).map(([week, data]) => {
            const isOpen = openMealKey === week
            const count = WEEKDAYS.filter(d => data.meals?.[d]).length
            return (
              <div key={week} style={{ borderRadius: '10px', border: '1.5px solid #c8e6c9', marginBottom: '8px', overflow: 'hidden' }}>
                <button onClick={() => setOpenMealKey(isOpen ? null : week)} style={{ width: '100%', padding: '12px 14px', background: isOpen ? 'var(--clr-bg-subtle)' : '#fff', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' }}>
                  <span style={{ fontWeight: '700', color: 'var(--clr-primary)', fontSize: '15px' }}>{getWeekLabel(week)}</span>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: 'var(--clr-secondary)' }}>{count} rätter</span>
                    <span style={{ color: 'var(--clr-secondary)' }}>{isOpen ? '▲' : '▼'}</span>
                  </div>
                </button>
                {isOpen && (
                  <div style={{ padding: '4px 14px 14px', background: 'var(--clr-bg-card)' }}>
                    {WEEKDAYS.filter(d => data.meals?.[d]).map(d => (
                      <div key={d} style={{ display: 'flex', gap: '12px', padding: '6px 0', borderBottom: '1px solid #f0f7ef', fontSize: '14px' }}>
                        <span style={{ minWidth: '72px', color: '#888', textTransform: 'capitalize' }}>{d}</span>
                        <span style={{ color: '#222' }}>{data.meals[d]}</span>
                      </div>
                    ))}
                    <button onClick={() => handleLoadMealPlan(week)} style={{ marginTop: '12px', padding: '8px 16px', background: 'var(--clr-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>↩ Ladda den här matsedeln</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div style={{ marginTop: '24px', borderTop: '1px solid #e8f5e9', paddingTop: '20px' }}>
        <button onClick={() => setShowRecipes(v => !v)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 12px' }}>
          <h3 style={{ fontFamily: 'Georgia, serif', color: 'var(--clr-primary)', fontSize: '18px', margin: 0 }}>
            📖 Alla recept <span style={{ fontSize: '14px', color: 'var(--clr-secondary)', fontFamily: 'system-ui' }}>({allRecipes.length})</span>
          </h3>
          <span style={{ color: 'var(--clr-secondary)' }}>{showRecipes ? '▲' : '▼'}</span>
        </button>
        {showRecipes && allRecipes.map(recipe => {
          const isOpen = openRecipeId === recipe.id || openRecipeId === recipe.name
          return (
            <div key={recipe.id || recipe.name} style={{ borderRadius: '10px', border: '1.5px solid #c8e6c9', marginBottom: '8px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', background: isOpen ? 'var(--clr-bg-subtle)' : '#fff', gap: '10px', cursor: 'pointer' }} onClick={() => setOpenRecipeId(isOpen ? null : (recipe.id || recipe.name))}>
                <span style={{ flex: 1, fontWeight: '700', color: 'var(--clr-primary)', fontSize: '15px' }}>{recipe.name}</span>
                <span style={{ fontSize: '12px', color: '#aaa' }}>{recipe.ingredients?.length || 0} ingredienser</span>
                <button onClick={e => { e.stopPropagation(); onEditRecipe(recipe) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '2px 4px', color: 'var(--clr-secondary)' }}>✏️</button>
                <span style={{ color: 'var(--clr-secondary)', fontSize: '12px' }}>{isOpen ? '▲' : '▼'}</span>
              </div>
              {isOpen && (
                <div style={{ padding: '8px 14px 14px', background: 'var(--clr-bg-card)' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {(recipe.ingredients || []).map((ing, i) => (
                      <span key={i} style={{ fontSize: '13px', background: '#fff', border: '1px solid #c8e6c9', borderRadius: '6px', padding: '3px 8px', color: '#444' }}>
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
