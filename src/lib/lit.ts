import { LitNodeClient } from '@lit-protocol/lit-node-client'
import { encryptString, decryptToString } from '@lit-protocol/encryption'
import { LIT_NETWORK, LIT_ABILITY } from '@lit-protocol/constants'
import {
  createSiweMessage,
  generateAuthSig,
  LitAccessControlConditionResource,
} from '@lit-protocol/auth-helpers'
import { NEURORIGHTS_VAULT_ADDRESS } from './contract'

let litClient: LitNodeClient | null = null

/**
 * Get or create the Lit Protocol client (DatilTest for testnet).
 */
async function getLitClient(): Promise<LitNodeClient> {
  if (litClient && litClient.ready) return litClient

  litClient = new LitNodeClient({
    litNetwork: 'datil-test' as any,
    debug: false,
  })
  await litClient.connect()
  return litClient
}

/**
 * Build access control conditions for a dataset.
 * Only addresses with an active license in the NeuroRightsVault contract can decrypt.
 */
function getAccessControlConditions(datasetId: string) {
  return [
    {
      conditionType: 'evmContract' as const,
      contractAddress: NEURORIGHTS_VAULT_ADDRESS,
      chain: 'baseSepolia',
      functionName: 'hasActiveLicense',
      functionParams: [datasetId, ':userAddress'],
      functionAbi: {
        name: 'hasActiveLicense',
        type: 'function' as const,
        stateMutability: 'view' as const,
        inputs: [
          { name: 'datasetId', type: 'uint256' },
          { name: 'researcher', type: 'address' },
        ],
        outputs: [{ name: '', type: 'bool' }],
      },
      returnValueTest: {
        key: '',
        comparator: '=' as const,
        value: 'true',
      },
    },
    { operator: 'or' as const },
    {
      conditionType: 'evmContract' as const,
      contractAddress: NEURORIGHTS_VAULT_ADDRESS,
      chain: 'baseSepolia',
      functionName: 'datasets',
      functionParams: [datasetId],
      functionAbi: {
        name: 'datasets',
        type: 'function' as const,
        stateMutability: 'view' as const,
        inputs: [{ name: 'datasetId', type: 'uint256' }],
        outputs: [
          { name: 'owner', type: 'address' },
          { name: 'cid', type: 'bytes32' },
          { name: 'metadata', type: 'string' },
          { name: 'pricePerAccess', type: 'uint256' },
          { name: 'totalEarnings', type: 'uint256' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'active', type: 'bool' },
        ],
      },
      returnValueTest: {
        key: 'owner',
        comparator: '=' as const,
        value: ':userAddress',
      },
    },
  ]
}

/**
 * Encrypt data with Lit Protocol access control.
 * Only licensed researchers can decrypt.
 */
export async function litEncrypt(
  dataString: string,
  datasetId: string
): Promise<{ ciphertext: string; dataToEncryptHash: string }> {
  const client = await getLitClient()
  const evmContractConditions = getAccessControlConditions(datasetId)

  const { ciphertext, dataToEncryptHash } = await encryptString(
    {
      evmContractConditions,
      dataToEncrypt: dataString,
    },
    client
  )

  return { ciphertext, dataToEncryptHash }
}

/**
 * Decrypt data with Lit Protocol.
 * Will only succeed if the caller has an active license on-chain.
 */
export async function litDecrypt(
  ciphertext: string,
  dataToEncryptHash: string,
  datasetId: string,
  walletProvider: any
): Promise<string> {
  const client = await getLitClient()
  const evmContractConditions = getAccessControlConditions(datasetId)

  // Get ethers signer from wallet provider
  const { BrowserProvider } = await import('ethers')
  const provider = new BrowserProvider(walletProvider)
  const signer = await provider.getSigner()
  const address = await signer.getAddress()

  // Generate session signatures
  const sessionSigs = await client.getSessionSigs({
    chain: 'baseSepolia',
    expiration: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    resourceAbilityRequests: [
      {
        resource: new LitAccessControlConditionResource('*'),
        ability: LIT_ABILITY.AccessControlConditionDecryption,
      },
    ],
    authNeededCallback: async ({ uri, expiration, resourceAbilityRequests }) => {
      const toSign = await createSiweMessage({
        uri: uri!,
        expiration: expiration!,
        resources: resourceAbilityRequests!,
        walletAddress: address,
        nonce: await client.getLatestBlockhash(),
        litNodeClient: client,
      })

      return await generateAuthSig({
        signer,
        toSign,
      })
    },
  })

  const decrypted = await decryptToString(
    {
      evmContractConditions,
      chain: 'baseSepolia',
      ciphertext,
      dataToEncryptHash,
      sessionSigs,
    },
    client
  )

  return decrypted
}

/**
 * Disconnect from Lit network (cleanup).
 */
export async function disconnectLit() {
  if (litClient) {
    await litClient.disconnect()
    litClient = null
  }
}
