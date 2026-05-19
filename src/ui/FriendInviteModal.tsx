import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { ArboxFriendConnection } from '../api/arbox'
import styles from '../styles/modal.module.css'

export function FriendInviteModal(props: {
  friends: ArboxFriendConnection[]
  currentUserId?: number
  lessonLabel: string
  bookedUserIds: Set<number>
  onSelect: (friendId: number) => void
  onClose: () => void
}) {
  const bgRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') props.onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [props.onClose])

  return createPortal(
    <div
      className={styles.inviteModalOverlay}
      ref={bgRef}
    >
      <div className={styles.inviteModalInner}>
        <div className={styles.inviteModalHeader}>
          <h3 className={styles.inviteModalTitle}>Invite a friend</h3>
          <button className={styles.inviteModalClose} onClick={props.onClose}>✕</button>
        </div>
        <p className={styles.inviteModalSubtitle}>
          Who do you want to invite to <strong>{props.lessonLabel}</strong>?
        </p>
        <div className={styles.inviteModalList}>
          {props.friends.map((fc) => {
            const friendUser = fc.users_id === props.currentUserId ? fc.friend_user : fc.user
            const name = friendUser?.full_name_shorten || friendUser?.full_name || 'Friend'
            const img = friendUser?.image
            const bookedId = fc.users_id === props.currentUserId ? fc.friend_users_id : fc.users_id
            const isBooked = friendUser?.is_user && props.bookedUserIds.has(bookedId)
            return (
              <button
                key={fc.id}
                className={`${styles.inviteModalItem} ${isBooked ? styles.inviteModalItemDisabled : ''}`}
                disabled={isBooked}
                onClick={() => props.onSelect(fc.friend_users_id)}
              >
                {img ? (
                  <img src={img} alt="" className={styles.inviteModalAvatar} />
                ) : (
                  <svg className={`${styles.inviteModalAvatar} ${styles.inviteModalAvatarFallback}`} viewBox="0 0 36 36" fill="none">
                    <circle cx="18" cy="18" r="18" fill="#6b21a8" />
                    <circle cx="18" cy="14" r="6" fill="#c084fc" />
                    <path d="M6 32c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="#c084fc" strokeWidth="2" fill="none" />
                  </svg>
                )}
                <span className={styles.inviteModalName}>{name}</span>
                {isBooked && <span className={styles.inviteModalBookedLabel}>Registered</span>}
              </button>
            )
          })}
        </div>
      </div>
    </div>,
    document.body
  )
}
