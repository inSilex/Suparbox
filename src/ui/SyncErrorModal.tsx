import type { ArboxLesson } from '../api/arbox'
import modalStyles from '../styles/modal.module.css'

interface SyncErrorModalProps {
  message: string
  lesson?: ArboxLesson | null
  onClose: () => void
}

export function SyncErrorModal({ message, lesson, onClose }: SyncErrorModalProps) {
  return (
    <div className={modalStyles.errorModalOverlay} onClick={onClose}>
      <div className={modalStyles.errorModalInner} onClick={e => e.stopPropagation()}>
        <div className={modalStyles.errorModalHeader}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <h3 className={modalStyles.errorModalTitle}>Sync Failed</h3>
        </div>

        <p className={modalStyles.errorModalMessage}>
          {lesson
            ? 'Syncing this lesson to Google Calendar failed due to an error. Your booking is still active — you can try again later.'
            : 'Google Calendar connection failed. Please check your Google account settings and try again.'}
        </p>

        {lesson && (
          <div className={modalStyles.errorModalLessonCard}>
            <div className={modalStyles.errorModalLessonName}>{lesson.box_categories?.name || 'Class'}</div>
            <div className={modalStyles.errorModalLessonTime}>
              {new Date(lesson.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · {lesson.time?.slice(0, 5)} – {lesson.end_time?.slice(0, 5)}
            </div>
            <div className={modalStyles.errorModalLessonCoach}>{lesson.coach?.full_name || 'Coach TBD'}</div>
          </div>
        )}

        {message && (
          <div className={modalStyles.errorModalRawError}>{message}</div>
        )}

        <div className={modalStyles.errorModalFooter}>
          <button className={modalStyles.errorModalDismissBtn} onClick={onClose}>Dismiss</button>
        </div>
      </div>
    </div>
  )
}
