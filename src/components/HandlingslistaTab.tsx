import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import {
  ClipboardList, Pencil, Check, Share2, TriangleAlert, CircleCheck, Trash2,
  Wallet, X, Lightbulb, BarChart3, UtensilsCrossed, ArrowUp, ArrowDown,
  ShoppingCart, Package, ChevronUp, ChevronDown, Mic, PartyPopper,
} from 'lucide-react'
import { getWeekLabel } from '../utils/date'
import { useAppContext } from '../context/AppContext'
import { useVoiceDictation } from '../hooks/useVoiceDictation'
import type { Store } from '../types'

interface Props {
  onEditStore: (store: Store) => void
  onNewStore: () => void
}

export default function HandlingslistaTab({ onEditStore, onNewStore }: Props) {
  const {
    stores, activeStoreId, orderedCategories, allItemsGrouped,
    checkedItems, totalItems, checkedCount, likelyEmptyItems,
    savedLists, purchaseHistory: history, categories, currentWeek,
    budget, weeklySpend, budgetSummary,
    toggleItem: onToggleItem,
    removeExtraItem: onRemoveExtraItem,
    addExtraItem: onAddExtraItem,
    hideIngredient: onHideIngredient,
    restoreIngredients: onRestoreIngredients,
    hiddenIngredients,
    setActiveStore: onSetActiveStore,
    saveWeeklyList,
    clearChecked: onClearChecked,
    setBudget: onSetBudget,
    setWeeklySpend: onSetWeeklySpend,
    suggestedRebuys,
    meals,
    monthlySummary,
  } = useAppContext()
  const hiddenCount = hiddenIngredients.length
  function onSaveWeeklyList() {
    saveWeeklyList(Object.values(allItemsGrouped).flat(), meals)
  }
  const [newExtraItem, setNewExtraItem] = useState('')
  const [newExtraCat, setNewExtraCat] = useState('')
  const [extraSuggestions, setExtraSuggestions] = useState<string[]>([])
  const [quickInput, setQuickInput] = useState('')
  const [quickSuggestions, setQuickSuggestions] = useState<string[]>([])
  const [openListKey, setOpenListKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showBudgetEdit, setShowBudgetEdit] = useState(false)
  const [budgetInput, setBudgetInput] = useState('')
  const [spendInput, setSpendInput] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const prevCheckedCount = useRef(0)

  const { isListening, isSupported: voiceSupported, error: voiceError, toggle: toggleVoice } = useVoiceDictation({
    onResult: handleQuickInput,
  })

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
    onSaveWeeklyList()
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
  const isQuickDuplicate = quickInput.trim().length > 0 && allItemNames.includes(quickInput.trim().toLowerCase())

  function handleAddExtraItem() {
    if (!newExtraItem.trim() || isDuplicate) return
    onAddExtraItem(newExtraItem.trim(), newExtraCat || (categories[0]?.id || 'ovrigt'))
    setNewExtraItem('')
    setExtraSuggestions([])
  }

  function handleQuickInput(value: string) {
    setQuickInput(value)
    if (value.length >= 1) {
      const suggestions = Object.keys(history)
        .filter(n => n.toLowerCase().startsWith(value.toLowerCase()))
        .sort((a, b) => (history[b].count || 0) - (history[a].count || 0))
        .slice(0, 5)
      setQuickSuggestions(suggestions)
    } else {
      setQuickSuggestions([])
    }
  }

  function handleQuickAdd(name = quickInput) {
    const trimmed = name.trim()
    if (!trimmed) return
    if (allItemNames.includes(trimmed.toLowerCase())) return
    const catId = history[trimmed]?.cat ?? categories[0]?.id ?? 'ovrigt'
    onAddExtraItem(trimmed, catId, true)
    setQuickInput('')
    setQuickSuggestions([])
  }

  const storeBtnCls = (active: boolean) =>
    `shrink-0 px-3.5 py-1.5 rounded-full text-sm cursor-pointer border font-[inherit] whitespace-nowrap ${active ? 'bg-primary text-white border-primary' : 'bg-white text-primary border-border'}`
  const budgetDelta = budget != null && weeklySpend != null ? weeklySpend - budget : null
  const previousDelta = budgetSummary.previous?.spend != null && weeklySpend != null ? weeklySpend - budgetSummary.previous.spend : null

  return (
    <div>
      {showCelebration && (
        <div
          className="fixed top-14 left-0 right-0 z-50 bg-primary text-white text-center py-3.5 text-base font-semibold shadow-lg"
          style={{ animation: 'celebrate-in 3.2s ease forwards' }}
        >
          <span className="inline-flex items-center gap-2"><PartyPopper size={18} /> Klar med veckans handling!</span>
        </div>
      )}
      <h2 className="font-serif text-primary text-[22px] mb-3">Handlingslista</h2>

      {/* Butiksväljare */}
      <div className="flex gap-2 overflow-x-auto mb-4 pb-0.5">
        <button onClick={() => onSetActiveStore(null)} className={`${storeBtnCls(!activeStoreId)} flex items-center gap-1.5`}><ClipboardList size={14} /> Standard</button>
        {stores.map(store => (
          <button
            key={store.id}
            onClick={() => onSetActiveStore(store.id)}
            onDoubleClick={() => onEditStore(store)}
            className={`${storeBtnCls(activeStoreId === store.id)} flex items-center gap-1.5`}
          >
            {store.emoji} {store.name}
            {activeStoreId === store.id && (
              <span onClick={e => { e.stopPropagation(); onEditStore(store) }} className="opacity-80 flex items-center"><Pencil size={12} /></span>
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
              <button onClick={handleShare} className="bg-bg border border-border rounded-md px-2 py-0.5 text-xs text-primary cursor-pointer inline-flex items-center gap-1">{copied ? <><Check size={12} /> Kopierad!</> : <><Share2 size={12} /> Dela</>}</button>
            </div>
          </div>
          <div className="h-2 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-[width] duration-300" style={{ width: `${(checkedCount / totalItems) * 100}%` }} />
          </div>
          {checkedCount > 0 && (
            <button
              onClick={handleClearChecked}
              className={`mt-2.5 w-full py-2.5 border-0 rounded-lg text-sm cursor-pointer transition-colors duration-200 flex items-center justify-center gap-1.5 ${confirmClear ? 'bg-error text-white' : checkedCount === totalItems ? 'bg-primary text-white' : 'bg-[#f5f5f5] text-[#888]'}`}
            >
              {confirmClear
                ? <><TriangleAlert size={14} /> Tryck igen för att bekräfta</>
                : checkedCount === totalItems
                  ? <><CircleCheck size={14} /> Klar med handlingen — rensa till ny vecka</>
                  : <><Trash2 size={14} /> Rensa {checkedCount} ikryssade varor</>}
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
          <Wallet size={18} className="text-primary" />
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
                    style={{ width: `${budget > 0 ? Math.min((weeklySpend / budget) * 100, 100) : 0}%` }}
                  />
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-secondary">
                  {budgetDelta != null && (
                    <span className={budgetDelta > 0 ? 'text-error' : 'text-primary'}>
                      {budgetDelta > 0 ? `${budgetDelta} kr över budget` : `${Math.abs(budgetDelta)} kr under budget`}
                    </span>
                  )}
                  {previousDelta != null && previousDelta !== 0 && (
                    <span>{Math.abs(previousDelta)} kr {previousDelta > 0 ? 'mer' : 'mindre'} än förra veckan</span>
                  )}
                  {budgetSummary.averageSpend != null && (
                    <span>Snitt 4 veckor: {budgetSummary.averageSpend} kr</span>
                  )}
                </div>
              </>
            ) : (
              <span className="text-sm text-secondary">Budget: {budget} kr — fyll i vad det kostade efter kassan</span>
            )}
          </div>
          <button aria-label="Redigera budget" onClick={() => { setShowBudgetEdit(true); setBudgetInput(String(budget ?? '')); setSpendInput(String(weeklySpend ?? '')) }} className="bg-transparent border-0 text-[#aaa] cursor-pointer p-1 flex items-center"><Pencil size={14} /></button>
        </div>
      )}
      {showBudgetEdit && (
        <div className="bg-white rounded-xl p-3.5 mb-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <p className="m-0 mb-2.5 font-bold text-primary text-sm flex items-center gap-1.5"><Wallet size={14} /> Budget (valfritt)</p>
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
                    ? <button aria-label="Ta bort vara" className="bg-transparent border-0 text-error cursor-pointer p-0 leading-none flex items-center" onClick={() => onRemoveExtraItem(item.id!)}><X size={16} /></button>
                    : <button aria-label="Dölj — har hemma" className="bg-transparent border-0 text-[#ccc] cursor-pointer p-0 leading-none flex items-center" title="Har hemma — dölj från listan" onClick={() => onHideIngredient(item.name)}><X size={16} /></button>
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
          <h3 className="text-sm font-bold text-[#f57f17] mb-2 flex items-center gap-1.5"><TriangleAlert size={14} /> Borde vara slut hemma</h3>
          {likelyEmptyItems.map((item, idx) => <div key={idx} className="text-sm text-[#555] py-0.5">• {item.name}</div>)}
        </div>
      )}

      {suggestedRebuys.length > 0 && (
        <div className="mt-3 bg-bg-subtle rounded-xl px-3.5 py-3 border border-border">
          <h3 className="text-sm font-bold text-primary mb-2.5 flex items-center gap-1.5"><Lightbulb size={14} /> Dags att köpa igen?</h3>
          <div className="flex flex-col gap-2">
            {suggestedRebuys.map(item => (
              <div key={item.name} className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-sm text-[#222] font-medium">{item.name}</span>
                  <span className="text-xs text-[#aaa] ml-2">
                    {item.intervalDays
                      ? `brukar köpas var ${item.intervalDays < 14 ? `${Math.round(item.intervalDays)} dagar` : `${Math.round(item.intervalDays / 7)} veckor`}`
                      : item.daysSince < 30
                        ? `${item.daysSince} dagar sedan`
                        : `${Math.round(item.daysSince / 7)} veckor sedan`}
                  </span>
                </div>
                <button
                  onClick={() => onAddExtraItem(item.name, item.catId)}
                  className="shrink-0 px-3 py-1 bg-primary text-white border-0 rounded-lg text-xs cursor-pointer font-medium"
                >
                  + Lägg till
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {(monthlySummary.ateOutCount > 0 || monthlySummary.impulseCount > 0) && (
        <div className="mt-3 bg-white rounded-xl px-3.5 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.07)]">
          <h3 className="text-sm font-bold text-primary mb-2 flex items-center gap-1.5"><BarChart3 size={14} /> Den här månaden</h3>
          <div className="flex flex-col gap-1.5 text-sm text-[#444]">
            {monthlySummary.ateOutCount > 0 && (
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5"><UtensilsCrossed size={14} /> Åt ute</span>
                <span className="font-bold">
                  {monthlySummary.ateOutCount}×{monthlySummary.ateOutSpend > 0 ? ` (${monthlySummary.ateOutSpend} kr)` : ''}
                  {monthlySummary.prev.ateOutCount > 0 && (
                    <span className={`ml-2 text-xs font-normal inline-flex items-center gap-0.5 ${monthlySummary.ateOutCount > monthlySummary.prev.ateOutCount ? 'text-error' : 'text-primary'}`}>
                      {monthlySummary.ateOutCount > monthlySummary.prev.ateOutCount ? <ArrowUp size={11} /> : <ArrowDown size={11} />} vs förra månaden
                    </span>
                  )}
                </span>
              </div>
            )}
            {monthlySummary.impulseCount > 0 && (
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5"><ShoppingCart size={14} /> Spontanköp</span>
                <span className="font-bold">
                  {monthlySummary.impulseCount} varor
                  {monthlySummary.prev.impulseCount > 0 && (
                    <span className={`ml-2 text-xs font-normal inline-flex items-center gap-0.5 ${monthlySummary.impulseCount > monthlySummary.prev.impulseCount ? 'text-error' : 'text-primary'}`}>
                      {monthlySummary.impulseCount > monthlySummary.prev.impulseCount ? <ArrowUp size={11} /> : <ArrowDown size={11} />} vs förra månaden
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
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
            {isDuplicate && <p className="m-0 mt-1 text-xs text-[#f57f17] flex items-center gap-1"><TriangleAlert size={12} /> Finns redan i listan</p>}
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
        <button className={`w-full py-2.5 border-0 rounded-lg text-[15px] ${isDuplicate ? 'bg-[#ccc] cursor-default text-white' : 'bg-primary text-white cursor-pointer'}`} onClick={handleAddExtraItem} disabled={isDuplicate}>Lägg till</button>
      </div>

      {/* Arkiverade handlingslistor */}
      {Object.keys(savedLists).length > 0 && (
        <div className="mt-6 border-t border-bg-subtle pt-5">
          <h3 className="font-serif text-primary text-lg mb-3 flex items-center gap-1.5"><Package size={18} /> Arkiverade listor</h3>
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
                    <span className="text-secondary">{isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
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

      {/* Quick-add bar — fixed at bottom, always visible */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-border shadow-[0_-2px_12px_rgba(0,0,0,0.08)]">
        <div className="max-w-150 mx-auto px-3 py-2.5">
          {voiceError && (
            <p className="text-xs text-error text-center mb-1">{voiceError}</p>
          )}
          <div className="relative flex gap-2 items-center">
            <div className="flex-1 relative">
              <input
                className={`w-full px-3 py-2.5 border rounded-xl text-[15px] font-[inherit] box-border ${isQuickDuplicate ? 'border-[#ffb300]' : 'border-border'}`}
                value={quickInput}
                onChange={e => handleQuickInput(e.target.value)}
                onBlur={() => setTimeout(() => setQuickSuggestions([]), 150)}
                placeholder={isListening ? 'Lyssnar...' : 'Lägg till vara snabbt...'}
                onKeyDown={e => e.key === 'Enter' && handleQuickAdd()}
              />
              {isQuickDuplicate && (
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#f57f17]">finns redan</span>
              )}
              {quickSuggestions.length > 0 && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-border rounded-xl z-40 shadow-[0_-4px_16px_rgba(0,0,0,0.1)] overflow-hidden">
                  {quickSuggestions.map(name => (
                    <div
                      key={name}
                      className="px-3 py-2.5 cursor-pointer text-[15px] border-b border-bg flex justify-between items-center last:border-0"
                      onMouseDown={() => handleQuickAdd(name)}
                    >
                      <span>{name}</span>
                      <span className="text-[11px] text-[#aaa]">{history[name]?.count || 0}×</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {voiceSupported && (
              <button
                onClick={toggleVoice}
                aria-label={isListening ? 'Stoppa röstinmatning' : 'Starta röstinmatning'}
                className={`shrink-0 py-2.5 border-0 rounded-xl transition-colors duration-150 font-semibold flex items-center gap-1.5 ${
                  isListening
                    ? 'px-3 bg-error text-white cursor-pointer text-sm'
                    : 'px-3 bg-bg border border-border cursor-pointer text-primary'
                }`}
              >
                {isListening ? <><X size={14} /> Avbryta</> : <Mic size={18} />}
              </button>
            )}
            <button
              onClick={() => handleQuickAdd()}
              disabled={!quickInput.trim()}
              className={`shrink-0 px-4 py-2.5 border-0 rounded-xl text-white text-[15px] font-semibold ${quickInput.trim() ? 'bg-primary cursor-pointer' : 'bg-[#ccc] cursor-default'}`}
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
