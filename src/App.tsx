import { useState, useMemo, lazy, Suspense } from 'react'
import RoomSetup from './components/RoomSetup'
import AuthScreen from './components/AuthScreen'
import ResetPasswordScreen from './components/ResetPasswordScreen'
import { useSharedState } from './hooks/useSharedState'
import { useAuth } from './hooks/useAuth'
import { useRecipes } from './hooks/useRecipes'
import { useMealPlan } from './hooks/useMealPlan'
import { useShoppingList } from './hooks/useShoppingList'
import { DEFAULT_CATEGORIES } from './constants/categories'
import { getISOWeek } from './utils/date'
import { buildIngredientMap } from './utils/ingredients'
import type { Session, Category, Store, ShoppingListItem, RecipeDraft } from './types'

const RecipeEditor = lazy(() => import('./components/RecipeEditor'))
const ActivityDrawer = lazy(() => import('./components/ActivityDrawer'))
const StoreEditor = lazy(() => import('./components/StoreEditor'))
const MatsedelTab = lazy(() => import('./components/MatsedelTab'))
const HandlingslistaTab = lazy(() => import('./components/HandlingslistaTab'))
const KategorierTab = lazy(() => import('./components/KategorierTab'))

type StoreDraft = Omit<Store, 'id'> & { id: string | null }

const SESSION_KEY = 'veckoplanen_session'

function recentRoomsKey(userId: string): string {
  return `veckoplanen_recent_rooms_${userId}`
}

function getRecentRooms(userId: string): Session[] {
  try { return JSON.parse(localStorage.getItem(recentRoomsKey(userId)) || '[]') }
  catch { return [] }
}

function saveRecentRoom(userId: string, sess: Session) {
  const key = recentRoomsKey(userId)
  const rooms = getRecentRooms(userId).filter(r => !(r.roomCode === sess.roomCode && r.mode === sess.mode))
  rooms.unshift({ ...sess, lastUsed: Date.now() })
  localStorage.setItem(key, JSON.stringify(rooms.slice(0, 5)))
}

