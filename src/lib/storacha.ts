import * as Client from '@storacha/client'
import { StoreMemory } from '@storacha/client/stores/memory'
import * as Proof from '@storacha/client/proof'
import { Signer } from '@storacha/client/principal/ed25519'

let cachedClient: Client.Client | null = null

/**
 * Create an authenticated Storacha client using pre-configured credentials.
 * Credentials are set up via the Storacha CLI and stored in env vars.
 */
async function getClient(): Promise<Client.Client> {
  if (cachedClient) return cachedClient

  const key = import.meta.env.VITE_STORACHA_KEY
  const proofStr = import.meta.env.VITE_STORACHA_PROOF

  if (!key || !proofStr) {
    throw new Error('Storacha credentials not configured. Set VITE_STORACHA_KEY and VITE_STORACHA_PROOF in .env')
  }

  const principal = Signer.parse(key)
  const store = new StoreMemory()
  const client = await Client.create({ principal, store })

  const proof = await Proof.parse(proofStr)
  const space = await client.addSpace(proof)
  await client.setCurrentSpace(space.did())

  cachedClient = client
  return client
}

/**
 * Upload encrypted data to IPFS via Storacha.
 * Returns the CID string for the uploaded content.
 */
export async function uploadToIPFS(data: ArrayBuffer, filename: string): Promise<string> {
  const client = await getClient()
  const file = new File([data], filename, { type: 'application/octet-stream' })
  const cid = await client.uploadFile(file)
  return cid.toString()
}

/**
 * Upload raw text/CSV data to IPFS via Storacha.
 * Returns the CID string.
 */
export async function uploadRawToIPFS(text: string, filename: string): Promise<string> {
  const client = await getClient()
  const blob = new Blob([text], { type: 'text/csv' })
  const file = new File([blob], filename, { type: 'text/csv' })
  const cid = await client.uploadFile(file)
  return cid.toString()
}

/**
 * Get the gateway URL for a given CID.
 */
export function getIPFSUrl(cid: string): string {
  return `https://storacha.link/ipfs/${cid}`
}

/**
 * Fetch content from IPFS via Storacha gateway.
 */
export async function fetchFromIPFS(cid: string): Promise<string> {
  const resp = await fetch(getIPFSUrl(cid))
  if (!resp.ok) throw new Error(`Failed to fetch from IPFS: ${resp.status}`)
  return resp.text()
}
