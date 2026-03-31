import { createConfig, http } from 'wagmi'
import { baseSepolia } from 'viem/chains'
import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import {
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
  injectedWallet,
} from '@rainbow-me/rainbowkit/wallets'

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID?.trim() || '21fef48c0f450e2a2f2b16207d3eeb44'

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Popular',
      wallets: [metaMaskWallet, rainbowWallet, walletConnectWallet, injectedWallet],
    },
  ],
  { appName: 'NeuroRights Vault', projectId }
)

export const config = createConfig({
  connectors,
  chains: [baseSepolia],
  transports: {
    [baseSepolia.id]: http('https://base-sepolia-rpc.publicnode.com'),
  },
  ssr: false,
})
