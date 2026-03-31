type ToastType = 'error' | 'success' | 'info'
type Listener = (toast: { id: number; message: string; type: ToastType }) => void

let nextId = 0
const listeners = new Set<Listener>()

export function toast(message: string, type: ToastType = 'info') {
  const t = { id: ++nextId, message, type }
  listeners.forEach(fn => fn(t))
}

export function onToast(fn: Listener) {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}
