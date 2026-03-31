import { Buffer } from 'buffer'

window.global = window
window.Buffer = Buffer
if (!(window as any).process) (window as any).process = { env: { NODE_ENV: 'development' } }
