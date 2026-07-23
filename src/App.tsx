import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import RoomSetup from './components/RoomSetup'
import AuthScreen from './components/AuthScreen'
import ResetPasswordScreen from './components/ResetPasswordScreen'
import ErrorBoundary from './components/ErrorBoundary'
import Header from './components/Header'
import Tabs, { type TabKey } from './components/Tabs'
import FirstRunSetup from './components/FirstRunSetup'
import { useAuth } from './hooks/useAuth'
import { useAppState, getRecentRooms } from './hooks/useAppState'
import AppContext from './context/AppContext'
import type { RecipeDraft, Store } from './types'

const RecipeEditor = lazy(() => import('./components/RecipeEditor'))
const ActivityDrawer = lazy(() => import('./components/ActivityDrawer'))
const StoreEditor = lazy(() => import('./components/StoreEditor'))
const MatsedelTab = lazy(() => import('./components/MatsedelTab'))
const HandlingslistaTab = lazy(() => import('./components/HandlingslistaTab'))
const KategorierTab = lazy(() => import('./components/KategorierTab'))
const YouthView = lazy(() => import('./components/YouthView'))

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
  const isFirstTime = !localStorage.getItem('veckoplanen_onboarded')
  const [simpleMode, setSimpleMode] = useState(() => localStorage.getItem('veckoplanen_simple_mode') === '1')
  const [generatedToast, setGeneratedToast] = useState<string | null>(null)
  const [justGenerated, setJustGenerated] = useState(false)
  const mealsRef = useRef(app.meals)
  const totalItemsRef = useRef(app.totalItems)
  mealsRef.current = app.meals
  totalItemsRef.current = app.totalItems

  useEffect(() => {
    if (!justGenerated) return
    setJustGenerated(false)
    const mealCount = Object.values(mealsRef.current).filter(Boolean).length
    setGeneratedToast(`Veckan är klar — ${mealCount} middagar och ${totalItemsRef.current} varor i listan.`)
  }, [justGenerated])

  useEffect(() => {
    if (!generatedToast) return
    const t = setTimeout(() => setGeneratedToast(null), 4000)
    return () => clearTimeout(t)
  }, [generatedToast])

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
  if (!app.session) {
    if (isFirstTime) return <FirstRunSetup onStart={app.handleStart} initialJoinCode={pendingJoinCode} />
    return (
      <RoomSetup
        onStart={app.handleStart}
        initialJoinCode={pendingJoinCode}
        recentRooms={getRecentRooms(user.id)}
        recentRoomsKey={`veckoplanen_recent_rooms_${user.id}`}
        userId={user.id}
      />
    )
  }
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
  function handleDeleteRecipe(recipeId: string) { app.deleteRecipe(recipeId); setEditingRecipe(null) }
  return (
    <AppContext.Provider value={app}>
    <div className="min-h-screen bg-bg font-sans max-w-150 mx-auto relative">
      <Header
        session={app.session}
        roomName={app.roomName}
        user={user}
        onHome={() => setActiveTab('matsedel')}
        onShowActivity={() => setShowActivity(true)}
        onSwitchRoom={app.handleSwitchRoom}
        onSignOut={() => app.handleSignOut(signOut)}
      />

      {(app.error || app.syncError) && (
        <div className="bg-[#fff3e0] border-b border-[#ffcc02] px-4 py-2 text-sm text-warning flex items-center gap-2">
          <span className="flex-1">⚠️ {app.syncError || app.error || 'Kunde inte synka med servern – ändringar sparas lokalt.'}</span>
          <button onClick={app.clearSyncError} className="bg-transparent border-0 text-warning cursor-pointer text-base px-1 leading-none" title="Stäng">×</button>
        </div>
      )}
      {app.appError && (
        <div className="bg-[#fff3e0] border-b border-[#ffcc02] px-4 py-2 text-sm text-warning flex items-center gap-2">
          <span className="flex-1">⚠️ {app.appError}</span>
          <button onClick={app.clearAppError} className="bg-transparent border-0 text-warning cursor-pointer text-base px-1 leading-none" title="Stäng">×</button>
        </div>
      )}

      {simpleMode ? (
        <ErrorBoundary>
          <Suspense fallback={<p className="text-secondary p-6 text-center">Laddar...</p>}>
            <YouthView onSwitchToFull={() => { localStorage.removeItem('veckoplanen_simple_mode'); setSimpleMode(false) }} />
          </Suspense>
        </ErrorBoundary>
      ) : (
        <>
          <Tabs activeTab={activeTab} onChange={setActiveTab} />
          <main className={`p-4 ${activeTab === 'handlingslista' ? 'pb-36' : 'pb-20'}`}>
            <ErrorBoundary>
              <Suspense fallback={<p className="text-secondary p-6 text-center">Laddar...</p>}>
                {activeTab === 'matsedel' && (
                  <MatsedelTab
                    onEditRecipe={setEditingRecipe}
                    onLoadFavoriteWeek={id => { app.loadFavoriteWeek(id); setActiveTab('handlingslista') }}
                    onGenerateWeek={meals => { app.generateWeekFromMeals(meals); setActiveTab('handlingslista'); setJustGenerated(true) }}
                  />
                )}
                {activeTab === 'handlingslista' && (
                  <HandlingslistaTab
                    onEditStore={setEditingStore}
                    onNewStore={() => setEditingStore({ id: null, name: '', emoji: '🏪', categoryOrder: app.categories.map(c => c.id) })}
                  />
                )}
                {activeTab === 'kategorier' && (
                  <KategorierTab
                    onDeleteRoom={() => app.handleDeleteRoom(signOut)}
                    onEnableSimpleMode={() => { localStorage.setItem('veckoplanen_simple_mode', '1'); setSimpleMode(true) }}
                  />
                )}
              </Suspense>
            </ErrorBoundary>
          </main>
        </>
      )}

      <ErrorBoundary>
        <Suspense fallback={null}>
          {editingRecipe && <RecipeEditor recipe={editingRecipe} categories={app.categories} onSave={handleSaveRecipe} onDelete={handleDeleteRecipe} onClose={() => setEditingRecipe(null)} />}
          {showActivity && <ActivityDrawer log={app.activityLog} onClose={() => setShowActivity(false)} />}
          {editingStore && <StoreEditor store={editingStore} allCategories={app.categories} onSave={handleSaveStore} onDelete={handleDeleteStore} onClose={() => setEditingStore(null)} />}
        </Suspense>
      </ErrorBoundary>

      {generatedToast && (
        <div className="fixed top-14 left-0 right-0 z-50 bg-primary text-white px-4 py-3.5 text-[15px] font-semibold shadow-lg flex items-center justify-between gap-3">
          <span>✅ {generatedToast}</span>
          <button onClick={() => setGeneratedToast(null)} className="bg-transparent border-0 text-white/70 cursor-pointer text-xl leading-none p-0 shrink-0">×</button>
        </div>
      )}

    </div>
    </AppContext.Provider>
  )
}
