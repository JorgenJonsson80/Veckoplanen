import { useEffect, useRef } from 'react'
import { ClipboardList } from 'lucide-react'
import type { ActivityLogEntry } from '../types'

interface Props {
  log: ActivityLogEntry[]
  onClose: () => void
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
    <div className="fixed inset-0 bg-black/45 z-100 flex items-end" onClick={e => e.target === e.currentTarget && onClose()}>
      <div ref={sheetRef} className="bg-white rounded-t-[20px] w-full max-w-150 mx-auto px-4 pt-5 pb-8 max-h-[70vh] overflow-y-auto">
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
        <h2 className="font-serif text-primary text-xl mb-4 flex items-center gap-2"><ClipboardList size={20} /> Aktivitet</h2>
        {(!log || log.length === 0) ? (
          <p className="text-center text-[#888] py-8 text-[15px]">Ingen aktivitet än.</p>
        ) : (
          log.map((entry, idx) => (
            <div key={`${entry.time}_${idx}`} className="flex flex-col px-3 py-2.5 rounded-lg mb-2 bg-bg border-l-[3px] border-secondary">
              <span className="font-bold text-primary text-sm">{entry.user}</span>
              <span className="text-[#444] text-sm mt-0.5">{entry.action}</span>
              <span className="text-[#888] text-xs">{formatTime(entry.time)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
