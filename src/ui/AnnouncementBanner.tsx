import type { ArboxBoxMessage, ArboxScheduleInvitation } from '../api/arbox'
import styles from '../styles/announcement.module.css'

export function AnnouncementBanner(props: {
  messages: ArboxBoxMessage[]
  invitations: ArboxScheduleInvitation[]
  seenIds: number[]
  onDismissNews: (id: number) => void
  onAcceptInvite: (inv: ArboxScheduleInvitation) => void
  onDismissInvite: (inv: ArboxScheduleInvitation) => void
  inviteBusy: Set<number>
}) {
  const { messages, invitations, seenIds, onDismissNews, onAcceptInvite, onDismissInvite, inviteBusy } = props

  const unseenNews = messages.filter(m => !seenIds.includes(m.id))

  if (unseenNews.length === 0 && invitations.length === 0) {
    return null
  }

  return (
    <div className={styles.announcementContainer}>
      {invitations.map(inv => {
        const fc = inv.friend_connection
        const inviter = fc?.friend_user || fc?.user
        const sched = inv.schedule
        const dateStr = sched?.date ? new Date(sched.date).toLocaleDateString(undefined, {
          weekday: 'short', month: 'short', day: 'numeric'
        }) : 'TBD'
        const timeStr = sched?.time?.slice(0, 5) ?? ''
        const isBusy = inviteBusy.has(inv.id)

        return (
          <div key={`inv-${inv.id}`} className={`${styles.announcementItem} ${styles.announcementInvite}`}>
            <span className={styles.announcementText}>
              <b>{inviter?.full_name_shorten || 'A friend'}</b> invited you to a session ({dateStr} {timeStr})
            </span >
            <div className={styles.announcementActions}>
              <button 
                className={`${styles.announcementBtn} ${styles.announcementBtnAccept}`} 
                onClick={() => onAcceptInvite(inv)}
                disabled={isBusy}
              >
                {isBusy ? '...' : 'Accept'}
              </button>
              <button 
                className={`${styles.announcementBtn} ${styles.announcementBtnDismiss}`} 
                onClick={() => onDismissInvite(inv)}
                disabled={isBusy}
              >
                ✕
              </button>
            </div >
          </div >
        )
      })}

      {unseenNews.map(m => (
        <div key={`news-${m.id}`} className={`${styles.announcementItem} ${styles.announcementNews}`}>
          <span className={styles.announcementText}>
            <b>{m.box?.name || 'Club News'}:</b> {m.subject || 'New update available'}
          </span >
          <div className={styles.announcementActions}>
            <button className={`${styles.announcementBtn} ${styles.announcementBtnDismiss}`} onClick={() => onDismissNews(m.id)}>
              ✕
            </button>
          </div >
        </div >
      ))}
    </div >
  )
}
