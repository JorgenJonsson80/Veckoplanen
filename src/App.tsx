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

const TABS = [
  { key: 'matsedel', label: '🍽 Matsedel' },
  { key: 'handlingslista', label: '🛒 Handlingslista' },
  { key: 'kategorier', label: '📂 Kategorier' },
] as const

const Loading = () => (
  <div className="min-h-screen bg-bg max-w-150 mx-auto flex items-center justify-center">
    <p className="text-primary font-serif text-lg">Laddar...</p>
  </div>
)

export default function App() {
  const { user, loading: authLoading, isRecovery, signInWithPassword, signUp, signInWithMagicLink, resetPassword, updatePassword, signInWithGoogle, signOut } = useAuth()
  const app = useAppState(user ?? null)

  const pendingJoinCode = (() => {
    const match = window.location.pathname.match(/^\/join\/([A-Z0-9]{8})$/i)
    return match ? match[1].toUpperCase() : null
  })()

  const [activeTab, setActiveTab] = useState<typeof TABS[number]['key']>('matsedel')
  const [showActivity, setShowActivity] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<RecipeDraft | null>(null)
  const [editingStore, setEditingStore] = useState<StoreDraft | null>(null)
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem('veckoplanen_onboarded'))

  if (authLoading) return <Loading />
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
    <div className="min-h-screen bg-bg max-w-150 mx-auto flex items-center justify-center">
      <div className="text-center px-6 py-8 max-w-85">
        <div className="text-5xl mb-4">🚪</div>
        <h2 className="font-serif text-primary mb-2">Rummet hittades inte</h2>
        <p className="text-secondary mb-6">Rummet <strong>{app.session.roomCode}</strong> verkar inte längre finnas.</p>
        <button className="px-6 py-3 bg-primary text-white border-0 rounded-xl text-base cursor-pointer font-serif" onClick={app.clearRoomNotFound}>
          Välj ett annat rum
        </button>
      </div>
    </div>
  )
  if (app.loading) return <Loading />

  function handleSaveStore(store: Store) { app.saveStore(store); setEditingStore(null) }
  function handleDeleteStore(storeId: string) { app.deleteStore(storeId); setEditingStore(null) }
  function handleSaveRecipe(recipe: RecipeDraft) { app.saveRecipe(recipe); setEditingRecipe(null) }

  return (
    <div className="min-h-screen bg-bg font-sans max-w-150 mx-auto relative">
      <header className="bg-primary text-white px-4 flex items-center justify-between h-14 sticky top-0 z-10">
        <div>
          <h1 className="font-serif text-xl m-0">Veckoplanen</h1>
          {user?.email && (
            <div className="text-[11px] text-white/65 mt-px">
              {app.session.name} · {user.email.split('@')[0]}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          {app.session.roomCode && (
            <button
              onClick={() => {
                const url = `${window.location.origin}/join/${app.session!.roomCode}`
                if (navigator.share) navigator.share({ title: 'Gå med i Veckoplanen', url })
                else navigator.clipboard.writeText(url)
              }}
              title="Bjud in familjen – tryck för att dela länk"
              className="bg-white/20 border-0 cursor-pointer text-white px-2.5 py-1 rounded-xl flex flex-col items-center leading-snug gap-px"
            >
              <span className="text-[9px] opacity-75 tracking-[0.5px] uppercase">Bjud in</span>
              <span className="font-mono text-sm tracking-[1px]">{app.session.roomCode}</span>
            </button>
          )}
          {app.session.roomCode && (
            <button className="bg-transparent border-0 text-white text-[22px] cursor-pointer p-1" onClick={() => setShowActivity(true)} aria-label="Visa aktivitetsfeed">📋</button>
          )}
          <button className="bg-white/15 border-0 text-white text-sm cursor-pointer px-2.5 py-1 rounded-lg" onClick={app.handleSwitchRoom} title="Byt rum eller läge">⇄ Byt rum</button>
          <button className="bg-white/15 border-0 text-white text-sm cursor-pointer px-2.5 py-1 rounded-lg" onClick={() => app.handleSignOut(signOut)}>Logga ut</button>
        </div>
      </header>

      {(app.error || app.syncError) && (
        <div className="bg-[#fff3e0] border-b border-[#ffcc02] px-4 py-2 text-sm text-warning flex items-center gap-2">
          <span className="flex-1">⚠️ Kunde inte synka med servern – ändringar sparas lokalt.</span>
          {app.syncError && (
            <button onClick={app.clearSyncError} className="bg-transparent border-0 text-warning cursor-pointer text-base px-1 leading-none" title="Stäng">×</button>
          )}
        </div>
      )}

      <nav className="flex bg-white border-b-2 border-bg-subtle sticky top-14 z-9">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 py-3 px-1 border-0 bg-transparent text-sm cursor-pointer font-semibold border-b-2 -mb-0.5 transition-colors duration-150 ${activeTab === key ? 'text-primary border-primary' : 'text-secondary border-transparent'}`}
          >{label}</button>
        ))}
      </nav>

      <main className="p-4 pb-20">
        <ErrorBoundary>
          <Suspense fallback={<p className="text-secondary p-6 text-center">Laddar...</p>}>
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
                suggestedRebuys={app.suggestedRebuys}
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
        <div className="fixed inset-0 bg-black/55 z-200 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl px-6 py-7 max-w-90 w-full shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
            <h2 className="font-serif text-primary text-[22px] text-center mb-5">Välkommen! 🌿</h2>
            <div className="flex flex-col gap-4 mb-6">
              {[
                { icon: '🍽', title: 'Planera veckan', desc: 'Välj middagar för varje dag under Matsedel-fliken.' },
                { icon: '🛒', title: 'Handla smidigt', desc: 'Ingredienserna samlas automatiskt i Handlingslistan.' },
                ...(app.session?.roomCode ? [{ icon: '👨‍👩‍👧', title: 'Dela med familjen', desc: 'Tryck på Bjud in-knappen i toppen för att bjuda in din partner med en länk.' }] : []),
              ].map(({ icon, title, desc }) => (
                <div key={title} className="flex gap-3.5 items-start">
                  <span className="text-[26px] leading-none">{icon}</span>
                  <div>
                    <strong className="text-primary text-[15px]">{title}</strong>
                    <p className="mt-0.5 mb-0 text-[#666] text-sm leading-snug">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              className="w-full py-3 bg-primary text-white border-0 rounded-xl text-base cursor-pointer font-serif"
              onClick={() => { localStorage.setItem('veckoplanen_onboarded', '1'); setShowWelcome(false) }}
            >Kom igång!</button>
          </div>
        </div>
      )}
    </div>
  )
}
