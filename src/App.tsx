import { useState, lazy, Suspense } from 'react'
import RoomSetup from './components/RoomSetup'
import AuthScreen from './components/AuthScreen'
import ResetPasswordScreen from './components/ResetPasswordScreen'
import ErrorBoundary from './components/ErrorBoundary'
import Header from './components/Header'
import Tabs, { type TabKey } from './components/Tabs'
import Onboarding from './components/Onboarding'
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

  const [activeTab, setActiveTab] = useState<TabKey>('matsedel')
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
  function handleStartOnboarding() {
    localStorage.setItem('veckoplanen_onboarded', '1')
    setActiveTab('matsedel')
    setShowWelcome(false)
  }

  return (
    <div className="min-h-screen bg-bg font-sans max-w-150 mx-auto relative">
      <Header
        session={app.session}
        user={user}
        onShowActivity={() => setShowActivity(true)}
        onSwitchRoom={app.handleSwitchRoom}
        onSignOut={() => app.handleSignOut(signOut)}
      />

      {(app.error || app.syncError) && (
        <div className="bg-[#fff3e0] border-b border-[#ffcc02] px-4 py-2 text-sm text-warning flex items-center gap-2">
          <span className="flex-1">⚠️ Kunde inte synka med servern – ändringar sparas lokalt.</span>
          {app.syncError && (
            <button onClick={app.clearSyncError} className="bg-transparent border-0 text-warning cursor-pointer text-base px-1 leading-none" title="Stäng">×</button>
          )}
        </div>
      )}

      <Tabs activeTab={activeTab} onChange={setActiveTab} />

      <main className="p-4 pb-20">
        <ErrorBoundary>
          <Suspense fallback={<p className="text-secondary p-6 text-center">Laddar...</p>}>
            {activeTab === 'matsedel' && (
              <MatsedelTab
                meals={app.meals}
                allRecipes={app.allRecipes}
                favoriteRecipeIds={app.favoriteRecipes}
                favoriteWeeks={app.favoriteWeeks}
                savedMeals={app.savedMeals}
                currentWeek={app.currentWeek}
                budget={app.budget}
                weeklySpend={app.weeklySpend}
                budgetSummary={app.budgetSummary}
                onSetMeal={app.setMeal}
                onSaveMealPlan={app.saveMealPlan}
                onLoadMealPlan={app.loadMealPlan}
                onSaveFavoriteWeek={app.saveFavoriteWeek}
                onLoadFavoriteWeek={favoriteWeekId => {
                  app.loadFavoriteWeek(favoriteWeekId)
                  setActiveTab('handlingslista')
                }}
                onDeleteFavoriteWeek={app.deleteFavoriteWeek}
                onGenerateWeek={selectedMeals => {
                  app.generateWeekFromMeals(selectedMeals)
                  setActiveTab('handlingslista')
                }}
                onToggleFavoriteRecipe={app.toggleFavoriteRecipe}
                onEditRecipe={setEditingRecipe}
                onClearMeals={app.clearMeals}
              />
            )}
            {activeTab === 'handlingslista' && (
              <HandlingslistaTab
                stores={app.stores} activeStoreId={app.activeStoreId} orderedCategories={app.orderedCategories} allItemsGrouped={app.allItemsGrouped}
                checkedItems={app.checkedItems} totalItems={app.totalItems} checkedCount={app.checkedCount} likelyEmptyItems={app.likelyEmptyItems}
                savedLists={app.savedLists} history={app.purchaseHistory} categories={app.categories} currentWeek={app.currentWeek}
                onToggleItem={app.toggleItem} onRemoveExtraItem={app.removeExtraItem} onAddExtraItem={app.addExtraItem}
                onHideIngredient={app.hideIngredient} onRestoreIngredients={app.restoreIngredients} hiddenCount={app.hiddenIngredients.length}
                onSetActiveStore={app.setActiveStore} onEditStore={setEditingStore} onNewStore={() => setEditingStore({ id: null, name: '', emoji: '🏪', categoryOrder: app.categories.map(c => c.id) })}
                budget={app.budget} weeklySpend={app.weeklySpend} budgetSummary={app.budgetSummary}
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

      {showWelcome && <Onboarding onStart={handleStartOnboarding} />}
    </div>
  )
}
