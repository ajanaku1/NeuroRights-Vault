import { createWalletClient, createPublicClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'
import { readFileSync } from 'fs'

const artifact = JSON.parse(
  readFileSync('./artifacts/contracts/NeuroRightsVault.sol/NeuroRightsVault.json', 'utf8')
)

const account = privateKeyToAccount(process.env.DEPLOYER_PRIVATE_KEY)

const walletClient = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http('https://sepolia.base.org'),
})

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org'),
})

console.log(`Deploying from: ${account.address}`)

const hash = await walletClient.deployContract({
  abi: artifact.abi,
  bytecode: artifact.bytecode,
})

console.log(`Deploy tx: ${hash}`)
console.log('Waiting for confirmation...')

const receipt = await publicClient.waitForTransactionReceipt({ hash })
console.log(`NeuroRightsVault deployed to: ${receipt.contractAddress}`)
console.log(`Block: ${receipt.blockNumber}`)
