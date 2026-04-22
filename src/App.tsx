import { useState, lazy, Suspense } from 'react'
import RoomSetup from './components/RoomSetup'
import AuthScreen from './components/AuthScreen'
import ResetPasswordScreen from './components/ResetPasswordScreen'
import ErrorBoundary from './components/ErrorBoundary'
import { useAuth } from './hooks/useAuth'
import { useAppState, getRecentRooms } from './hooks/useAppState'
import type { RecipeDraft, Store } from './types'

const RecipeEditor = lazy(() => import('./components/RecipeEditor'))
const ActivityDrawer = lazy(() => import('./components/ActivityDrawer'))
const StoreEditor = lazy(() => import('./components/StoreEditor'))
const MatsedelTab = lazy(() => import('./components/MatsedelTab'))
const HandlingslistaTab = lazy(() => import('./components/HandlingslistaTab'))
const KategorierTab = lazy(() => import('./components/KategorierTab'))

type StoreDraft = Omit<Store, 'id'> & { id: string | null }

const s = {
  app: { minHeight: '100vh', background: 'var(--clr-bg)', fontFamily: 'system-ui, sans-serif', maxWidth: '600px', margin: '0 auto', position: 'relative' as const },
  header: { background: 'var(--clr-primary)', color: '#fff', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px', position: 'sticky' as const, top: 0, zIndex: 10 },
  headerTitle: { fontFamily: 'Georgia, serif', fontSize: '20px', margin: 0 },
  headerRight: { display: 'flex', alignItems: 'center', gap: '10px' },
  activityBtn: { background: 'none', border: 'none', color: '#fff', fontSize: '22px', cursor: 'pointer', padding: '4px' },
  tabs: { display: 'flex', background: '#fff', borderBottom: '2px solid var(--clr-bg-subtle)', position: 'sticky' as const, top: '56px', zIndex: 9 },
  tab: { flex: 1, padding: '12px 4px', border: 'none', background: 'none', fontSize: '13px', cursor: 'pointer', color: 'var(--clr-secondary)', fontWeight: '600', borderBottom: '2px solid transparent', marginBottom: '-2px', transition: 'color 0.15s' } as React.CSSProperties,
  tabActive: { color: 'var(--clr-primary)', borderBottom: '2px solid var(--clr-primary)' },
  content: { padding: '16px', paddingBottom: '80px' },
}

export default function App() {
  const { user, loading: authLoading, isRecovery, signInWithPassword, signUp, signInWithMagicLink, resetPassword, updatePassword, signInWithGoogle, signOut } = useAuth()

  const app = useAppState(user ?? null)

  const pendingJoinCode = (() => {
    const match = window.location.pathname.match(/^\/join\/([A-Z0-9]{8})$/i)
    return match ? match[1].toUpperCase() : null
  })()

  const [activeTab, setActiveTab] = useState('matsedel')
  const [showActivity, setShowActivity] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<RecipeDraft | null>(null)
  const [editingStore, setEditingStore] = useState<StoreDraft | null>(null)
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem('veckoplanen_onboarded'))

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
      onSignInWithGoogle={signInWithGoogle}
    />
  )

  if (!app.session) return (
    <RoomSetup
      onStart={app.handleStart}
      initialJoinCode={pendingJoinCode}
      recentRooms={getRecentRooms(user.id)}
      recentRoomsKey={`veckoplanen_recent_rooms_${user.id}`}
    />
  )

  if (app.roomNotFound) return (
    <div style={{ ...s.app, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center', padding: '32px 24px', maxWidth: '340px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚪</div>
        <h2 style={{ fontFamily: 'Georgia, serif', color: 'var(--clr-primary)', margin: '0 0 8px' }}>Rummet hittades inte</h2>
        <p style={{ color: 'var(--clr-secondary)', marginBottom: '24px' }}>Rummet <strong>{app.session.roomCode}</strong> verkar inte längre finnas.</p>
        <button
          style={{ padding: '12px 24px', background: 'var(--clr-primary)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '16px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}
          onClick={app.clearRoomNotFound}
        >Välj ett annat rum</button>
      </div>
    </div>
  )

  if (app.loading) return (
    <div style={{ ...s.app, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <p style={{ color: 'var(--clr-primary)', fontFamily: 'Georgia, serif', fontSize: '18px' }}>Laddar...</p>
    </div>
  )

  function handleSaveStore(store: Store) {
    app.saveStore(store)
    setEditingStore(null)
  }

  function handleDeleteStore(storeId: string) {
    app.deleteStore(storeId)
    setEditingStore(null)
  }

  function handleSaveRecipe(recipe: RecipeDraft) {
    app.saveRecipe(recipe)
    setEditingRecipe(null)
  }

  return (
    <div style={s.app}>
      <header style={s.header}>
        <div>
          <h1 style={s.headerTitle}>Veckoplanen</h1>
          {user?.email && (
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)', marginTop: '1px' }}>
              {app.session.name} · {user.email.split('@')[0]}
            </div>
          )}
        </div>
        <div style={s.headerRight}>
          {app.session.roomCode && (
            <button
              onClick={() => {
                const url = `${window.location.origin}/join/${app.session!.roomCode}`
                if (navigator.share) navigator.share({ title: 'Gå med i Veckoplanen', url })
                else navigator.clipboard.writeText(url)
              }}
              title="Bjud in familjen – tryck för att dela länk"
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', color: '#fff', padding: '4px 10px', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.2, gap: '1px' }}
            >
              <span style={{ fontSize: '9px', opacity: 0.75, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Bjud in</span>
              <span style={{ fontFamily: 'monospace', fontSize: '13px', letterSpacing: '1px' }}>{app.session.roomCode}</span>
            </button>
          )}
          {app.session.roomCode && <button style={s.activityBtn} onClick={() => setShowActivity(true)} aria-label="Visa aktivitetsfeed">📋</button>}
          <button style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: '13px', cursor: 'pointer', padding: '5px 10px', borderRadius: '8px' }} onClick={app.handleSwitchRoom} title="Byt rum eller läge">⇄ Byt rum</button>
          <button style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: '13px', cursor: 'pointer', padding: '5px 10px', borderRadius: '8px' }} onClick={() => app.handleSignOut(signOut)}>Logga ut</button>
        </div>
      </header>

      {(app.error || app.syncError) && (
        <div style={{ background: '#fff3e0', borderBottom: '1px solid #ffcc02', padding: '8px 16px', fontSize: '13px', color: 'var(--clr-warning)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ flex: 1 }}>⚠️ Kunde inte synka med servern – ändringar sparas lokalt.</span>
          {app.syncError && <button onClick={app.clearSyncError} style={{ background: 'none', border: 'none', color: 'var(--clr-warning)', cursor: 'pointer', fontSize: '16px', padding: '0 4px', lineHeight: 1 }} title="Stäng">×</button>}
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
        <ErrorBoundary>
          <Suspense fallback={<p style={{ color: 'var(--clr-secondary)', padding: '24px', textAlign: 'center' }}>Laddar...</p>}>
            {activeTab === 'matsedel' && (
              <MatsedelTab meals={app.meals} allRecipes={app.allRecipes} savedMeals={app.savedMeals} currentWeek={app.currentWeek} onSetMeal={app.setMeal} onSaveMealPlan={app.saveMealPlan} onLoadMealPlan={app.loadMealPlan} onEditRecipe={setEditingRecipe} onClearMeals={app.clearMeals} />
            )}
            {activeTab === 'handlingslista' && (
              <HandlingslistaTab
                stores={app.stores} activeStoreId={app.activeStoreId} orderedCategories={app.orderedCategories} allItemsGrouped={app.allItemsGrouped}
                checkedItems={app.checkedItems} totalItems={app.totalItems} checkedCount={app.checkedCount} likelyEmptyItems={app.likelyEmptyItems}
                savedLists={app.savedLists} history={app.purchaseHistory} categories={app.categories} currentWeek={app.currentWeek}
                onToggleItem={app.toggleItem} onRemoveExtraItem={app.removeExtraItem} onAddExtraItem={app.addExtraItem}
                onHideIngredient={app.hideIngredient} onRestoreIngredients={app.restoreIngredients} hiddenCount={app.hiddenIngredients.length}
                onSetActiveStore={app.setActiveStore} onEditStore={setEditingStore} onNewStore={() => setEditingStore({ id: null, name: '', emoji: '🏪', categoryOrder: app.categories.map(c => c.id) })}
                budget={app.budget} weeklySpend={app.weeklySpend}
                onSetBudget={app.setBudget} onSetWeeklySpend={app.setWeeklySpend}
                onSaveWeeklyList={() => app.saveWeeklyList(Object.values(app.allItemsGrouped).flat(), app.meals)}
                onClearChecked={app.clearChecked}
              />
            )}
            {activeTab === 'kategorier' && (
              <KategorierTab categories={app.categories} session={app.session} onReorder={app.handleCatReorder} onAddCategory={app.addCategory} onRemoveCategory={app.removeCategory} onDeleteRoom={() => app.handleDeleteRoom(signOut)} />
            )}
          </Suspense>
        </ErrorBoundary>
      </main>

      <ErrorBoundary>
        <Suspense fallback={null}>
          {editingRecipe && <RecipeEditor recipe={editingRecipe} categories={app.categories} onSave={handleSaveRecipe} onClose={() => setEditingRecipe(null)} />}
          {showActivity && <ActivityDrawer log={app.activityLog} onClose={() => setShowActivity(false)} />}
          {editingStore && <StoreEditor store={editingStore} allCategories={app.categories} onSave={handleSaveStore} onDelete={handleDeleteStore} onClose={() => setEditingStore(null)} />}
        </Suspense>
      </ErrorBoundary>

      {showWelcome && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '28px 24px', maxWidth: '360px', width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontFamily: 'Georgia, serif', color: 'var(--clr-primary)', fontSize: '22px', margin: '0 0 20px', textAlign: 'center' }}>Välkommen! 🌿</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              {[
                { icon: '🍽', title: 'Planera veckan', desc: 'Välj middagar för varje dag under Matsedel-fliken.' },
                { icon: '🛒', title: 'Handla smidigt', desc: 'Ingredienserna samlas automatiskt i Handlingslistan.' },
                ...(app.session?.roomCode ? [{ icon: '👨‍👩‍👧', title: 'Dela med familjen', desc: 'Tryck på Bjud in-knappen i toppen för att bjuda in din partner med en länk.' }] : []),
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
