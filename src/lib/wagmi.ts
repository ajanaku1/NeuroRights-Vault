import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { baseSepolia } from 'wagmi/chains'

export const config = getDefaultConfig({
  appName: 'NeuroRights Vault',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID?.trim() || '21fef48c0f450e2a2f2b16207d3eeb44',
  chains: [baseSepolia],
  ssr: false,
})
