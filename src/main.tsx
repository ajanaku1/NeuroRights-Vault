import './polyfills'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'
import { config } from './lib/wagmi'
import App from './App'
import './index.css'

// Clear stale persisted store if schema changed
try {
  const stored = localStorage.getItem('neurorights-vault')
  if (stored) {
    const parsed = JSON.parse(stored)
    // If the store has old-format data, clear it
    if (parsed?.state?.datasets?.some?.((d: any) => d.id && !d.id.startsWith('0x') && d.id.length < 60)) {
      localStorage.removeItem('neurorights-vault')
      console.log('Cleared stale store data')
    }
  }
} catch {
  localStorage.removeItem('neurorights-vault')
}

const queryClient = new QueryClient()

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, color: '#f0f6fc', background: '#06060a', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h1 style={{ color: '#ff4757', fontSize: 24 }}>Something went wrong</h1>
          <pre style={{ color: '#8b949e', marginTop: 16, whiteSpace: 'pre-wrap', fontSize: 14 }}>
            {this.state.error.message}
          </pre>
          <button
            onClick={() => {
              localStorage.clear()
              window.location.reload()
            }}
            style={{ marginTop: 24, padding: '12px 24px', background: '#00f5d4', color: '#06060a', border: 'none', cursor: 'pointer', fontSize: 16 }}
          >
            Clear Data & Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider
            theme={darkTheme({
              accentColor: '#00f5d4',
              accentColorForeground: '#06060a',
              borderRadius: 'small',
              overlayBlur: 'small',
            })}
          >
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
