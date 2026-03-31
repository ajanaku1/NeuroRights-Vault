import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { http } from 'wagmi'
import type { Chain } from 'viem'

const baseSepolia: Chain = {
  id: 84532,
  name: 'Base Sepolia',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://sepolia.base.org'] },
  },
  blockExplorers: {
    default: { name: 'BaseScan', url: 'https://sepolia.basescan.org' },
  },
  testnet: true,
}

export const config = getDefaultConfig({
  appName: 'NeuroRights Vault',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID?.trim() || '21fef48c0f450e2a2f2b16207d3eeb44',
  chains: [baseSepolia],
  transports: {
    [84532]: http(),
  },
  ssr: false,
})
