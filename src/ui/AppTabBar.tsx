import tabBarStyles from '../styles/tabs.module.css'
import type { ArboxLesson } from '../api/arbox'

interface AppTabBarProps {
  activeTab: 'schedule' | 'bookings'
  setActiveTab: (tab: 'schedule' | 'bookings') => void
  userClassesLoaded: boolean
  boxesId: number | null
  fetchUserClasses: (id: number) => Promise<ArboxLesson[]>
  syncBusy?: boolean
  syncCompleteAt?: number | null
}

export function AppTabBar({ 
  activeTab, 
  setActiveTab, 
  userClassesLoaded, 
  boxesId, 
  fetchUserClasses,
  syncBusy,
  syncCompleteAt
}: AppTabBarProps) {
  const showCheck = syncCompleteAt && (Date.now() - syncCompleteAt < 5000)

  return (
    <div className={tabBarStyles.tabBar}>
      <div className={tabBarStyles.tabBarInner}>
        <button
          className={`${tabBarStyles.tabBtn} ${activeTab === 'schedule' ? tabBarStyles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('schedule')}
        >
          Schedule
        </button>
        <button
          className={`${tabBarStyles.tabBtn} ${activeTab === 'bookings' ? tabBarStyles.tabBtnActive : ''}`}
          onClick={() => {
            setActiveTab('bookings')
            if (!userClassesLoaded && boxesId) {
              fetchUserClasses(boxesId)
            }
          }}
        >
          Bookings
        </button>

        <div className={tabBarStyles.syncActions}>
          {syncBusy && (
            <>
              <span className={tabBarStyles.syncLabel}>Syncing</span>
              <div className={tabBarStyles.syncIcon}>
                <svg className={tabBarStyles.spinner} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 11-6.219-8.56"/>
                </svg>
              </div>
            </>
          )}
          {showCheck && !syncBusy && (
            <>
              <span className={`${tabBarStyles.syncLabel} ${tabBarStyles.fadeOut}`} style={{ color: '#22c55e' }}>Synced</span>
              <div className={`${tabBarStyles.syncIcon} ${tabBarStyles.fadeOut}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
