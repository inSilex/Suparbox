import { useState } from 'react'
import layoutStyles from '../styles/layout.module.css'
import type { ArboxUserProfile, ArboxMembership, ArboxClubLocation } from '../api/arbox'

export function MenuBar(props: {
  profile: ArboxUserProfile | null
  onLogout: () => void
  memberships: ArboxMembership[]
  selectedMembershipId: number | null
  onMembershipChange: (id: number) => void
  locations: ArboxClubLocation[]
  selectedLocationId: number | null
  onLocationChange: (id: number) => void
}) {
  const [showMemberships, setShowMemberships] = useState(false)
  const [showLocations, setShowLocations] = useState(false)

  const selectedMembership = props.memberships.find(m => m.id === props.selectedMembershipId)
  const selectedLocation = props.locations.find(l => l.id === props.selectedLocationId)

  return (
    <div className={layoutStyles.topbar}>
      <div className={layoutStyles.topbarInner}>
        <div className={layoutStyles.topbarLeft}>
          <div className={layoutStyles.brand}>
            <img src="/logo.png" alt="" className={layoutStyles.brandLogo} />
            Suparbox
          </div>
          <div className={layoutStyles.topbarNav}>
            {props.locations.length > 0 && (
              <div className={layoutStyles.navItem}>
                <button className={`${layoutStyles.navBtn} ${showLocations ? layoutStyles.active : ''}`} onClick={() => { setShowLocations(!showLocations); setShowMemberships(false); }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                  <span className={layoutStyles.navBtnLabel}>{selectedLocation?.name || 'Location'}</span>
                </button>
                {showLocations && (
                  <div className={layoutStyles.navDropdown}>
                    {props.locations.map(l => (
                      <button 
                        key={l.id} 
                        className={`${layoutStyles.dropdownItem} ${l.id === props.selectedLocationId ? layoutStyles.active : ''}`}
                        onClick={() => { props.onLocationChange(l.id); setShowLocations(false); }}
                      >
                        {l.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {props.memberships.length > 0 && (
                <div className={layoutStyles.navItem}>
                  <button className={`${layoutStyles.navBtn} ${showMemberships ? layoutStyles.active : ''}`} onClick={() => { setShowMemberships(!showMemberships); setShowLocations(false); }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                    <span className={layoutStyles.navBtnLabel}>{selectedMembership?.membership_types?.name || 'Membership'}</span>
                  </button>
                  {showMemberships && (
                      <div className={layoutStyles.navDropdown}>
                        {props.memberships.map(m => (
                            <button
                                key={m.id}
                                className={`${layoutStyles.dropdownItem} ${m.id === props.selectedMembershipId ? layoutStyles.active : ''}`}
                                onClick={() => { props.onMembershipChange(m.id); setShowMemberships(false); }}
                            >
                              {m.membership_types?.name}
                            </button>
                        ))}
                      </div>
                  )}
                </div>
            )}
          </div>
        </div>

        <div className={layoutStyles.topbarRight}>
          {props.profile && (
            <div className={layoutStyles.profileLine}>
              <span className={layoutStyles.profileName}>{props.profile.first_name}</span>
              <span className={`${layoutStyles.profileEmail} ${layoutStyles.desktopOnly}`}> ({props.profile.email})</span>
            </div>
          )}
          <button className={`${layoutStyles.btn} ${layoutStyles.btnLogout}`} onClick={props.onLogout} title="Logout">
            <span className={layoutStyles.btnLogoutLabel}>Logout</span>
            <svg className={layoutStyles.btnLogoutIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
          </button>
        </div>
      </div>
      {(showMemberships || showLocations) && <div className={layoutStyles.dropdownOverlay} onClick={() => { setShowMemberships(false); setShowLocations(false); }} />}
    </div>
  )
}
