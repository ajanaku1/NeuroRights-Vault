import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { onToast } from '../lib/toast'

interface ToastItem {
  id: number
  message: string
  type: 'error' | 'success' | 'info'
}

export default function Toasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    return onToast((t) => {
      setToasts(prev => [...prev, t])
      setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), 5000)
    })
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map(t => (
        <div key={t.id}
          className={`flex items-start gap-2 px-4 py-3 rounded-sm border shadow-lg shadow-black/30 animate-slide-up ${
            t.type === 'error' ? 'bg-surface border-danger/40 text-danger' :
            t.type === 'success' ? 'bg-surface border-success/40 text-success' :
            'bg-surface border-accent/40 text-text-primary'
          }`}>
          <p className="text-xs flex-1">{t.message}</p>
          <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
            className="shrink-0 text-text-muted hover:text-text-secondary">
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  )
}
