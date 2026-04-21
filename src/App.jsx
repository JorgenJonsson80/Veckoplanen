// Veckoplanen – Huvudkomponent
import { useState, useMemo, useEffect } from 'react';
import RoomSetup from './components/RoomSetup';
import AuthScreen from './components/AuthScreen';
import ResetPasswordScreen from './components/ResetPasswordScreen';
import RecipeEditor from './components/RecipeEditor';
import ActivityDrawer from './components/ActivityDrawer';
import StoreEditor from './components/StoreEditor';
import MatsedelTab from './components/MatsedelTab';
import HandlingslistaTab from './components/HandlingslistaTab';
import KategorierTab from './components/KategorierTab';
import { useSharedState, WEEKDAYS } from './hooks/useSharedState';
import { useAuth } from './hooks/useAuth';
import { DEFAULT_CATEGORIES } from './constants/categories';
import { DEFAULT_RECIPES } from './constants/recipes';

// ---------- Hjälpfunktioner (modul-nivå) ----------

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
      } else if (!map[ing.name].sources.includes(mealName)) {
        map[ing.name].sources.push(mealName);
      }
    });
  });
  return map;
}

function getISOWeek(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  return `${d.getFullYear()}-v${weekNum}`;
}

const SESSION_KEY = 'veckoplanen_session';
function recentRoomsKey(userId) {
  return `veckoplanen_recent_rooms_${userId}`;
}

function getRecentRooms(userId) {
  try { return JSON.parse(localStorage.getItem(recentRoomsKey(userId)) || '[]'); }
  catch { return []; }
}

function saveRecentRoom(userId, { name, roomCode, mode }) {
  const key = recentRoomsKey(userId);
  const rooms = getRecentRooms(userId).filter(r => !(r.roomCode === roomCode && r.mode === mode));
  rooms.unshift({ name, roomCode, mode, lastUsed: Date.now() });
  localStorage.setItem(key, JSON.stringify(rooms.slice(0, 5)));
}

// ---------- Stilar ----------
const s = {
  app: {
    minHeight: '100vh', background: '#f0f7ef',
    fontFamily: 'system-ui, sans-serif', maxWidth: '600px',
    margin: '0 auto', position: 'relative',
  },
  header: {
    background: '#2d5016', color: '#fff', padding: '0 16px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    height: '56px', position: 'sticky', top: 0, zIndex: 10,
  },
  headerTitle: { fontFamily: 'Georgia, serif', fontSize: '20px', margin: 0 },
  headerRight: { display: 'flex', alignItems: 'center', gap: '10px' },
  activityBtn: { background: 'none', border: 'none', color: '#fff', fontSize: '22px', cursor: 'pointer', padding: '4px' },
  tabs: {
    display: 'flex', background: '#fff', borderBottom: '2px solid #e8f5e9',
    position: 'sticky', top: '56px', zIndex: 9,
  },
  tab: {
    flex: 1, padding: '12px 4px', border: 'none', background: 'none',
    fontSize: '13px', cursor: 'pointer', color: '#6b8f5e', fontWeight: '600',
    borderBottom: '2px solid transparent', marginBottom: '-2px', transition: 'color 0.15s',
  },
  tabActive: { color: '#2d5016', borderBottom: '2px solid #2d5016' },
  content: { padding: '16px', paddingBottom: '80px' },
};