const s = {
  app: { minHeight: '100vh', background: 'var(--clr-bg)', fontFamily: 'system-ui, sans-serif', maxWidth: '600px', margin: '0 auto', position: 'relative' as const },
  header: { background: 'var(--clr-primary)', color: '#fff', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px', position: 'sticky' as const, top: 0, zIndex: 10 },
  headerTitle: { fontFamily: 'Georgia, serif', fontSize: '20px', margin: 0 },
  headerRight: { display: 'flex', alignItems: 'center', gap: '10px' },
  activityBtn: { background: 'none', border: 'none', color: '#fff', fontSize: '22px', cursor: 'pointer', padding: '4px' },
  tabs: { display: 'flex', background: '#fff', borderBottom: '2px solid #e8f5e9', position: 'sticky' as const, top: '56px', zIndex: 9 },
  tab: { flex: 1, padding: '12px 4px', border: 'none', background: 'none', fontSize: '13px', cursor: 'pointer', color: 'var(--clr-secondary)', fontWeight: '600', borderBottom: '2px solid transparent', marginBottom: '-2px', transition: 'color 0.15s' } as React.CSSProperties,
  tabActive: { color: 'var(--clr-primary)', borderBottom: '2px solid #2d5016' },
  content: { padding: '16px', paddingBottom: '80px' },
}

export default function App() {
  const { user, loading: authLoading, isRecovery, signInWithPassword, signUp, signInWithMagicLink, resetPassword, updatePassword, signOut } = useAuth()

  const pendingJoinCode = (() => {
    const match = window.location.pathname.match(/^\/join\/([A-Z0-9]{8})$/i)
    return match ? match[1].toUpperCase() : null
  })()

  const [session, setSession] = useState<Session | null>(() => {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null') }
    catch { return null }
  })
  const [activeTab, setActiveTab] = useState('matsedel')
  const [showActivity, setShowActivity] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<RecipeDraft | null>(null)
  const [editingStore, setEditingStore] = useState<StoreDraft | null>(null)
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem('veckoplanen_onboarded'))

  const { state, loading, error, syncError, clearSyncError, roomNotFound, updateState, deleteRoom } = useSharedState(
    session?.roomCode ?? null,
    session?.name ?? 'Användare',
    DEFAULT_CATEGORIES,
    user?.id ?? null,
    session?.mode !== 'join'
  )

  function handleStart(sess: Session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(sess))
    if (user?.id) saveRecentRoom(user.id, sess)
    setSession(sess)
  }

  function handleSignOut() {
    localStorage.removeItem(SESSION_KEY)
    setSession(null)
    signOut()
  }

  function handleSwitchRoom() {
    localStorage.removeItem(SESSION_KEY)
    setSession(null)
  }

  async function handleDeleteRoom() {
    const { error: delErr } = await deleteRoom()
    if (delErr) { alert('Kunde inte radera rummet: ' + (delErr as Error).message); return }
    if (user?.id && session?.roomCode) {
      const updated = getRecentRooms(user.id).filter(r => r.roomCode !== session.roomCode)
      localStorage.setItem(recentRoomsKey(user.id), JSON.stringify(updated))
    }
    localStorage.removeItem(SESSION_KEY)
    setSession(null)
  }

  const { allRecipes, saveRecipe: saveRecipeData } = useRecipes(state, updateState)
  const categories = useMemo((): Category[] => state?.categories ?? DEFAULT_CATEGORIES, [state])

  const ingredientMap = useMemo(
    () => buildIngredientMap(state?.meals ?? {}, allRecipes),
    [state?.meals, allRecipes]
  )

  const { meals, savedMeals, setMeal, saveMealPlan, loadMealPlan, clearMeals } = useMealPlan(state, updateState)
  const { likelyEmptyItems, toggleItem, saveWeeklyList, addExtraItem, removeExtraItem, clearChecked, setBudget, setWeeklySpend } = useShoppingList(state, updateState, ingredientMap, categories)

  function saveRecipe(updatedRecipe: RecipeDraft) {
    saveRecipeData(updatedRecipe)
    setEditingRecipe(null)
  }

  function handleCatReorder(newCategories: Category[]) {
    updateState(prev => ({ ...prev, categories: newCategories }))
  }

  function addCategory(cat: Category) {
    updateState(prev => ({ ...prev, categories: [...(prev.categories ?? DEFAULT_CATEGORIES), cat] }))
  }

  function removeCategory(catId: string) {
    const hasItems = Object.values(ingredientMap).some(i => i.category === catId) || (state?.extraItems ?? []).some(i => i.category === catId)
    if (hasItems) { alert('Kategorin används av varor och kan inte tas bort.'); return }
    updateState(prev => ({ ...prev, categories: (prev.categories ?? DEFAULT_CATEGORIES).filter(c => c.id !== catId) }))
  }

  function saveStore(store: Store) {
    updateState(prev => {
      const stores = prev.stores ?? []
      const exists = stores.some(s => s.id === store.id)
      return { ...prev, stores: exists ? stores.map(s => s.id === store.id ? store : s) : [...stores, store], activeStoreId: prev.activeStoreId ?? store.id }
    }, `sparade butiken "${store.name}"`)
    setEditingStore(null)
  }

  function deleteStore(storeId: string) {
    updateState(prev => ({ ...prev, stores: (prev.stores ?? []).filter(s => s.id !== storeId), activeStoreId: prev.activeStoreId === storeId ? null : prev.activeStoreId }))
    setEditingStore(null)
  }

  function setActiveStore(storeId: string | null) {
    updateState(prev => ({ ...prev, activeStoreId: storeId }))
  }

  if (authLoading) return (
    <div style={{ ...s.app, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <p style={{ color: 'var(--clr-primary)', fontFamily: 'Georgia, serif', fontSize: '18px' }}>Laddar...</p>
    </div>
  )

  if (isRecovery) return <ResetPasswordScreen onUpdatePassword={updatePassword} />

  if (!user) return (
    <AuthScreen
      onSignInWithPassword={signInWithPassword}
      onSignUp={signUp}
      onSignInWithMagicLink={signInWithMagicLink}
      onResetPassword={resetPassword}
    />
  )

  if (!session) return (
    <RoomSetup
      onStart={handleStart}
      initialJoinCode={pendingJoinCode}
      recentRooms={getRecentRooms(user.id)}
      recentRoomsKey={recentRoomsKey(user.id)}
    />
  )

  if (roomNotFound) return (
    <div style={{ ...s.app, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center', padding: '32px 24px', maxWidth: '340px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚪</div>
        <h2 style={{ fontFamily: 'Georgia, serif', color: 'var(--clr-primary)', margin: '0 0 8px' }}>Rummet hittades inte</h2>
        <p style={{ color: 'var(--clr-secondary)', marginBottom: '24px' }}>Rummet <strong>{session.roomCode}</strong> verkar inte längre finnas.</p>
        <button
          style={{ padding: '12px 24px', background: 'var(--clr-primary)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '16px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}
          onClick={() => {
            localStorage.removeItem(SESSION_KEY)
            if (user?.id && session.roomCode) {
              const updated = getRecentRooms(user.id).filter(r => r.roomCode !== session.roomCode)
              localStorage.setItem(recentRoomsKey(user.id), JSON.stringify(updated))
            }
            setSession(null)
          }}
        >Välj ett annat rum</button>
      </div>
    </div>
  )

  if (loading) return (
    <div style={{ ...s.app, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <p style={{ color: 'var(--clr-primary)', fontFamily: 'Georgia, serif', fontSize: '18px' }}>Laddar...</p>
    </div>
  )

  const checkedItems = state?.checkedItems ?? {}
  const extraItems = state?.extraItems ?? []
  const stores = state?.stores ?? []
  const savedLists = state?.savedLists ?? {}
  const activeStoreId = state?.activeStoreId ?? null
  const activeStore = stores.find(s => s.id === activeStoreId) ?? null
  const currentWeek = getISOWeek()

  const orderedCategories: Category[] = activeStore
    ? activeStore.categoryOrder.map(id => categories.find(c => c.id === id)).filter((c): c is Category => c !== undefined).concat(categories.filter(c => !activeStore.categoryOrder.includes(c.id)))
    : categories

  const allItemsGrouped: Record<string, ShoppingListItem[]> = {}
  orderedCategories.forEach(cat => { allItemsGrouped[cat.id] = [] })
  Object.entries(ingredientMap).forEach(([name, info]) => {
    const catId = info.category || 'ovrigt'
    if (!allItemsGrouped[catId]) allItemsGrouped[catId] = []
    allItemsGrouped[catId].push({ name, amount: info.amount, isExtra: false })
  })
  extraItems.forEach(item => {
    const catId = item.category || 'ovrigt'
    if (!allItemsGrouped[catId]) allItemsGrouped[catId] = []
    allItemsGrouped[catId].push({ name: item.name, amount: '', isExtra: true, id: item.id })
  })

  const totalItems = Object.values(allItemsGrouped).flat().length
  const checkedCount = Object.values(allItemsGrouped).flat().filter(i => checkedItems[i.name]).length

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
                const url = `${window.location.origin}/join/${session.roomCode}`
                if (navigator.share) navigator.share({ title: 'Gå med i Veckoplanen', url })
                else navigator.clipboard.writeText(url)
              }}
              title="Bjud in familjen – tryck för att dela länk"
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', color: '#fff', padding: '4px 10px', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.2, gap: '1px' }}
            >
              <span style={{ fontSize: '9px', opacity: 0.75, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Bjud in</span>
              <span style={{ fontFamily: 'monospace', fontSize: '13px', letterSpacing: '1px' }}>{session.roomCode}</span>
            </button>
          )}
          {session.roomCode && <button style={s.activityBtn} onClick={() => setShowActivity(true)} title="Aktivitetsfeed">📋</button>}
          <button style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: '13px', cursor: 'pointer', padding: '5px 10px', borderRadius: '8px' }} onClick={handleSwitchRoom} title="Byt rum eller läge">⇄ Byt rum</button>
          <button style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: '13px', cursor: 'pointer', padding: '5px 10px', borderRadius: '8px' }} onClick={handleSignOut}>Logga ut</button>
        </div>
      </header>

      {(error || syncError) && (
        <div style={{ background: '#fff3e0', borderBottom: '1px solid #ffcc02', padding: '8px 16px', fontSize: '13px', color: 'var(--clr-warning)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ flex: 1 }}>⚠️ Kunde inte synka med servern – ändringar sparas lokalt.</span>
          {syncError && <button onClick={clearSyncError} style={{ background: 'none', border: 'none', color: 'var(--clr-warning)', cursor: 'pointer', fontSize: '16px', padding: '0 4px', lineHeight: 1 }} title="Stäng">×</button>}
        </div>
      )}

      <nav style={s.tabs}>
        {([
          { key: 'matsedel', label: '🍽 Matsedel' },
          { key: 'handlingslista', label: '🛒 Handlingslista' },
          { key: 'kategorier', label: '📂 Kategorier' },
        ] as const).map(({ key, label }) => (
          <button key={key} style={{ ...s.tab, ...(activeTab === key ? s.tabActive : {}) }} onClick={() => setActiveTab(key)}>{label}</button>
        ))}
      </nav>

      <main style={s.content}>
        <Suspense fallback={<p style={{ color: 'var(--clr-secondary)', padding: '24px', textAlign: 'center' }}>Laddar...</p>}>
          {activeTab === 'matsedel' && (
            <MatsedelTab meals={meals} allRecipes={allRecipes} savedMeals={savedMeals} currentWeek={currentWeek} onSetMeal={setMeal} onSaveMealPlan={saveMealPlan} onLoadMealPlan={loadMealPlan} onEditRecipe={setEditingRecipe} onClearMeals={clearMeals} />
          )}
          {activeTab === 'handlingslista' && (
            <HandlingslistaTab
              stores={stores} activeStoreId={activeStoreId} orderedCategories={orderedCategories} allItemsGrouped={allItemsGrouped}
              checkedItems={checkedItems} totalItems={totalItems} checkedCount={checkedCount} likelyEmptyItems={likelyEmptyItems}
              savedLists={savedLists} history={state?.purchaseHistory ?? {}} categories={categories} currentWeek={currentWeek}
              onToggleItem={toggleItem} onRemoveExtraItem={removeExtraItem} onAddExtraItem={addExtraItem}
              onSetActiveStore={setActiveStore} onEditStore={setEditingStore} onNewStore={() => setEditingStore({ id: null, name: '', emoji: '🏪', categoryOrder: categories.map(c => c.id) })}
              budget={state?.budget ?? null} weeklySpend={state?.weeklySpend ?? null}
              onSetBudget={setBudget} onSetWeeklySpend={setWeeklySpend}
              onSaveWeeklyList={() => saveWeeklyList(Object.values(allItemsGrouped).flat(), meals)}
              onClearChecked={clearChecked}
            />
          )}
          {activeTab === 'kategorier' && (
            <KategorierTab categories={categories} session={session} onReorder={handleCatReorder} onAddCategory={addCategory} onRemoveCategory={removeCategory} onDeleteRoom={handleDeleteRoom} />
          )}
        </Suspense>
      </main>

      <Suspense fallback={null}>
        {editingRecipe && <RecipeEditor recipe={editingRecipe} categories={categories} onSave={saveRecipe} onClose={() => setEditingRecipe(null)} />}
        {showActivity && <ActivityDrawer log={state?.activityLog ?? []} onClose={() => setShowActivity(false)} />}
        {editingStore && <StoreEditor store={editingStore} allCategories={categories} onSave={saveStore} onDelete={deleteStore} onClose={() => setEditingStore(null)} />}
      </Suspense>

      {showWelcome && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '28px 24px', maxWidth: '360px', width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontFamily: 'Georgia, serif', color: 'var(--clr-primary)', fontSize: '22px', margin: '0 0 20px', textAlign: 'center' }}>Välkommen! 🌿</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              {[
                { icon: '🍽', title: 'Planera veckan', desc: 'Välj middagar för varje dag under Matsedel-fliken.' },
                { icon: '🛒', title: 'Handla smidigt', desc: 'Ingredienserna samlas automatiskt i Handlingslistan.' },
                ...(session?.roomCode ? [{ icon: '👨‍👩‍👧', title: 'Dela med familjen', desc: 'Tryck på Bjud in-knappen i toppen för att bjuda in din partner med en länk.' }] : []),
              ].map(({ icon, title, desc }) => (
                <div key={title} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '26px', lineHeight: 1 }}>{icon}</span>
                  <div>
                    <strong style={{ color: 'var(--clr-primary)', fontSize: '15px' }}>{title}</strong>
                    <p style={{ margin: '3px 0 0', color: '#666', fontSize: '13px', lineHeight: 1.4 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <button style={{ width: '100%', padding: '13px', background: 'var(--clr-primary)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '16px', cursor: 'pointer', fontFamily: 'Georgia, serif' }} onClick={() => { localStorage.setItem('veckoplanen_onboarded', '1'); setShowWelcome(false) }}>Kom igång!</button>
          </div>
        </div>
      )}
    </div>
  )
}
