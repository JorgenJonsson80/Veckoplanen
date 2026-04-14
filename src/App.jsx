// Veckoplanen – Huvudkomponent
import { useState, useMemo, useRef } from 'react';
import RoomSetup from './components/RoomSetup';
import RecipeEditor from './components/RecipeEditor';
import ActivityDrawer from './components/ActivityDrawer';
import NewCategoryForm from './components/NewCategoryForm';
import { useSharedState, WEEKDAYS } from './hooks/useSharedState';
import { usePurchaseHistory } from './hooks/usePurchaseHistory';
import { DEFAULT_CATEGORIES } from './constants/categories';
import { DEFAULT_RECIPES } from './constants/recipes';

// Session-nyckel i localStorage
const SESSION_KEY = 'veckoplanen_session';

// ---------- Stilar ----------
const s = {
  app: {
    minHeight: '100vh',
    background: '#f0f7ef',
    fontFamily: 'system-ui, sans-serif',
    maxWidth: '600px',
    margin: '0 auto',
    position: 'relative',
  },
  header: {
    background: '#2d5016',
    color: '#fff',
    padding: '0 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '56px',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  headerTitle: {
    fontFamily: 'Georgia, serif',
    fontSize: '20px',
    margin: 0,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  roomBadge: {
    background: 'rgba(255,255,255,0.2)',
    borderRadius: '12px',
    padding: '3px 10px',
    fontSize: '13px',
    fontFamily: 'monospace',
    letterSpacing: '1px',
  },
  activityBtn: {
    background: 'none',
    border: 'none',
    color: '#fff',
    fontSize: '22px',
    cursor: 'pointer',
    padding: '4px',
  },
  tabs: {
    display: 'flex',
    background: '#fff',
    borderBottom: '2px solid #e8f5e9',
    position: 'sticky',
    top: '56px',
    zIndex: 9,
  },
  tab: {
    flex: 1,
    padding: '12px 4px',
    border: 'none',
    background: 'none',
    fontSize: '13px',
    cursor: 'pointer',
    color: '#6b8f5e',
    fontWeight: '600',
    borderBottom: '2px solid transparent',
    marginBottom: '-2px',
    transition: 'color 0.15s',
  },
  tabActive: {
    color: '#2d5016',
    borderBottom: '2px solid #2d5016',
  },
  content: {
    padding: '16px',
    paddingBottom: '80px',
  },
};

// ---------- Hjälpfunktion ----------
// Samla alla ingredienser från veckans valda rätter
function collectIngredients(meals, allRecipes) {
  const map = {};
  Object.values(meals || {}).forEach(mealName => {
    if (!mealName) return;
    const recipe = allRecipes.find(r => r.name.toLowerCase() === mealName.toLowerCase());
    if (!recipe) return;
    (recipe.ingredients || []).forEach(ing => {
      if (!ing.name.trim()) return;
      if (!map[ing.name]) {
        map[ing.name] = { amount: ing.amount, category: ing.category, sources: [mealName] };
      } else {
        if (!map[ing.name].sources.includes(mealName)) {
          map[ing.name].sources.push(mealName);
        }
      }
    });
  });
  return map;
}

export default function App() {
  // ---------- Session ----------
  const [session, setSession] = useState(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  const [activeTab, setActiveTab] = useState('matsedel');
  const [showActivity, setShowActivity] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [showNewCat, setShowNewCat] = useState(false);
  const [autocomplete, setAutocomplete] = useState({ day: null, results: [] });
  const [newExtraItem, setNewExtraItem] = useState('');
  const [newExtraCat, setNewExtraCat] = useState('');

  // Drag-and-drop state för kategorier
  const dragIndexRef = useRef(null);       // index som dras
  const [dragOverIdx, setDragOverIdx] = useState(null); // index som hovras över

  const { recordPurchase, removePurchase, isLikelyEmpty } = usePurchaseHistory();
  const { state, loading, updateState } = useSharedState(
    session?.roomCode || null,
    session?.name || 'Användare',
    DEFAULT_CATEGORIES
  );

  function handleStart({ name, roomCode, mode }) {
    const sess = { name, roomCode, mode };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sess));
    setSession(sess);
  }

  // Alla recept (inbyggda + anpassade)
  const allRecipes = useMemo(() => {
    if (!state) return DEFAULT_RECIPES;
    const custom = state.customRecipes || [];
    const overrides = state.recipeOverrides || {};
    const hidden = state.hiddenBuiltin || [];
    const base = DEFAULT_RECIPES
      .filter(r => !hidden.includes(r.id))
      .map(r => overrides[r.id] ? { ...r, ...overrides[r.id] } : r);
    return [...base, ...custom];
  }, [state]);

  const categories = useMemo(() => state?.categories || DEFAULT_CATEGORIES, [state]);
  const ingredientMap = useMemo(() => collectIngredients(state?.meals, allRecipes), [state?.meals, allRecipes]);

  // ---------- Matsedel ----------
  function setMeal(day, value) {
    updateState(prev => ({ ...prev, meals: { ...prev.meals, [day]: value } }), `valde "${value || 'ingen rätt'}" till ${day}`);
  }

  function handleMealInput(day, value) {
    setMeal(day, value);
    if (value.length > 0) {
      const results = allRecipes
        .filter(r => r.name.toLowerCase().startsWith(value.toLowerCase()))
        .map(r => r.name)
        .slice(0, 5);
      setAutocomplete({ day, results });
    } else {
      setAutocomplete({ day: null, results: [] });
    }
  }

  function selectAutocomplete(day, name) {
    setMeal(day, name);
    setAutocomplete({ day: null, results: [] });
  }

  // ---------- Handlingslista ----------
  function toggleItem(itemName, category) {
    const isChecked = !!(state?.checkedItems?.[itemName]);
    updateState(
      prev => ({ ...prev, checkedItems: { ...prev.checkedItems, [itemName]: !isChecked } }),
      isChecked ? `ångrade "${itemName}"` : `lade "${itemName}" i korgen`
    );
    if (!isChecked) recordPurchase(itemName, category);
    else removePurchase(itemName);
  }

  function addExtraItem() {
    if (!newExtraItem.trim()) return;
    const item = {
      name: newExtraItem.trim(),
      category: newExtraCat || (categories[0]?.id || 'ovrigt'),
      id: Date.now(),
    };
    updateState(prev => ({ ...prev, extraItems: [...(prev.extraItems || []), item] }), `lade till extra vara "${item.name}"`);
    setNewExtraItem('');
  }

  function removeExtraItem(id) {
    updateState(prev => ({ ...prev, extraItems: (prev.extraItems || []).filter(i => i.id !== id) }));
  }

  // ---------- Recept ----------
  function saveRecipe(updatedRecipe) {
    const isBuiltin = DEFAULT_RECIPES.some(r => r.id === updatedRecipe.id);
    if (isBuiltin) {
      updateState(
        prev => ({ ...prev, recipeOverrides: { ...prev.recipeOverrides, [updatedRecipe.id]: updatedRecipe } }),
        `redigerade receptet "${updatedRecipe.name}"`
      );
    } else if (updatedRecipe.id) {
      updateState(
        prev => ({ ...prev, customRecipes: (prev.customRecipes || []).map(r => r.id === updatedRecipe.id ? updatedRecipe : r) }),
        `uppdaterade receptet "${updatedRecipe.name}"`
      );
    } else {
      const newRecipe = { ...updatedRecipe, id: 'custom_' + Date.now() };
      updateState(
        prev => ({ ...prev, customRecipes: [...(prev.customRecipes || []), newRecipe] }),
        `skapade receptet "${newRecipe.name}"`
      );
    }
    setEditingRecipe(null);
  }

  // ---------- Kategorier: drag-and-drop ----------
  function onDragStart(idx) {
    dragIndexRef.current = idx;
  }

  function onDragOver(e, idx) {
    e.preventDefault();
    setDragOverIdx(idx);
  }

  function onDrop(idx) {
    const from = dragIndexRef.current;
    if (from === null || from === idx) {
      dragIndexRef.current = null;
      setDragOverIdx(null);
      return;
    }
    const cats = [...categories];
    const [moved] = cats.splice(from, 1);
    cats.splice(idx, 0, moved);
    dragIndexRef.current = null;
    setDragOverIdx(null);
    updateState(prev => ({ ...prev, categories: cats }));
  }

  function onDragEnd() {
    dragIndexRef.current = null;
    setDragOverIdx(null);
  }

  function addCategory(cat) {
    updateState(prev => ({ ...prev, categories: [...(prev.categories || DEFAULT_CATEGORIES), cat] }));
    setShowNewCat(false);
  }

  function removeCategory(catId) {
    const hasItems = Object.values(ingredientMap).some(i => i.category === catId) ||
      (state?.extraItems || []).some(i => i.category === catId);
    if (hasItems) {
      alert('Kategorin används av varor och kan inte tas bort.');
      return;
    }
    updateState(prev => ({ ...prev, categories: (prev.categories || DEFAULT_CATEGORIES).filter(c => c.id !== catId) }));
  }

  // ---------- Tidiga returer ----------
  if (!session) return <RoomSetup onStart={handleStart} />;

  if (loading) {
    return (
      <div style={{ ...s.app, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ color: '#2d5016', fontFamily: 'Georgia, serif', fontSize: '18px' }}>Laddar...</p>
      </div>
    );
  }

  const meals = state?.meals || {};
  const checkedItems = state?.checkedItems || {};
  const extraItems = state?.extraItems || [];

  // Varor grupperade per kategori
  const allItemsGrouped = {};
  categories.forEach(cat => { allItemsGrouped[cat.id] = []; });
  Object.entries(ingredientMap).forEach(([name, info]) => {
    const catId = info.category || 'ovrigt';
    if (!allItemsGrouped[catId]) allItemsGrouped[catId] = [];
    allItemsGrouped[catId].push({ name, amount: info.amount, isExtra: false });
  });
  extraItems.forEach(item => {
    const catId = item.category || 'ovrigt';
    if (!allItemsGrouped[catId]) allItemsGrouped[catId] = [];
    allItemsGrouped[catId].push({ name: item.name, amount: '', isExtra: true, id: item.id });
  });

  const totalItems = Object.values(allItemsGrouped).flat().length;
  const checkedCount = Object.values(allItemsGrouped).flat().filter(i => checkedItems[i.name]).length;

  // Varor som troligen är slut hemma
  const likelyEmptyItems = Object.values(allItemsGrouped).flat().filter(item => {
    const catId = ingredientMap[item.name]?.category || item.category;
    const cat = categories.find(c => c.id === catId);
    return cat && isLikelyEmpty(item.name, cat.shelfLife);
  });

  return (
    <div style={s.app}>
      {/* Header */}
      <header style={s.header}>
        <h1 style={s.headerTitle}>Veckoplanen</h1>
        <div style={s.headerRight}>
          {session.roomCode && <span style={s.roomBadge}>{session.roomCode}</span>}
          {session.roomCode && (
            <button style={s.activityBtn} onClick={() => setShowActivity(true)} title="Aktivitetsfeed">📋</button>
          )}
          <button
            style={{ ...s.activityBtn, fontSize: '14px' }}
            onClick={() => { localStorage.removeItem(SESSION_KEY); setSession(null); }}
            title="Byt läge"
          >↩</button>
        </div>
      </header>

      {/* Flikar */}
      <nav style={s.tabs}>
        {[
          { key: 'matsedel', label: '🍽 Matsedel' },
          { key: 'handlingslista', label: '🛒 Handlingslista' },
          { key: 'kategorier', label: '📂 Kategorier' },
        ].map(({ key, label }) => (
          <button
            key={key}
            style={{ ...s.tab, ...(activeTab === key ? s.tabActive : {}) }}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      <main style={s.content}>

        {/* ===== MATSEDEL ===== */}
        {activeTab === 'matsedel' && (
          <div>
            <h2 style={{ fontFamily: 'Georgia, serif', color: '#2d5016', margin: '0 0 16px', fontSize: '22px' }}>
              Veckans matsedel
            </h2>
            {WEEKDAYS.map(day => {
              const dayLabel = day.charAt(0).toUpperCase() + day.slice(1);
              const mealValue = meals[day] || '';
              const isOpen = autocomplete.day === day && autocomplete.results.length > 0;
              const recipe = allRecipes.find(r => r.name.toLowerCase() === mealValue.toLowerCase());

              return (
                <div key={day} style={{ background: '#fff', borderRadius: '12px', padding: '12px 14px', marginBottom: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ minWidth: '80px', fontWeight: '700', color: '#2d5016', fontSize: '14px' }}>{dayLabel}</span>
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
                            <div
                              key={name}
                              style={{ padding: '10px 12px', cursor: 'pointer', fontSize: '15px', borderBottom: '1px solid #f0f7ef' }}
                              onMouseDown={() => selectAutocomplete(day, name)}
                            >
                              {name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {mealValue && (
                      <button
                        style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#6b8f5e', padding: '4px' }}
                        onClick={() => setEditingRecipe(recipe || { id: null, name: mealValue, ingredients: [] })}
                        title="Redigera recept"
                      >✏️</button>
                    )}
                  </div>
                  {recipe && (
                    <div style={{ marginTop: '8px', paddingLeft: '90px' }}>
                      <div style={{ fontSize: '12px', color: '#888', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {(recipe.ingredients || []).slice(0, 5).map((ing, i) => (
                          <span key={i} style={{ background: '#f0f7ef', borderRadius: '4px', padding: '1px 6px' }}>{ing.name}</span>
                        ))}
                        {(recipe.ingredients || []).length > 5 && (
                          <span style={{ color: '#aaa' }}>+{recipe.ingredients.length - 5} till</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <button
              style={{ display: 'block', width: '100%', padding: '12px', marginTop: '8px', background: '#f0f7ef', border: '1.5px dashed #6b8f5e', borderRadius: '10px', color: '#2d5016', fontSize: '15px', cursor: 'pointer' }}
              onClick={() => setEditingRecipe({ id: null, name: '', ingredients: [] })}
            >
              + Skapa nytt recept
            </button>
          </div>
        )}

        {/* ===== HANDLINGSLISTA ===== */}
        {activeTab === 'handlingslista' && (
          <div>
            <h2 style={{ fontFamily: 'Georgia, serif', color: '#2d5016', margin: '0 0 12px', fontSize: '22px' }}>
              Handlingslista
            </h2>

            {/* Framstegsbar */}
            {totalItems > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#6b8f5e', marginBottom: '4px' }}>
                  <span>{checkedCount} av {totalItems} plockat</span>
                  <span>{Math.round((checkedCount / totalItems) * 100)}%</span>
                </div>
                <div style={{ height: '8px', background: '#c8e6c9', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#2d5016', borderRadius: '4px', width: `${(checkedCount / totalItems) * 100}%`, transition: 'width 0.3s' }} />
                </div>
              </div>
            )}

            {/* Varor per kategori */}
            {categories.map(cat => {
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
                          onChange={() => toggleItem(item.name, cat.id)}
                          style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#2d5016' }}
                        />
                        <span style={{ flex: 1, textDecoration: checked ? 'line-through' : 'none', color: checked ? '#aaa' : '#222', fontSize: '15px' }}>
                          {item.name}
                        </span>
                        {item.amount && <span style={{ fontSize: '12px', color: '#888' }}>{item.amount}</span>}
                        {item.isExtra && (
                          <button
                            style={{ background: 'none', border: 'none', color: '#c62828', cursor: 'pointer', fontSize: '16px', padding: '0' }}
                            onClick={() => removeExtraItem(item.id)}
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
                <input
                  style={{ flex: 1, padding: '9px 10px', border: '1.5px solid #c8e6c9', borderRadius: '8px', fontSize: '15px', fontFamily: 'inherit' }}
                  value={newExtraItem}
                  onChange={e => setNewExtraItem(e.target.value)}
                  placeholder="Varunamn"
                  onKeyDown={e => e.key === 'Enter' && addExtraItem()}
                />
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
                onClick={addExtraItem}
              >
                Lägg till
              </button>
            </div>
          </div>
        )}

        {/* ===== KATEGORIER ===== */}
        {activeTab === 'kategorier' && (
          <div>
            <h2 style={{ fontFamily: 'Georgia, serif', color: '#2d5016', margin: '0 0 16px', fontSize: '22px' }}>
              Butiksavdelningar
            </h2>
            <p style={{ color: '#6b8f5e', fontSize: '13px', margin: '0 0 16px' }}>
              Ordningen bestämmer hur varorna sorteras i handlingslistan.
            </p>
            {categories.map((cat, idx) => {
              const isCustom = cat.id.startsWith('custom_');
              const isOver = dragOverIdx === idx;
              return (
                <div
                  key={cat.id}
                  draggable
                  onDragStart={() => onDragStart(idx)}
                  onDragOver={e => onDragOver(e, idx)}
                  onDrop={() => onDrop(idx)}
                  onDragEnd={onDragEnd}
                  style={{
                    display: 'flex', alignItems: 'center',
                    background: '#fff', borderRadius: '10px',
                    padding: '10px 12px', marginBottom: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)', gap: '10px',
                    border: isOver ? '2px solid #2d5016' : '2px solid transparent',
                    transition: 'border-color 0.1s',
                    cursor: 'grab',
                  }}
                >
                  {/* Draghandtag */}
                  <span style={{ color: '#bbb', fontSize: '18px', lineHeight: 1, userSelect: 'none' }}>⠿</span>
                  <span style={{ fontSize: '22px' }}>{cat.emoji}</span>
                  <span style={{ flex: 1, fontSize: '15px', color: '#222' }}>{cat.name}</span>
                  {isCustom && (
                    <button
                      style={{ background: '#ffebee', border: 'none', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', color: '#c62828', fontSize: '14px' }}
                      onClick={() => removeCategory(cat.id)}
                    >×</button>
                  )}
                </div>
              );
            })}

            <button
              style={{ width: '100%', padding: '12px', marginTop: '8px', background: '#f0f7ef', border: '1.5px dashed #6b8f5e', borderRadius: '10px', color: '#2d5016', fontSize: '15px', cursor: 'pointer' }}
              onClick={() => setShowNewCat(v => !v)}
            >
              {showNewCat ? 'Avbryt' : '+ Lägg till kategori'}
            </button>
            {showNewCat && <NewCategoryForm onAdd={addCategory} />}
          </div>
        )}
      </main>

      {/* Modaler */}
      {editingRecipe && (
        <RecipeEditor
          recipe={editingRecipe}
          categories={categories}
          onSave={saveRecipe}
          onClose={() => setEditingRecipe(null)}
        />
      )}

      {showActivity && (
        <ActivityDrawer
          log={state?.activityLog || []}
          onClose={() => setShowActivity(false)}
        />
      )}
    </div>
  );
}