export default function App() {
  const { user, loading: authLoading, isRecovery, signInWithPassword, signUp, signInWithMagicLink, resetPassword, updatePassword, signOut } = useAuth();

  const pendingJoinCode = (() => {
    const match = window.location.pathname.match(/^\/join\/([A-Z0-9]{8})$/i);
    return match ? match[1].toUpperCase() : null;
  })();

  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
    catch { return null; }
  });
  const [activeTab, setActiveTab] = useState('matsedel');
  const [showActivity, setShowActivity] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [editingStore, setEditingStore] = useState(null);
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem('veckoplanen_onboarded'));

  const { state, loading, error, syncError, clearSyncError, roomNotFound, updateState, deleteRoom } = useSharedState(
    session?.roomCode || null,
    session?.name || 'Användare',
    DEFAULT_CATEGORIES,
    user?.id ?? null,
    session?.mode !== 'join'  // 'join' ska aldrig skapa rum – bara hitta befintliga
  );

  // ---------- Session ----------
  function handleStart(sess) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(sess));
    saveRecentRoom(user.id, sess);
    setSession(sess);
  }

  function handleSignOut() {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    signOut();
  }

  function handleSwitchRoom() {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  }

  async function handleDeleteRoom() {
    const { error: delErr } = await deleteRoom();
    if (delErr) { alert('Kunde inte radera rummet: ' + delErr.message); return; }
    const updated = getRecentRooms(user.id).filter(r => r.roomCode !== session.roomCode);
    localStorage.setItem(recentRoomsKey(user.id), JSON.stringify(updated));
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  }

  // ---------- Derived data ----------
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

  // Computed in useEffect so Date.now() never runs during render
  const [likelyEmptyItems, setLikelyEmptyItems] = useState([]);
  useEffect(() => {
    const now = Date.now();
    const history = state?.purchaseHistory || {};
    const items = [];
    Object.entries(ingredientMap).forEach(([name, info]) => {
      const cat = categories.find(c => c.id === (info.category || 'ovrigt'));
      if (!cat) return;
      const record = history[name];
      if (!record?.lastBought) return;
      if ((now - new Date(record.lastBought).getTime()) / 86400000 > cat.shelfLife) {
        items.push({ name, amount: info.amount, isExtra: false });
      }
    });
    (state?.extraItems || []).forEach(item => {
      const cat = categories.find(c => c.id === (item.category || 'ovrigt'));
      if (!cat) return;
      const record = history[item.name];
      if (!record?.lastBought) return;
      if ((now - new Date(record.lastBought).getTime()) / 86400000 > cat.shelfLife) {
        items.push({ name: item.name, amount: '', isExtra: true, id: item.id });
      }
    });
    setLikelyEmptyItems(items);
  }, [ingredientMap, categories, state?.purchaseHistory, state?.extraItems]);

  // ---------- Matsedel ----------
  function setMeal(day, value) {
    updateState(prev => ({ ...prev, meals: { ...prev.meals, [day]: value } }), `valde "${value || 'ingen rätt'}" till ${day}`);
  }

  function saveMealPlan() {
    if (!WEEKDAYS.some(d => meals[d])) return;
    const weekKey = getISOWeek();
    updateState(
      prev => ({ ...prev, savedMeals: { ...(prev.savedMeals || {}), [weekKey]: { meals: { ...meals }, savedAt: new Date().toISOString() } } }),
      `sparade matsedeln för ${weekKey}`
    );
  }

  function loadMealPlan(weekKey) {
    const saved = (state?.savedMeals || {})[weekKey];
    if (!saved) return;
    updateState(prev => ({ ...prev, meals: { ...saved.meals } }));
  }

  // ---------- Handlingslista ----------
  function toggleItem(itemName, category) {
    const isChecked = !!(state?.checkedItems?.[itemName]);
    updateState(prev => {
      const next = { ...prev, checkedItems: { ...prev.checkedItems, [itemName]: !isChecked } };
      const hist = prev.purchaseHistory || {};
      if (!isChecked) {
        const existing = hist[itemName] || { count: 0 };
        next.purchaseHistory = { ...hist, [itemName]: { lastBought: new Date().toISOString(), count: existing.count + 1, cat: category } };
      } else {
        const existing = hist[itemName];
        if (existing) {
          next.purchaseHistory = { ...hist, [itemName]: { ...existing, count: Math.max(0, existing.count - 1), lastBought: existing.count <= 1 ? null : existing.lastBought } };
        }
      }
      return next;
    }, isChecked ? `ångrade "${itemName}"` : `lade "${itemName}" i korgen`);
  }

  function saveWeeklyList() {
    const weekKey = getISOWeek();
    const allItems = Object.values(allItemsGrouped).flat().map(i => ({ name: i.name, amount: i.amount || '' }));
    updateState(
      prev => ({ ...prev, savedLists: { ...(prev.savedLists || {}), [weekKey]: { items: allItems, meals: { ...meals }, savedAt: new Date().toISOString() } } }),
      `sparade handlingslistan för ${weekKey}`
    );

  }

  function addExtraItem(name, catId) {
    const item = { name, category: catId, id: Date.now() };
    updateState(prev => ({ ...prev, extraItems: [...(prev.extraItems || []), item] }), `lade till extra vara "${name}"`);
  }

  function removeExtraItem(id) {
    updateState(prev => ({ ...prev, extraItems: (prev.extraItems || []).filter(i => i.id !== id) }));
  }

  function clearChecked() {
    updateState(prev => ({ ...prev, checkedItems: {}, weeklySpend: null }), 'rensade handlingslistan');
  }

  function setBudget(value) {
    updateState(prev => ({ ...prev, budget: value }));
  }

  function setWeeklySpend(value) {
    updateState(prev => ({ ...prev, weeklySpend: value }));
  }

  // ---------- Recept ----------
  function saveRecipe(updatedRecipe) {
    const isBuiltin = DEFAULT_RECIPES.some(r => r.id === updatedRecipe.id);
    if (isBuiltin) {
      updateState(prev => ({ ...prev, recipeOverrides: { ...prev.recipeOverrides, [updatedRecipe.id]: updatedRecipe } }), `redigerade receptet "${updatedRecipe.name}"`);
    } else if (updatedRecipe.id) {
      updateState(prev => ({ ...prev, customRecipes: (prev.customRecipes || []).map(r => r.id === updatedRecipe.id ? updatedRecipe : r) }), `uppdaterade receptet "${updatedRecipe.name}"`);
    } else {
      const newRecipe = { ...updatedRecipe, id: 'custom_' + Date.now() };
      updateState(prev => ({ ...prev, customRecipes: [...(prev.customRecipes || []), newRecipe] }), `skapade receptet "${newRecipe.name}"`);
    }
    setEditingRecipe(null);
  }

  // ---------- Kategorier ----------
  function handleCatReorder(newCategories) {
    updateState(prev => ({ ...prev, categories: newCategories }));
  }

  function addCategory(cat) {
    updateState(prev => ({ ...prev, categories: [...(prev.categories || DEFAULT_CATEGORIES), cat] }));
  }

  function removeCategory(catId) {
    const hasItems = Object.values(ingredientMap).some(i => i.category === catId) ||
      (state?.extraItems || []).some(i => i.category === catId);
    if (hasItems) { alert('Kategorin används av varor och kan inte tas bort.'); return; }
    updateState(prev => ({ ...prev, categories: (prev.categories || DEFAULT_CATEGORIES).filter(c => c.id !== catId) }));
  }

  // ---------- Butiker ----------
  function saveStore(store) {
    updateState(prev => {
      const stores = prev.stores || [];
      const exists = stores.some(s => s.id === store.id);
      return { ...prev, stores: exists ? stores.map(s => s.id === store.id ? store : s) : [...stores, store], activeStoreId: prev.activeStoreId || store.id };
    }, `sparade butiken "${store.name}"`);
    setEditingStore(null);
  }

  function deleteStore(storeId) {
    updateState(prev => ({ ...prev, stores: (prev.stores || []).filter(s => s.id !== storeId), activeStoreId: prev.activeStoreId === storeId ? null : prev.activeStoreId }));
    setEditingStore(null);
  }

  function setActiveStore(storeId) {
    updateState(prev => ({ ...prev, activeStoreId: storeId }));
  }

  // ---------- Tidiga returer ----------
  if (authLoading) return (
    <div style={{ ...s.app, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <p style={{ color: '#2d5016', fontFamily: 'Georgia, serif', fontSize: '18px' }}>Laddar...</p>
    </div>
  );

  if (isRecovery) return <ResetPasswordScreen onUpdatePassword={updatePassword} />;

  if (!user) return (
    <AuthScreen
      onSignInWithPassword={signInWithPassword}
      onSignUp={signUp}
      onSignInWithMagicLink={signInWithMagicLink}
      onResetPassword={resetPassword}
    />
  );

  if (!session) return <RoomSetup onStart={handleStart} initialJoinCode={pendingJoinCode} recentRooms={getRecentRooms(user.id)} recentRoomsKey={recentRoomsKey(user.id)} />;

  if (roomNotFound) return (
    <div style={{ ...s.app, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center', padding: '32px 24px', maxWidth: '340px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚪</div>
        <h2 style={{ fontFamily: 'Georgia, serif', color: '#2d5016', margin: '0 0 8px' }}>Rummet hittades inte</h2>
        <p style={{ color: '#6b8f5e', marginBottom: '24px' }}>
          Rummet <strong>{session.roomCode}</strong> verkar inte längre finnas. Det kan ha raderats av den som skapade det.
        </p>
        <button
          style={{ padding: '12px 24px', background: '#2d5016', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '16px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}
          onClick={() => {
            localStorage.removeItem(SESSION_KEY);
            const updated = getRecentRooms(user.id).filter(r => r.roomCode !== session.roomCode);
            localStorage.setItem(recentRoomsKey(user.id), JSON.stringify(updated));
            setSession(null);
          }}
        >
          Välj ett annat rum
        </button>
      </div>
    </div>
  );

  if (loading) return (
    <div style={{ ...s.app, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <p style={{ color: '#2d5016', fontFamily: 'Georgia, serif', fontSize: '18px' }}>Laddar...</p>
    </div>
  );

  // ---------- Data ----------
  const meals = state?.meals || {};
  const checkedItems = state?.checkedItems || {};
  const extraItems = state?.extraItems || [];
  const stores = state?.stores || [];
  const savedLists = state?.savedLists || {};
  const savedMeals = state?.savedMeals || {};
  const activeStoreId = state?.activeStoreId || null;
  const activeStore = stores.find(s => s.id === activeStoreId) || null;
  const currentWeek = getISOWeek();

  const orderedCategories = activeStore
    ? activeStore.categoryOrder
        .map(id => categories.find(c => c.id === id))
        .filter(Boolean)
        .concat(categories.filter(c => !activeStore.categoryOrder.includes(c.id)))
    : categories;

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

  // ---------- Render ----------
  return (
    <div style={s.app}>
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
                if (navigator.share) navigator.share({ title: 'Gå med i Veckoplanen', url });
                else navigator.clipboard.writeText(url);
              }}
              title="Bjud in familjen – tryck för att dela länk"
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', color: '#fff', padding: '4px 10px', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.2, gap: '1px' }}
            >
              <span style={{ fontSize: '9px', opacity: 0.75, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Bjud in</span>
              <span style={{ fontFamily: 'monospace', fontSize: '13px', letterSpacing: '1px' }}>{session.roomCode}</span>
            </button>
          )}
          {session.roomCode && (
            <button style={s.activityBtn} onClick={() => setShowActivity(true)} title="Aktivitetsfeed">📋</button>
          )}
          <button
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: '13px', cursor: 'pointer', padding: '5px 10px', borderRadius: '8px' }}
            onClick={handleSwitchRoom}
            title="Byt rum eller läge"
          >⇄ Byt rum</button>
          <button
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: '13px', cursor: 'pointer', padding: '5px 10px', borderRadius: '8px' }}
            onClick={handleSignOut}
          >Logga ut</button>
        </div>
      </header>

      {(error || syncError) && (
        <div style={{ background: '#fff3e0', borderBottom: '1px solid #ffcc02', padding: '8px 16px', fontSize: '13px', color: '#e65100', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ flex: 1 }}>⚠️ Kunde inte synka med servern – ändringar sparas lokalt.</span>
          {syncError && (
            <button
              onClick={clearSyncError}
              style={{ background: 'none', border: 'none', color: '#e65100', cursor: 'pointer', fontSize: '16px', padding: '0 4px', lineHeight: 1 }}
              title="Stäng"
            >×</button>
          )}
        </div>
      )}

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
          >{label}</button>
        ))}
      </nav>

      <main style={s.content}>
        {activeTab === 'matsedel' && (
          <MatsedelTab
            meals={meals}
            allRecipes={allRecipes}
            savedMeals={savedMeals}
            currentWeek={currentWeek}
            onSetMeal={setMeal}
            onSaveMealPlan={saveMealPlan}
            onLoadMealPlan={loadMealPlan}
            onEditRecipe={setEditingRecipe}
          />
        )}
        {activeTab === 'handlingslista' && (
          <HandlingslistaTab
            stores={stores}
            activeStoreId={activeStoreId}
            orderedCategories={orderedCategories}
            allItemsGrouped={allItemsGrouped}
            checkedItems={checkedItems}
            totalItems={totalItems}
            checkedCount={checkedCount}
            likelyEmptyItems={likelyEmptyItems}
            savedLists={savedLists}
            history={state?.purchaseHistory || {}}
            categories={categories}
            currentWeek={currentWeek}
            onToggleItem={toggleItem}
            onRemoveExtraItem={removeExtraItem}
            onAddExtraItem={addExtraItem}
            onSetActiveStore={setActiveStore}
            onEditStore={setEditingStore}
            onNewStore={() => setEditingStore({ id: null, name: '', emoji: '🏪', categoryOrder: categories.map(c => c.id) })}
            budget={state?.budget ?? null}
            weeklySpend={state?.weeklySpend ?? null}
            onSetBudget={setBudget}
            onSetWeeklySpend={setWeeklySpend}
            onSaveWeeklyList={saveWeeklyList}
            onClearChecked={clearChecked}
          />
        )}
        {activeTab === 'kategorier' && (
          <KategorierTab
            categories={categories}
            session={session}
            onReorder={handleCatReorder}
            onAddCategory={addCategory}
            onRemoveCategory={removeCategory}
            onDeleteRoom={handleDeleteRoom}
          />
        )}
      </main>

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

      {showWelcome && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '28px 24px', maxWidth: '360px', width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontFamily: 'Georgia, serif', color: '#2d5016', fontSize: '22px', margin: '0 0 20px', textAlign: 'center' }}>Välkommen! 🌿</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '26px', lineHeight: 1 }}>🍽</span>
                <div>
                  <strong style={{ color: '#2d5016', fontSize: '15px' }}>Planera veckan</strong>
                  <p style={{ margin: '3px 0 0', color: '#666', fontSize: '13px', lineHeight: 1.4 }}>Välj middagar för varje dag under Matsedel-fliken.</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '26px', lineHeight: 1 }}>🛒</span>
                <div>
                  <strong style={{ color: '#2d5016', fontSize: '15px' }}>Handla smidigt</strong>
                  <p style={{ margin: '3px 0 0', color: '#666', fontSize: '13px', lineHeight: 1.4 }}>Ingredienserna samlas automatiskt i Handlingslistan.</p>
                </div>
              </div>
              {session?.roomCode && (
                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '26px', lineHeight: 1 }}>👨‍👩‍👧</span>
                  <div>
                    <strong style={{ color: '#2d5016', fontSize: '15px' }}>Dela med familjen</strong>
                    <p style={{ margin: '3px 0 0', color: '#666', fontSize: '13px', lineHeight: 1.4 }}>Tryck på <strong>Bjud in</strong>-knappen i toppen för att bjuda in din partner med en länk.</p>
                  </div>
                </div>
              )}
            </div>
            <button
              style={{ width: '100%', padding: '13px', background: '#2d5016', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '16px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}
              onClick={() => { localStorage.setItem('veckoplanen_onboarded', '1'); setShowWelcome(false); }}
            >Kom igång!</button>
          </div>
        </div>
      )}
    </div>
  );
}
