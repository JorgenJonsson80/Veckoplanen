import { useState, useCallback, useMemo } from 'react';

export default function HandlingslistaTab({
  stores, activeStoreId, orderedCategories, allItemsGrouped,
  checkedItems, totalItems, checkedCount, likelyEmptyItems,
  savedLists, history, categories, currentWeek,
  budget, weeklySpend,
  onToggleItem, onRemoveExtraItem, onAddExtraItem,
  onSetActiveStore, onEditStore, onNewStore, onSaveWeeklyList, onClearChecked,
  onSetBudget, onSetWeeklySpend,
}) {
  const [newExtraItem, setNewExtraItem] = useState('');
  const [newExtraCat, setNewExtraCat] = useState('');
  const [extraSuggestions, setExtraSuggestions] = useState([]);
  const [openListKey, setOpenListKey] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showBudgetEdit, setShowBudgetEdit] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [spendInput, setSpendInput] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  function handleClearChecked() {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    setConfirmClear(false);
    onClearChecked();
  }

  const handleShare = useCallback(() => {
    const lines = [`🛒 Handlingslista ${currentWeek}\n`];
    orderedCategories.forEach(cat => {
      const items = (allItemsGrouped[cat.id] || []).filter(i => !checkedItems[i.name]);
      if (!items.length) return;
      lines.push(`${cat.emoji} ${cat.name}`);
      items.forEach(i => lines.push(`• ${i.amount ? i.amount + ' ' : ''}${i.name}`));
      lines.push('');
    });
    const text = lines.join('\n').trim();
    if (navigator.share) {
      navigator.share({ title: 'Handlingslista', text });
    } else {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }, [currentWeek, orderedCategories, allItemsGrouped, checkedItems]);

  const allItemNames = useMemo(
    () => Object.values(allItemsGrouped).flat().map(i => i.name.toLowerCase()),
    [allItemsGrouped]
  );

  function handleExtraItemInput(value) {
    setNewExtraItem(value);
    if (value.length >= 1) {
      const suggestions = Object.keys(history)
        .filter(n => n.toLowerCase().startsWith(value.toLowerCase()))
        .sort((a, b) => (history[b].count || 0) - (history[a].count || 0))
        .slice(0, 5);
      setExtraSuggestions(suggestions);
    } else {
      setExtraSuggestions([]);
    }
  }

  const isDuplicate = newExtraItem.trim().length > 0 &&
    allItemNames.includes(newExtraItem.trim().toLowerCase());

  function handleAddExtraItem() {
    if (!newExtraItem.trim()) return;
    onAddExtraItem(newExtraItem.trim(), newExtraCat || (categories[0]?.id || 'ovrigt'));
    setNewExtraItem('');
    setExtraSuggestions([]);
  }

  return (
    <div>
      <h2 style={{ fontFamily: 'Georgia, serif', color: '#2d5016', margin: '0 0 12px', fontSize: '22px' }}>
        Handlingslista
      </h2>

      {/* Butiksväljare */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '16px', paddingBottom: '2px' }}>
        <button
          onClick={() => onSetActiveStore(null)}
          style={{
            flexShrink: 0, padding: '7px 14px', borderRadius: '20px', fontSize: '14px', cursor: 'pointer',
            border: '1.5px solid', fontFamily: 'inherit', whiteSpace: 'nowrap',
            background: !activeStoreId ? '#2d5016' : '#fff',
            color: !activeStoreId ? '#fff' : '#2d5016',
            borderColor: !activeStoreId ? '#2d5016' : '#c8e6c9',
          }}
        >📋 Standard</button>

        {stores.map(store => (
          <button
            key={store.id}
            onClick={() => onSetActiveStore(store.id)}
            onDoubleClick={() => onEditStore(store)}
            style={{
              flexShrink: 0, padding: '7px 14px', borderRadius: '20px', fontSize: '14px', cursor: 'pointer',
              border: '1.5px solid', fontFamily: 'inherit', whiteSpace: 'nowrap',
              background: activeStoreId === store.id ? '#2d5016' : '#fff',
              color: activeStoreId === store.id ? '#fff' : '#2d5016',
              borderColor: activeStoreId === store.id ? '#2d5016' : '#c8e6c9',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            {store.emoji} {store.name}
            {activeStoreId === store.id && (
              <span
                onClick={e => { e.stopPropagation(); onEditStore(store); }}
                style={{ fontSize: '12px', opacity: 0.8 }}
              >✏️</span>
            )}
          </button>
        ))}

        <button
          onClick={onNewStore}
          style={{
            flexShrink: 0, padding: '7px 14px', borderRadius: '20px', fontSize: '14px', cursor: 'pointer',
            border: '1.5px dashed #6b8f5e', background: '#f0f7ef', color: '#2d5016',
            fontFamily: 'inherit', whiteSpace: 'nowrap',
          }}
        >+ Butik</button>
      </div>

      {/* Framstegsbar + Spara-knapp */}
      {totalItems > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#6b8f5e', marginBottom: '4px' }}>
            <span>{checkedCount} av {totalItems} plockat</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>{Math.round((checkedCount / totalItems) * 100)}%</span>
              <button
                onClick={handleShare}
                style={{ background: '#f0f7ef', border: '1px solid #c8e6c9', borderRadius: '6px', padding: '3px 8px', fontSize: '12px', color: '#2d5016', cursor: 'pointer' }}
              >
                {copied ? '✅ Kopierad!' : '📤 Dela'}
              </button>
              <button
                onClick={onSaveWeeklyList}
                style={{ background: '#f0f7ef', border: '1px solid #c8e6c9', borderRadius: '6px', padding: '3px 8px', fontSize: '12px', color: '#2d5016', cursor: 'pointer' }}
              >
                💾 {currentWeek}
              </button>
            </div>
          </div>
          <div style={{ height: '8px', background: '#c8e6c9', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#2d5016', borderRadius: '4px', width: `${(checkedCount / totalItems) * 100}%`, transition: 'width 0.3s' }} />
          </div>
          {checkedCount > 0 && (
            <button
              onClick={handleClearChecked}
              style={{ marginTop: '10px', width: '100%', padding: '10px', background: confirmClear ? '#c62828' : checkedCount === totalItems ? '#2d5016' : '#f5f5f5', color: confirmClear || checkedCount === totalItems ? '#fff' : '#888', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', transition: 'background 0.2s' }}
            >
              {confirmClear ? '⚠️ Tryck igen för att bekräfta' : checkedCount === totalItems ? '✅ Klar med handlingen — rensa till ny vecka' : `🗑 Rensa ${checkedCount} ikryssade varor`}
            </button>
          )}
        </div>
      )}

      {/* Budget-widget (helt valfri) */}
      {!showBudgetEdit && !budget && (
        <button
          onClick={() => { setShowBudgetEdit(true); setBudgetInput(''); setSpendInput(''); }}
          style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '12px', cursor: 'pointer', padding: '0 0 12px', display: 'block' }}
        >
          + Lägg till budget (valfritt)
        </button>
      )}

      {!showBudgetEdit && budget != null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', background: '#fff', borderRadius: '10px', padding: '10px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <span style={{ fontSize: '16px' }}>💰</span>
          <div style={{ flex: 1 }}>
            {weeklySpend != null ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                  <span style={{ color: weeklySpend > budget ? '#c62828' : '#2d5016', fontWeight: '700' }}>
                    {weeklySpend} kr
                  </span>
                  <span style={{ color: '#aaa' }}>av {budget} kr</span>
                </div>
                <div style={{ height: '5px', background: '#e8f5e9', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: '3px', width: `${Math.min((weeklySpend / budget) * 100, 100)}%`, background: weeklySpend > budget ? '#c62828' : '#2d5016', transition: 'width 0.3s' }} />
                </div>
              </>
            ) : (
              <span style={{ fontSize: '13px', color: '#6b8f5e' }}>Budget: {budget} kr — fyll i vad det kostade efter kassan</span>
            )}
          </div>
          <button
            onClick={() => { setShowBudgetEdit(true); setBudgetInput(String(budget ?? '')); setSpendInput(String(weeklySpend ?? '')); }}
            style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '14px', padding: '4px' }}
          >✏️</button>
        </div>
      )}

      {showBudgetEdit && (
        <div style={{ background: '#fff', borderRadius: '10px', padding: '14px', marginBottom: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <p style={{ margin: '0 0 10px', fontWeight: '700', color: '#2d5016', fontSize: '14px' }}>💰 Budget (valfritt)</p>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '3px' }}>Budgetmål (kr)</label>
              <input
                type="number" inputMode="numeric" placeholder="t.ex. 800"
                value={budgetInput}
                onChange={e => setBudgetInput(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #c8e6c9', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '3px' }}>Vad kostade det? (kr)</label>
              <input
                type="number" inputMode="numeric" placeholder="t.ex. 650"
                value={spendInput}
                onChange={e => setSpendInput(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #c8e6c9', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {
                const b = budgetInput.trim() ? Number(budgetInput) : null;
                const s = spendInput.trim() ? Number(spendInput) : null;
                onSetBudget(b);
                onSetWeeklySpend(s);
                setShowBudgetEdit(false);
              }}
              style={{ flex: 1, padding: '9px', background: '#2d5016', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}
            >Spara</button>
            <button
              onClick={() => setShowBudgetEdit(false)}
              style={{ padding: '9px 14px', background: '#f5f5f5', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', color: '#888' }}
            >Avbryt</button>
          </div>
        </div>
      )}

      {/* Varor per kategori */}
      {orderedCategories.map(cat => {
        const items = allItemsGrouped[cat.id] || [];
        if (items.length === 0) return null;
        return (
          <div key={cat.id} style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#6b8f5e', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {cat.emoji} {cat.name}
            </h3>
            {items.map((item, idx) => {
              const checked = !!checkedItems[item.name];
              return (
                <div
                  key={idx}
                  style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', background: checked ? '#f5f5f5' : '#fff', borderRadius: '8px', marginBottom: '6px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', gap: '10px' }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleItem(item.name, cat.id)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#2d5016' }}
                  />
                  <span style={{ flex: 1, textDecoration: checked ? 'line-through' : 'none', color: checked ? '#aaa' : '#222', fontSize: '15px' }}>
                    {item.name}
                  </span>
                  {item.amount && <span style={{ fontSize: '12px', color: '#888' }}>{item.amount}</span>}
                  {item.isExtra && (
                    <button
                      style={{ background: 'none', border: 'none', color: '#c62828', cursor: 'pointer', fontSize: '16px', padding: '0' }}
                      onClick={() => onRemoveExtraItem(item.id)}
                    >×</button>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      {totalItems === 0 && (
        <p style={{ color: '#888', textAlign: 'center', padding: '32px 0' }}>
          Välj rätter i matsedeln för att generera handlingslistan.
        </p>
      )}

      {/* Borde vara slut hemma */}
      {likelyEmptyItems.length > 0 && (
        <div style={{ marginTop: '8px', background: '#fff8e1', borderRadius: '10px', padding: '12px 14px', border: '1px solid #ffe082' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#f57f17', margin: '0 0 8px' }}>
            ⚠️ Borde vara slut hemma
          </h3>
          {likelyEmptyItems.map((item, idx) => (
            <div key={idx} style={{ fontSize: '14px', color: '#555', padding: '3px 0' }}>• {item.name}</div>
          ))}
        </div>
      )}

      {/* Lägg till extra vara */}
      <div style={{ background: '#fff', borderRadius: '12px', padding: '14px', marginTop: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
        <p style={{ margin: '0 0 10px', fontWeight: '700', color: '#2d5016', fontSize: '14px' }}>Lägg till extra vara</p>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              style={{ width: '100%', padding: '9px 10px', border: `1.5px solid ${isDuplicate ? '#ffb300' : '#c8e6c9'}`, borderRadius: '8px', fontSize: '15px', fontFamily: 'inherit', boxSizing: 'border-box' }}
              value={newExtraItem}
              onChange={e => handleExtraItemInput(e.target.value)}
              onBlur={() => setTimeout(() => setExtraSuggestions([]), 150)}
              placeholder="Varunamn"
              onKeyDown={e => e.key === 'Enter' && handleAddExtraItem()}
            />
            {isDuplicate && (
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#f57f17' }}>
                ⚠️ Finns redan i listan
              </p>
            )}
            {extraSuggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1.5px solid #c8e6c9', borderRadius: '0 0 8px 8px', zIndex: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                {extraSuggestions.map(name => (
                  <div
                    key={name}
                    style={{ padding: '9px 12px', cursor: 'pointer', fontSize: '15px', borderBottom: '1px solid #f0f7ef', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    onMouseDown={() => { setNewExtraItem(name); setExtraSuggestions([]); }}
                  >
                    <span>{name}</span>
                    <span style={{ fontSize: '11px', color: '#aaa' }}>köpt {history[name]?.count || 0}×</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <select
            style={{ padding: '9px 6px', border: '1.5px solid #c8e6c9', borderRadius: '8px', fontSize: '14px', background: '#fff', fontFamily: 'inherit' }}
            value={newExtraCat}
            onChange={e => setNewExtraCat(e.target.value)}
          >
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
            ))}
          </select>
        </div>
        <button
          style={{ width: '100%', padding: '10px', background: '#2d5016', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', cursor: 'pointer' }}
          onClick={handleAddExtraItem}
        >
          Lägg till
        </button>
      </div>

      {/* Arkiverade handlingslistor */}
      {Object.keys(savedLists).length > 0 && (
        <div style={{ marginTop: '24px', borderTop: '1px solid #e8f5e9', paddingTop: '20px' }}>
          <h3 style={{ fontFamily: 'Georgia, serif', color: '#2d5016', fontSize: '18px', margin: '0 0 12px' }}>
            📦 Arkiverade listor
          </h3>
          {Object.entries(savedLists)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([week, data]) => {
              const isOpen = openListKey === week;
              return (
                <div key={week} style={{ borderRadius: '10px', border: '1.5px solid #c8e6c9', marginBottom: '8px', overflow: 'hidden' }}>
                  <button
                    onClick={() => setOpenListKey(isOpen ? null : week)}
                    style={{ width: '100%', padding: '12px 14px', background: isOpen ? '#e8f5e9' : '#fff', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' }}
                  >
                    <span style={{ fontWeight: '700', color: '#2d5016', fontSize: '15px' }}>{week}</span>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: '#6b8f5e' }}>{data.items?.length || 0} varor</span>
                      <span style={{ color: '#6b8f5e' }}>{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </button>
                  {isOpen && (
                    <div style={{ padding: '4px 14px 14px', background: '#fafff9' }}>
                      {data.meals && Object.entries(data.meals).filter(([, v]) => v).length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '8px 0 10px' }}>
                          {Object.entries(data.meals).filter(([, v]) => v).map(([, meal]) => (
                            <span key={meal} style={{ fontSize: '12px', background: '#f0f7ef', borderRadius: '4px', padding: '2px 7px', color: '#2d5016' }}>{meal}</span>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {(data.items || []).map((item, i) => (
                          <span key={i} style={{ fontSize: '13px', background: '#fff', border: '1px solid #c8e6c9', borderRadius: '6px', padding: '3px 8px', color: '#444' }}>
                            {item.amount ? `${item.amount} ` : ''}{item.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
