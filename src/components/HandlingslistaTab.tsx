import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { getWeekLabel } from '../utils/date'
import type { Category, Store, ShoppingListItem, SavedShoppingList, PurchaseRecord } from '../types'

interface Props {
  stores: Store[]
  activeStoreId: string | null
  orderedCategories: Category[]
  allItemsGrouped: Record<string, ShoppingListItem[]>
  checkedItems: Record<string, boolean>
  totalItems: number
  checkedCount: number
  likelyEmptyItems: ShoppingListItem[]
  savedLists: Record<string, SavedShoppingList>
  history: Record<string, PurchaseRecord>
  categories: Category[]
  currentWeek: string
  budget: number | null
  weeklySpend: number | null
  onToggleItem: (name: string, catId: string) => void
  onRemoveExtraItem: (id: string) => void
  onAddExtraItem: (name: string, catId: string) => void
  onHideIngredient: (name: string) => void
  onRestoreIngredients: () => void
  hiddenCount: number
  onSetActiveStore: (id: string | null) => void
  onEditStore: (store: Store) => void
  onNewStore: () => void
  onSaveWeeklyList: () => void
  onClearChecked: () => void
  onSetBudget: (value: number | null) => void
  onSetWeeklySpend: (value: number | null) => void
}

export default function HandlingslistaTab({
  stores, activeStoreId, orderedCategories, allItemsGrouped,
  checkedItems, totalItems, checkedCount, likelyEmptyItems,
  savedLists, history, categories, currentWeek,
  budget, weeklySpend,
  onToggleItem, onRemoveExtraItem, onAddExtraItem,
  onHideIngredient, onRestoreIngredients, hiddenCount,
  onSetActiveStore, onEditStore, onNewStore, onSaveWeeklyList, onClearChecked,
  onSetBudget, onSetWeeklySpend,
}: Props) {
  const [newExtraItem, setNewExtraItem] = useState('')
  const [newExtraCat, setNewExtraCat] = useState('')
  const [extraSuggestions, setExtraSuggestions] = useState<string[]>([])
  const [openListKey, setOpenListKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showBudgetEdit, setShowBudgetEdit] = useState(false)
  const [budgetInput, setBudgetInput] = useState('')
  const [spendInput, setSpendInput] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const prevCheckedCount = useRef(0)

  useEffect(() => {
    if (totalItems > 0 && checkedCount === totalItems && prevCheckedCount.current < totalItems) {
      setShowCelebration(true)
      setTimeout(() => setShowCelebration(false), 3200)
    }
    prevCheckedCount.current = checkedCount
  }, [checkedCount, totalItems])

  function handleClearChecked() {
    if (!confirmClear) { setConfirmClear(true); setTimeout(() => setConfirmClear(false), 3000); return }
    setConfirmClear(false)
    onClearChecked()
  }

  const handleShare = useCallback(() => {
    const lines = [`🛒 Handlingslista ${currentWeek}\n`]
    orderedCategories.forEach(cat => {
      const items = (allItemsGrouped[cat.id] || []).filter(i => !checkedItems[i.name])
      if (!items.length) return
      lines.push(`${cat.emoji} ${cat.name}`)
      items.forEach(i => lines.push(`• ${i.amount ? i.amount + ' ' : ''}${i.name}`))
      lines.push('')
    })
    const text = lines.join('\n').trim()
    if (navigator.share) navigator.share({ title: 'Handlingslista', text })
    else navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }, [currentWeek, orderedCategories, allItemsGrouped, checkedItems])

  const allItemNames = useMemo(() => Object.values(allItemsGrouped).flat().map(i => i.name.toLowerCase()), [allItemsGrouped])

  function handleExtraItemInput(value: string) {
    setNewExtraItem(value)
    if (value.length >= 1) {
      const suggestions = Object.keys(history)
        .filter(n => n.toLowerCase().startsWith(value.toLowerCase()))
        .sort((a, b) => (history[b].count || 0) - (history[a].count || 0))
        .slice(0, 5)
      setExtraSuggestions(suggestions)
    } else {
      setExtraSuggestions([])
    }
  }

  const isDuplicate = newExtraItem.trim().length > 0 && allItemNames.includes(newExtraItem.trim().toLowerCase())

  function handleAddExtraItem() {
    if (!newExtraItem.trim()) return
    onAddExtraItem(newExtraItem.trim(), newExtraCat || (categories[0]?.id || 'ovrigt'))
    setNewExtraItem('')
    setExtraSuggestions([])
  }

  const storeBtnCls = (active: boolean) =>
    `shrink-0 px-3.5 py-1.5 rounded-full text-sm cursor-pointer border font-[inherit] whitespace-nowrap ${active ? 'bg-primary text-white border-primary' : 'bg-white text-primary border-border'}`

  return (
    <div>
      {showCelebration && (
        <div
          className="fixed top-14 left-0 right-0 z-50 bg-primary text-white text-center py-3.5 text-base font-semibold shadow-lg"
          style={{ animation: 'celebrate-in 3.2s ease forwards' }}
        >
          🎉 Klar med veckans handling!
        </div>
      )}
      <h2 className="font-serif text-primary text-[22px] mb-3">Handlingslista</h2>

      {/* Butiksväljare */}
      <div className="flex gap-2 overflow-x-auto mb-4 pb-0.5">
        <button onClick={() => onSetActiveStore(null)} className={storeBtnCls(!activeStoreId)}>📋 Standard</button>
        {stores.map(store => (
          <button
            key={store.id}
            onClick={() => onSetActiveStore(store.id)}
            onDoubleClick={() => onEditStore(store)}
            className={`${storeBtnCls(activeStoreId === store.id)} flex items-center gap-1.5`}
          >
            {store.emoji} {store.name}
            {activeStoreId === store.id && (
              <span onClick={e => { e.stopPropagation(); onEditStore(store) }} className="text-xs opacity-80">✏️</span>
            )}
          </button>
        ))}
        <button onClick={onNewStore} className="shrink-0 px-3.5 py-1.5 rounded-full text-sm cursor-pointer border border-dashed border-secondary bg-bg text-primary font-[inherit] whitespace-nowrap">+ Butik</button>
      </div>

      {/* Framstegsbar */}
      {totalItems > 0 && (
        <div className="mb-4">
          <div className="flex justify-between items-center text-sm text-secondary mb-1">
            <span>{checkedCount} av {totalItems} plockat</span>
            <div className="flex items-center gap-2.5">
              <span>{Math.round((checkedCount / totalItems) * 100)}%</span>
              <button onClick={handleShare} className="bg-bg border border-border rounded-md px-2 py-0.5 text-xs text-primary cursor-pointer">{copied ? '✅ Kopierad!' : '📤 Dela'}</button>
              <button onClick={onSaveWeeklyList} className="bg-bg border border-border rounded-md px-2 py-0.5 text-xs text-primary cursor-pointer">💾 {getWeekLabel(currentWeek)}</button>
            </div>
          </div>
          <div className="h-2 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-[width] duration-300" style={{ width: `${(checkedCount / totalItems) * 100}%` }} />
          </div>
          {checkedCount > 0 && (
            <button
              onClick={handleClearChecked}
              className={`mt-2.5 w-full py-2.5 border-0 rounded-lg text-sm cursor-pointer transition-colors duration-200 ${confirmClear ? 'bg-error text-white' : checkedCount === totalItems ? 'bg-primary text-white' : 'bg-[#f5f5f5] text-[#888]'}`}
            >
              {confirmClear ? '⚠️ Tryck igen för att bekräfta' : checkedCount === totalItems ? '✅ Klar med handlingen — rensa till ny vecka' : `🗑 Rensa ${checkedCount} ikryssade varor`}
            </button>
          )}
        </div>
      )}

      {/* Budget-widget */}
      {!showBudgetEdit && !budget && (
        <button onClick={() => { setShowBudgetEdit(true); setBudgetInput(''); setSpendInput('') }} className="bg-transparent border-0 text-[#aaa] text-xs cursor-pointer p-0 pb-3 block">
          + Lägg till budget (valfritt)
        </button>
      )}
      {!showBudgetEdit && budget != null && (
        <div className="flex items-center gap-2.5 mb-3.5 bg-white rounded-xl px-3.5 py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <span className="text-base">💰</span>
          <div className="flex-1">
            {weeklySpend != null ? (
              <>
                <div className="flex justify-between text-sm mb-1">
                  <span className={`font-bold ${weeklySpend > budget ? 'text-error' : 'text-primary'}`}>{weeklySpend} kr</span>
                  <span className="text-[#aaa]">av {budget} kr</span>
                </div>
                <div className="h-1.5 bg-bg-subtle rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-[width] duration-300 ${weeklySpend > budget ? 'bg-error' : 'bg-primary'}`}
                    style={{ width: `${Math.min((weeklySpend / budget) * 100, 100)}%` }}
                  />
                </div>
              </>
            ) : (
              <span className="text-sm text-secondary">Budget: {budget} kr — fyll i vad det kostade efter kassan</span>
            )}
          </div>
          <button aria-label="Redigera budget" onClick={() => { setShowBudgetEdit(true); setBudgetInput(String(budget ?? '')); setSpendInput(String(weeklySpend ?? '')) }} className="bg-transparent border-0 text-[#aaa] cursor-pointer text-sm p-1">✏️</button>
        </div>
      )}
      {showBudgetEdit && (
        <div className="bg-white rounded-xl p-3.5 mb-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <p className="m-0 mb-2.5 font-bold text-primary text-sm">💰 Budget (valfritt)</p>
          <div className="flex gap-2 mb-2">
            <div className="flex-1">
              <label className="text-xs text-[#888] block mb-0.5">Budgetmål (kr)</label>
              <input type="number" inputMode="numeric" placeholder="t.ex. 800" value={budgetInput} onChange={e => setBudgetInput(e.target.value)} className="w-full px-2.5 py-2 border border-border rounded-lg text-[15px] box-border" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-[#888] block mb-0.5">Vad kostade det? (kr)</label>
              <input type="number" inputMode="numeric" placeholder="t.ex. 650" value={spendInput} onChange={e => setSpendInput(e.target.value)} className="w-full px-2.5 py-2 border border-border rounded-lg text-[15px] box-border" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { onSetBudget(budgetInput.trim() ? Number(budgetInput) : null); onSetWeeklySpend(spendInput.trim() ? Number(spendInput) : null); setShowBudgetEdit(false) }} className="flex-1 py-2 bg-primary text-white border-0 rounded-lg text-sm cursor-pointer">Spara</button>
            <button onClick={() => setShowBudgetEdit(false)} className="px-3.5 py-2 bg-[#f5f5f5] border-0 rounded-lg text-sm cursor-pointer text-[#888]">Avbryt</button>
          </div>
        </div>
      )}

      {/* Varor per kategori */}
      {orderedCategories.map(cat => {
        const items = allItemsGrouped[cat.id] || []
        if (items.length === 0) return null
        return (
          <div key={cat.id} className="mb-4">
            <h3 className="text-sm font-bold text-secondary mb-2 uppercase tracking-[0.5px]">{cat.emoji} {cat.name}</h3>
            {items.map((item, idx) => {
              const checked = !!checkedItems[item.name]
              return (
                <div key={idx} className={`flex items-center px-3 py-2.5 rounded-lg mb-1.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] gap-2.5 ${checked ? 'bg-[#f5f5f5]' : 'bg-white'}`}>
                  <input type="checkbox" checked={checked} onChange={() => onToggleItem(item.name, cat.id)} className="w-4.5 h-4.5 cursor-pointer accent-primary" />
                  <span className={`flex-1 text-[15px] ${checked ? 'line-through text-[#aaa]' : 'text-[#222]'}`}>{item.name}</span>
                  {item.amount && <span className="text-xs text-[#888]">{item.amount}</span>}
                  {item.isExtra
                    ? <button aria-label="Ta bort vara" className="bg-transparent border-0 text-error cursor-pointer text-base p-0 leading-none" onClick={() => onRemoveExtraItem(item.id!)}>×</button>
                    : <button aria-label="Dölj — har hemma" className="bg-transparent border-0 text-[#ccc] cursor-pointer text-base p-0 leading-none" title="Har hemma — dölj från listan" onClick={() => onHideIngredient(item.name)}>×</button>
                  }
                </div>
              )
            })}
          </div>
        )
      })}

      {hiddenCount > 0 && (
        <button onClick={onRestoreIngredients} className="block w-full text-center bg-transparent border-0 text-[#aaa] text-sm cursor-pointer py-1 pb-3">
          + Visa {hiddenCount} dolda {hiddenCount === 1 ? 'vara' : 'varor'} (har hemma)
        </button>
      )}

      {totalItems === 0 && (
        <div className="text-center py-7 pb-4 text-[#888]">
          <p className="mb-1.5 text-[15px]">Listan är tom.</p>
          <p className="m-0 text-sm leading-relaxed">
            Lägg till varor manuellt med formuläret nedan — eller välj rätter i Matsedeln för att fylla listan automatiskt.
          </p>
        </div>
      )}

      {likelyEmptyItems.length > 0 && (
        <div className="mt-2 bg-[#fff8e1] rounded-xl px-3.5 py-3 border border-[#ffe082]">
          <h3 className="text-sm font-bold text-[#f57f17] mb-2">⚠️ Borde vara slut hemma</h3>
          {likelyEmptyItems.map((item, idx) => <div key={idx} className="text-sm text-[#555] py-0.5">• {item.name}</div>)}
        </div>
      )}

      {/* Lägg till extra vara */}
      <div className="bg-white rounded-xl p-3.5 mt-4 shadow-[0_1px_4px_rgba(0,0,0,0.07)]">
        <p className="m-0 mb-2.5 font-bold text-primary text-sm">Lägg till extra vara</p>
        <div className="flex gap-2 mb-2">
          <div className="flex-1 relative">
            <input
              className={`w-full px-2.5 py-2 border rounded-lg text-[15px] font-[inherit] box-border ${isDuplicate ? 'border-[#ffb300]' : 'border-border'}`}
              value={newExtraItem}
              onChange={e => handleExtraItemInput(e.target.value)}
              onBlur={() => setTimeout(() => setExtraSuggestions([]), 150)}
              placeholder="Varunamn"
              onKeyDown={e => e.key === 'Enter' && handleAddExtraItem()}
            />
            {isDuplicate && <p className="m-0 mt-1 text-xs text-[#f57f17]">⚠️ Finns redan i listan</p>}
            {extraSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-border rounded-b-lg z-20 shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
                {extraSuggestions.map(name => (
                  <div
                    key={name}
                    className="px-3 py-2 cursor-pointer text-[15px] border-b border-bg flex justify-between items-center"
                    onMouseDown={() => { setNewExtraItem(name); setExtraSuggestions([]) }}
                  >
                    <span>{name}</span>
                    <span className="text-[11px] text-[#aaa]">köpt {history[name]?.count || 0}×</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <select
            className="px-1.5 py-2 border border-border rounded-lg text-sm bg-white font-[inherit]"
            value={newExtraCat}
            onChange={e => setNewExtraCat(e.target.value)}
          >
            {categories.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
          </select>
        </div>
        <button className="w-full py-2.5 bg-primary text-white border-0 rounded-lg text-[15px] cursor-pointer" onClick={handleAddExtraItem}>Lägg till</button>
      </div>

      {/* Arkiverade handlingslistor */}
      {Object.keys(savedLists).length > 0 && (
        <div className="mt-6 border-t border-bg-subtle pt-5">
          <h3 className="font-serif text-primary text-lg mb-3">📦 Arkiverade listor</h3>
          {Object.entries(savedLists).sort(([a], [b]) => b.localeCompare(a)).map(([week, data]) => {
            const isOpen = openListKey === week
            return (
              <div key={week} className="rounded-xl border border-border mb-2 overflow-hidden">
                <button
                  onClick={() => setOpenListKey(isOpen ? null : week)}
                  className={`w-full px-3.5 py-3 border-0 cursor-pointer flex justify-between items-center text-left ${isOpen ? 'bg-bg-subtle' : 'bg-white'}`}
                >
                  <span className="font-bold text-primary text-[15px]">{getWeekLabel(week)}</span>
                  <div className="flex gap-2.5 items-center">
                    <span className="text-sm text-secondary">{data.items?.length || 0} varor</span>
                    <span className="text-secondary">{isOpen ? '▲' : '▼'}</span>
                  </div>
                </button>
                {isOpen && (
                  <div className="px-3.5 pt-1 pb-3.5 bg-bg-card">
                    {data.meals && Object.entries(data.meals).filter(([, v]) => v).length > 0 && (
                      <div className="flex flex-wrap gap-1 py-2 pb-2.5">
                        {Object.entries(data.meals).filter(([, v]) => v).map(([, meal]) => (
                          <span key={meal} className="text-xs bg-bg rounded px-1.5 py-0.5 text-primary">{meal}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {(data.items || []).map((item, i) => (
                        <span key={i} className="text-sm bg-white border border-border rounded-md px-2 py-0.5 text-[#444]">{item.amount ? `${item.amount} ` : ''}{item.name}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
