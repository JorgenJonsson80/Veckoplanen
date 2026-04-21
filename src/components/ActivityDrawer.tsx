import { useEffect, useRef } from 'react'
import type { ActivityLogEntry } from '../types'

interface Props {
  log: ActivityLogEntry[]
  onClose: () => void
}

const styles = {
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'flex-end' },
  sheet: { background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '600px', margin: '0 auto', padding: '20px 16px 32px', maxHeight: '70vh', overflowY: 'auto' as const },
  handle: { width: '40px', height: '4px', background: 'var(--clr-border)', borderRadius: '2px', margin: '0 auto 16px' },
  title: { fontFamily: 'Georgia, serif', color: 'var(--clr-primary)', fontSize: '20px', margin: '0 0 16px' },
  entry: { display: 'flex', flexDirection: 'column' as const, padding: '10px 12px', borderRadius: '8px', marginBottom: '8px', background: 'var(--clr-bg)', borderLeft: '3px solid #6b8f5e' },
  user: { fontWeight: '700', color: 'var(--clr-primary)', fontSize: '14px' },
  action: { color: '#444', fontSize: '14px', margin: '2px 0' },
  time: { color: '#888', fontSize: '12px' },
  empty: { textAlign: 'center' as const, color: '#888', padding: '32px 0', fontSize: '15px' },
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (diffMin < 1) return 'nyss'
  if (diffMin < 60) return `${diffMin} min sedan`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH} tim sedan`
  return d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function ActivityDrawer({ log, onClose }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.sheet} ref={sheetRef}>
        <div style={styles.handle} />
        <h2 style={styles.title}>📋 Aktivitet</h2>
        {(!log || log.length === 0) ? (
          <p style={styles.empty}>Ingen aktivitet än.</p>
        ) : (
          log.map((entry, idx) => (
            <div key={`${entry.time}_${idx}`} style={styles.entry}>
              <span style={styles.user}>{entry.user}</span>
              <span style={styles.action}>{entry.action}</span>
              <span style={styles.time}>{formatTime(entry.time)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
