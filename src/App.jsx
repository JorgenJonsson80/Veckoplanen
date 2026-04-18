// Veckoplanen – Huvudkomponent
import { useState, useMemo } from 'react';
import {
  DndContext, closestCenter, PointerSensor,
  KeyboardSensor, useSensor, useSensors, DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable,
  verticalListSortingStrategy, arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import RoomSetup from './components/RoomSetup';
import AuthScreen from './components/AuthScreen';
import ResetPasswordScreen from './components/ResetPasswordScreen';
import RecipeEditor from './components/RecipeEditor';
import ActivityDrawer from './components/ActivityDrawer';
import NewCategoryForm from './components/NewCategoryForm';
import StoreEditor from './components/StoreEditor';
import { useSharedState, WEEKDAYS } from './hooks/useSharedState';
import { usePurchaseHistory } from './hooks/usePurchaseHistory';
import { useAuth } from './hooks/useAuth';
import { DEFAULT_CATEGORIES } from './constants/categories';
import { DEFAULT_RECIPES } from './constants/recipes';

// ---------- Drag-and-drop helpers (module level – hooks kräver egna komponenter) ----------

function SortableCatItem({ cat, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat.id });
  const isCustom = cat.id.startsWith('custom_');
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      style={{
        display: 'flex', alignItems: 'center',
        background: '#fff', borderRadius: '10px',
        padding: '10px 12px', marginBottom: '8px',
        boxShadow: isDragging ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
        gap: '10px', userSelect: 'none',
        border: '2px solid transparent',
        transform: CSS.Transform.toString(transform),
        transition: transition || 'transform 200ms ease',
        opacity: isDragging ? 0.3 : 1,
      }}
    >
      {/* Bara handtaget startar drag – resten av raden scrollar normalt */}
      <span
        {...listeners}
        style={{ color: '#bbb', fontSize: '22px', lineHeight: 1, padding: '4px 6px', cursor: 'grab', touchAction: 'none' }}
      >⠿</span>
      <span style={{ fontSize: '22px' }}>{cat.emoji}</span>
      <span style={{ flex: 1, fontSize: '15px', color: '#222' }}>{cat.name}</span>
      {isCustom && (
        <button
          style={{ background: '#ffebee', border: 'none', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', color: '#c62828', fontSize: '14px' }}
          onClick={() => onRemove(cat.id)}
        >×</button>
      )}
    </div>
  );
}

function CatDragGhost({ cat }) {
  const isCustom = cat.id.startsWith('custom_');
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      background: '#fff', borderRadius: '10px',
      padding: '10px 12px',
      boxShadow: '0 12px 32px rgba(45,80,22,0.25)',
      gap: '10px', cursor: 'grabbing', userSelect: 'none',
      border: '2px solid #2d5016',
    }}>
      <span style={{ color: '#bbb', fontSize: '18px', lineHeight: 1 }}>⠿</span>
      <span style={{ fontSize: '22px' }}>{cat.emoji}</span>
      <span style={{ flex: 1, fontSize: '15px', color: '#222' }}>{cat.name}</span>
      {isCustom && <span style={{ width: 31 }} />}
    </div>
  );
}

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
  // ---------- Auth ----------
  const { user, loading: authLoading, isRecovery, signInWithPassword, signUp, signInWithMagicLink, resetPassword, updatePassword, signOut } = useAuth();

  // Detektera inbjudningslänk: /join/ERIK7
  const pendingJoinCode = (() => {
    const match = window.location.pathname.match(/^\/join\/([A-Z0-9]{5})$/i);
    return match ? match[1].toUpperCase() : null;
  })();

  // ---------- Rumsession (vem du är + vilket rum) ----------
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
  const [editingStore, setEditingStore] = useState(null); // null | store-objekt
  const [autocomplete, setAutocomplete] = useState({ day: null, results: [] });
  const [newExtraItem, setNewExtraItem] = useState('');
  const [newExtraCat, setNewExtraCat] = useState('');

  const [activeCatId, setActiveCatId] = useState(null);

  const catSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const { history, recordPurchase, removePurchase, isLikelyEmpty } = usePurchaseHistory();

  // Autocomplete-förslag för extra varor
  const [extraSuggestions, setExtraItemSuggestions] = useState([]);
  const { state, loading, error, updateState } = useSharedState(
    session?.roomCode || null,
    session?.name || 'Användare',
    DEFAULT_CATEGORIES
  );

  function handleStart({ name, roomCode, mode }) {
    const sess = { name, roomCode, mode };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sess));
    setSession(sess);
  }

  function handleSignOut() {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    signOut();
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

  // Beräkna ISO-veckonummer som sträng, t.ex. "2026-v16"
  function getISOWeek(date = new Date()) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    return `${d.getFullYear()}-v${weekNum}`;
  }

  // Spara veckans handlingslista med veckonummer
  function saveWeeklyList() {
    const weekKey = getISOWeek();
    const allItems = Object.values(allItemsGrouped).flat().map(i => ({ name: i.name, amount: i.amount || '' }));
    updateState(
      prev => ({
        ...prev,
        savedLists: {
          ...(prev.savedLists || {}),
          [weekKey]: { items: allItems, meals: { ...meals }, savedAt: new Date().toISOString() },
        },
      }),
      `sparade handlingslistan för ${weekKey}`
    );
    alert(`Lista sparad för ${weekKey}!`);
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
    setExtraItemSuggestions([]);
  }

  // Filtrera historiken för autocomplete i extra-varor-fältet
  function handleExtraItemInput(value) {
    setNewExtraItem(value);
    if (value.length >= 1) {
      const suggestions = Object.keys(history)
        .filter(n => n.toLowerCase().startsWith(value.toLowerCase()))
        .sort((a, b) => (history[b].count || 0) - (history[a].count || 0)) // vanligaste först
        .slice(0, 5);
      setExtraItemSuggestions(suggestions);
    } else {
      setExtraItemSuggestions([]);
    }
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

  // ---------- Kategorier: drag-and-drop med dnd-kit ----------
  function handleCatDragEnd({ active, over }) {
    setActiveCatId(null);
    if (!over || active.id === over.id) return;
    const oldIndex = categories.findIndex(c => c.id === active.id);
    const newIndex = categories.findIndex(c => c.id === over.id);
    updateState(prev => ({ ...prev, categories: arrayMove(categories, oldIndex, newIndex) }));
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

  // ---------- Butiker ----------
  function saveStore(store) {
    updateState(prev => {
      const stores = prev.stores || [];
      const exists = stores.some(s => s.id === store.id);
      return {
        ...prev,
        stores: exists ? stores.map(s => s.id === store.id ? store : s) : [...stores, store],
        activeStoreId: prev.activeStoreId || store.id,
      };
    }, `sparade butiken "${store.name}"`);
    setEditingStore(null);
  }

  function deleteStore(storeId) {
    updateState(prev => ({
      ...prev,
      stores: (prev.stores || []).filter(s => s.id !== storeId),
      activeStoreId: prev.activeStoreId === storeId ? null : prev.activeStoreId,
    }));
    setEditingStore(null);
  }

  function setActiveStore(storeId) {
    updateState(prev => ({ ...prev, activeStoreId: storeId }));
  }

  // ---------- Tidiga returer ----------

  // Vänta på att auth-status är klar
  if (authLoading) {
    return (
      <div style={{ ...s.app, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ color: '#2d5016', fontFamily: 'Georgia, serif', fontSize: '18px' }}>Laddar...</p>
      </div>
    );
  }

  // Ej inloggad – visa magic link-skärmen
  // Lösenordsåterställning – visas när användaren klickat länken i mailet
  if (isRecovery) return <ResetPasswordScreen onUpdatePassword={updatePassword} />;

  if (!user) return (
    <AuthScreen
      onSignInWithPassword={signInWithPassword}
      onSignUp={signUp}
      onSignInWithMagicLink={signInWithMagicLink}
      onResetPassword={resetPassword}
    />
  );

  // Inloggad men inget rum valt ännu
  if (!session) return <RoomSetup onStart={handleStart} initialJoinCode={pendingJoinCode} />;

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
  const stores = state?.stores || [];
  const activeStoreId = state?.activeStoreId || null;

  // Aktiv butik bestämmer kategoriordningen – annars global ordning
  const activeStore = stores.find(s => s.id === activeStoreId) || null;
  const orderedCategories = activeStore
    ? activeStore.categoryOrder
        .map(id => categories.find(c => c.id === id))
        .filter(Boolean)
        // Lägg till eventuella nya kategorier som saknas i butikens ordning
        .concat(categories.filter(c => !activeStore.categoryOrder.includes(c.id)))
    : categories;

  // Varor grupperade per kategori (i butikens ordning)
  const allItemsGrouped = {};
  orderedCategories.forEach(cat => { allItemsGrouped[cat.id] = []; });
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
        <div>
          <h1 style={s.headerTitle}>Veckoplanen</h1>
          {user?.email && (
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)', marginTop: '1px' }}>
              {session.name} · {user.email.split('@')[0]}
            </div>
          )}
        </div>
        <div style={s.headerRight}>
          {session.roomCode && (
            <button
              onClick={() => {
                const url = `${window.location.origin}/join/${session.roomCode}`;
                if (navigator.share) {
                  navigator.share({ title: 'Gå med i Veckoplanen', url });
                } else {
                  navigator.clipboard.writeText(url);
                }
              }}
              title="Dela inbjudningslänk"
              style={{ ...s.roomBadge, background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', color: '#fff', fontFamily: 'monospace', fontSize: '13px', letterSpacing: '1px', padding: '3px 10px', borderRadius: '12px' }}
            >
              {session.roomCode}
            </button>
          )}
          {session.roomCode && (
            <button style={s.activityBtn} onClick={() => setShowActivity(true)} title="Aktivitetsfeed">📋</button>
          )}
          <button
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: '13px', cursor: 'pointer', padding: '5px 10px', borderRadius: '8px' }}
            onClick={handleSignOut}
          >Logga ut</button>
        </div>
      </header>

      {/* Felbanderoll – visas om Supabase-synken misslyckas */}
      {error && (
        <div style={{ background: '#fff3e0', borderBottom: '1px solid #ffcc02', padding: '8px 16px', fontSize: '13px', color: '#e65100', display: 'flex', alignItems: 'center', gap: '8px' }}>
          ⚠️ Kunde inte synka med servern – ändringar sparas lokalt tills uppkopplingen är tillbaka.
        </div>
      )}

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

            {/* Butiksväljare */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '16px', paddingBottom: '2px' }}>
              {/* Standard – ingen butik */}
              <button
                onClick={() => setActiveStore(null)}
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
                  onClick={() => setActiveStore(store.id)}
                  onDoubleClick={() => setEditingStore(store)}
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
                      onClick={e => { e.stopPropagation(); setEditingStore(store); }}
                      style={{ fontSize: '12px', opacity: 0.8 }}
                    >✏️</span>
                  )}
                </button>
              ))}

              {/* Ny butik */}
              <button
                onClick={() => setEditingStore({ id: null, name: '', emoji: '🏪', categoryOrder: categories.map(c => c.id) })}
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
                      onClick={saveWeeklyList}
                      title={`Spara lista för ${getISOWeek()}`}
                      style={{ background: '#f0f7ef', border: '1px solid #c8e6c9', borderRadius: '6px', padding: '3px 8px', fontSize: '12px', color: '#2d5016', cursor: 'pointer' }}
                    >
                      💾 {getISOWeek()}
                    </button>
                  </div>
                </div>
                <div style={{ height: '8px', background: '#c8e6c9', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#2d5016', borderRadius: '4px', width: `${(checkedCount / totalItems) * 100}%`, transition: 'width 0.3s' }} />
                </div>
              </div>
            )}

            {/* Varor per kategori – i aktiv butiks ordning */}
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
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    style={{ width: '100%', padding: '9px 10px', border: '1.5px solid #c8e6c9', borderRadius: '8px', fontSize: '15px', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    value={newExtraItem}
                    onChange={e => handleExtraItemInput(e.target.value)}
                    onBlur={() => setTimeout(() => setExtraItemSuggestions([]), 150)}
                    placeholder="Varunamn"
                    onKeyDown={e => e.key === 'Enter' && addExtraItem()}
                  />
                  {/* Autocomplete-dropdown från historiken */}
                  {extraSuggestions.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1.5px solid #c8e6c9', borderRadius: '0 0 8px 8px', zIndex: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                      {extraSuggestions.map(name => (
                        <div
                          key={name}
                          style={{ padding: '9px 12px', cursor: 'pointer', fontSize: '15px', borderBottom: '1px solid #f0f7ef', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                          onMouseDown={() => { setNewExtraItem(name); setExtraItemSuggestions([]); }}
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
            <DndContext
              sensors={catSensors}
              collisionDetection={closestCenter}
              onDragStart={({ active }) => setActiveCatId(active.id)}
              onDragEnd={handleCatDragEnd}
              onDragCancel={() => setActiveCatId(null)}
            >
              <SortableContext items={categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
                {categories.map(cat => (
                  <SortableCatItem key={cat.id} cat={cat} onRemove={removeCategory} />
                ))}
              </SortableContext>
              <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
                {activeCatId && <CatDragGhost cat={categories.find(c => c.id === activeCatId)} />}
              </DragOverlay>
            </DndContext>

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

      {editingStore && (
        <StoreEditor
          store={editingStore}
          allCategories={categories}
          onSave={saveStore}
          onDelete={deleteStore}
          onClose={() => setEditingStore(null)}
        />
      )}
    </div>
  );
}
