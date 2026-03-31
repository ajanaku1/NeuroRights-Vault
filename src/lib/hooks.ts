import { useReadContract, useReadContracts, usePublicClient } from 'wagmi'
import { useState, useEffect, useCallback } from 'react'
import { formatEther, parseAbiItem } from 'viem'
import { NEURORIGHTS_VAULT_ADDRESS, NEURORIGHTS_VAULT_ABI } from './contract'

// ──────────────────────────── Types ────────────────────────────

export interface OnChainDataset {
  datasetId: number
  owner: string
  cidHash: string
  ipfsCid: string
  name: string
  description: string
  channels: number
  samplingRate: number
  duration: number
  format: string
  pricePerAccess: string
  totalEarnings: string
  createdAt: number
  active: boolean
  dataToEncryptHash: string
  litEncrypted: boolean
}

export interface OnChainLicense {
  researcher: string
  expiry: number
  purpose: string
  active: boolean
}

export interface OnChainEvent {
  type: 'DatasetRegistered' | 'LicenseGranted' | 'LicenseRevoked' | 'AccessRequested'
  datasetId: number
  actor: string
  details: string
  txHash: string
  blockNumber: bigint
}

export interface AccessRequest {
  datasetId: number
  researcher: string
  txHash: string
  blockNumber: bigint
}

// ──────────────────────────── Dataset Count ────────────────────

export function useDatasetCount() {
  return useReadContract({
    address: NEURORIGHTS_VAULT_ADDRESS,
    abi: NEURORIGHTS_VAULT_ABI,
    functionName: 'datasetCount',
  })
}

// ──────────────────────────── All Datasets ─────────────────────

export function useAllDatasets() {
  const { data: count, isLoading: countLoading, refetch: refetchCount } = useDatasetCount()
  const datasetCount = count ? Number(count) : 0

  const contracts = Array.from({ length: datasetCount }, (_, i) => ({
    address: NEURORIGHTS_VAULT_ADDRESS,
    abi: NEURORIGHTS_VAULT_ABI,
    functionName: 'datasets' as const,
    args: [BigInt(i)] as const,
  }))

  const { data: rawDatasets, isLoading: datasetsLoading, refetch: refetchDatasets } = useReadContracts({
    contracts: contracts.length > 0 ? contracts : undefined,
  })

  const datasets: OnChainDataset[] = []
  if (rawDatasets) {
    for (let i = 0; i < rawDatasets.length; i++) {
      const result = rawDatasets[i]
      if (result.status === 'success' && result.result) {
        const r = result.result as any[]
        const owner = r[0] as string
        const cidHash = r[1] as string
        const metadata = r[2] as string
        const pricePerAccess = r[3] as bigint
        const totalEarnings = r[4] as bigint
        const createdAt = r[5] as bigint
        const active = r[6] as boolean

        let parsed: any = {}
        try { parsed = JSON.parse(metadata) } catch {}

        datasets.push({
          datasetId: i,
          owner,
          cidHash,
          ipfsCid: parsed.ipfsCid || '',
          name: parsed.name || `Dataset #${i}`,
          description: parsed.description || '',
          channels: parsed.channels || 0,
          samplingRate: parsed.samplingRate || 0,
          duration: parsed.duration || 0,
          format: parsed.format || '',
          pricePerAccess: formatEther(pricePerAccess),
          totalEarnings: formatEther(totalEarnings),
          createdAt: Number(createdAt) * 1000,
          active,
          dataToEncryptHash: parsed.dataToEncryptHash || '',
          litEncrypted: parsed.litEncrypted || false,
        })
      }
    }
  }

  const refetch = useCallback(() => {
    refetchCount()
    setTimeout(() => refetchDatasets(), 500)
  }, [refetchCount, refetchDatasets])

  return { datasets, isLoading: countLoading || datasetsLoading, refetch }
}

// ──────────────────────────── My Datasets ──────────────────────

export function useMyDatasets(address: string | undefined) {
  const { datasets, isLoading, refetch } = useAllDatasets()
  const myDatasets = address
    ? datasets.filter(d => d.owner.toLowerCase() === address.toLowerCase())
    : []
  return { myDatasets, allDatasets: datasets, isLoading, refetch }
}

// ──────────────────────────── Licenses ─────────────────────────

export function useAllMyLicenses(datasetIds: number[]) {
  const contracts = datasetIds.map(id => ({
    address: NEURORIGHTS_VAULT_ADDRESS,
    abi: NEURORIGHTS_VAULT_ABI,
    functionName: 'getActiveLicenses' as const,
    args: [BigInt(id)] as const,
  }))

  const { data, isLoading, refetch } = useReadContracts({
    contracts: contracts.length > 0 ? contracts : undefined,
  })

  const licensesMap: Record<number, OnChainLicense[]> = {}
  if (data) {
    for (let i = 0; i < data.length; i++) {
      const result = data[i]
      if (result.status === 'success' && result.result) {
        licensesMap[datasetIds[i]] = (result.result as any[]).map((lic: any) => ({
          researcher: lic.researcher || lic[0],
          expiry: Number(lic.expiry || lic[1]) * 1000,
          purpose: lic.purpose || lic[2],
          active: (lic.active ?? lic[3]) && Number(lic.expiry || lic[1]) * 1000 > Date.now(),
        }))
      }
    }
  }

  return { licensesMap, isLoading, refetch }
}

// ──────────────────────────── Contract Events ──────────────────

const EVENT_ABIS = {
  DatasetRegistered: parseAbiItem('event DatasetRegistered(uint256 indexed datasetId, address indexed owner, bytes32 cid, string metadata, uint256 pricePerAccess)'),
  LicenseGranted: parseAbiItem('event LicenseGranted(uint256 indexed datasetId, address indexed researcher, uint256 expiry, string purpose)'),
  LicenseRevoked: parseAbiItem('event LicenseRevoked(uint256 indexed datasetId, address indexed researcher, uint256 revokedAt)'),
  AccessRequested: parseAbiItem('event AccessRequested(uint256 indexed datasetId, address indexed researcher, uint256 payment)'),
  AccessApproved: parseAbiItem('event AccessApproved(uint256 indexed datasetId, address indexed researcher, uint256 payment)'),
  AccessRejected: parseAbiItem('event AccessRejected(uint256 indexed datasetId, address indexed researcher, uint256 refundAmount)'),
}

export function useContractEvents() {
  const publicClient = usePublicClient()
  const [events, setEvents] = useState<OnChainEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchEvents = useCallback(async () => {
    if (!publicClient) return
    setIsLoading(true)

    const allEvents: OnChainEvent[] = []

    try {
      // Fetch each event type separately using proper ABI
      const [regLogs, grantLogs, revokeLogs, accessLogs, approveLogs, rejectLogs] = await Promise.all([
        publicClient.getLogs({ address: NEURORIGHTS_VAULT_ADDRESS, event: EVENT_ABIS.DatasetRegistered, fromBlock: 39591253n, toBlock: 'latest' }).catch(() => []),
        publicClient.getLogs({ address: NEURORIGHTS_VAULT_ADDRESS, event: EVENT_ABIS.LicenseGranted, fromBlock: 39591253n, toBlock: 'latest' }).catch(() => []),
        publicClient.getLogs({ address: NEURORIGHTS_VAULT_ADDRESS, event: EVENT_ABIS.LicenseRevoked, fromBlock: 39591253n, toBlock: 'latest' }).catch(() => []),
        publicClient.getLogs({ address: NEURORIGHTS_VAULT_ADDRESS, event: EVENT_ABIS.AccessRequested, fromBlock: 39591253n, toBlock: 'latest' }).catch(() => []),
        publicClient.getLogs({ address: NEURORIGHTS_VAULT_ADDRESS, event: EVENT_ABIS.AccessApproved, fromBlock: 39591253n, toBlock: 'latest' }).catch(() => []),
        publicClient.getLogs({ address: NEURORIGHTS_VAULT_ADDRESS, event: EVENT_ABIS.AccessRejected, fromBlock: 39591253n, toBlock: 'latest' }).catch(() => []),
      ])

      for (const log of regLogs) {
        const args = log.args as any
        const id = Number(args.datasetId)
        const owner = args.owner as string
        allEvents.push({
          type: 'DatasetRegistered', datasetId: id, actor: owner,
          details: `Dataset #${id} registered by ${owner.slice(0, 6)}...${owner.slice(-4)}`,
          txHash: log.transactionHash, blockNumber: log.blockNumber,
        })
      }

      for (const log of grantLogs) {
        const args = log.args as any
        const id = Number(args.datasetId)
        const researcher = args.researcher as string
        allEvents.push({
          type: 'LicenseGranted', datasetId: id, actor: researcher,
          details: `License granted to ${researcher.slice(0, 6)}...${researcher.slice(-4)} for dataset #${id}`,
          txHash: log.transactionHash, blockNumber: log.blockNumber,
        })
      }

      for (const log of revokeLogs) {
        const args = log.args as any
        const id = Number(args.datasetId)
        const researcher = args.researcher as string
        allEvents.push({
          type: 'LicenseRevoked', datasetId: id, actor: researcher,
          details: `License revoked for ${researcher.slice(0, 6)}...${researcher.slice(-4)} on dataset #${id}`,
          txHash: log.transactionHash, blockNumber: log.blockNumber,
        })
      }

      for (const log of accessLogs) {
        const args = log.args as any
        const id = Number(args.datasetId)
        const researcher = args.researcher as string
        allEvents.push({
          type: 'AccessRequested', datasetId: id, actor: researcher,
          details: `Access requested by ${researcher.slice(0, 6)}...${researcher.slice(-4)} for dataset #${id}`,
          txHash: log.transactionHash, blockNumber: log.blockNumber,
        })
      }

      for (const log of approveLogs) {
        const args = log.args as any
        const id = Number(args.datasetId)
        const researcher = args.researcher as string
        allEvents.push({
          type: 'AccessApproved' as any, datasetId: id, actor: researcher,
          details: `Access approved for ${researcher.slice(0, 6)}...${researcher.slice(-4)} on dataset #${id}`,
          txHash: log.transactionHash, blockNumber: log.blockNumber,
        })
      }

      for (const log of rejectLogs) {
        const args = log.args as any
        const id = Number(args.datasetId)
        const researcher = args.researcher as string
        allEvents.push({
          type: 'AccessRejected' as any, datasetId: id, actor: researcher,
          details: `Access rejected — funds refunded to ${researcher.slice(0, 6)}...${researcher.slice(-4)} for dataset #${id}`,
          txHash: log.transactionHash, blockNumber: log.blockNumber,
        })
      }

      // Sort by block number descending
      allEvents.sort((a, b) => Number(b.blockNumber - a.blockNumber))
      setEvents(allEvents)
    } catch (err) {
      console.error('Failed to fetch contract events:', err)
    }
    setIsLoading(false)
  }, [publicClient])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  return { events, isLoading, refetch: fetchEvents }
}

// ──────────────────────────── User's Access Status per Dataset ─────────────

export function useUserAccessStatus(userAddress: string | undefined, datasetIds: number[]) {
  // Check hasActiveLicense for each dataset
  const licenseContracts = datasetIds.map(id => ({
    address: NEURORIGHTS_VAULT_ADDRESS,
    abi: NEURORIGHTS_VAULT_ABI,
    functionName: 'hasActiveLicense' as const,
    args: [BigInt(id), (userAddress || '0x0000000000000000000000000000000000000000') as `0x${string}`] as const,
  }))

  // Check pending requests for each dataset
  const pendingContracts = datasetIds.map(id => ({
    address: NEURORIGHTS_VAULT_ADDRESS,
    abi: NEURORIGHTS_VAULT_ABI,
    functionName: 'getPendingRequestsRaw' as const,
    args: [BigInt(id)] as const,
  }))

  const { data: licenseData, refetch: r1 } = useReadContracts({
    contracts: licenseContracts.length > 0 ? licenseContracts : undefined,
  })

  const { data: pendingData, refetch: r2 } = useReadContracts({
    contracts: pendingContracts.length > 0 ? pendingContracts : undefined,
  })

  const statusMap: Record<number, 'licensed' | 'pending' | 'none'> = {}
  for (let i = 0; i < datasetIds.length; i++) {
    const id = datasetIds[i]
    // Check license first
    if (licenseData?.[i]?.status === 'success' && licenseData[i].result === true) {
      statusMap[id] = 'licensed'
      continue
    }
    // Check pending requests
    if (pendingData?.[i]?.status === 'success' && pendingData[i].result) {
      const reqs = pendingData[i].result as any[]
      const hasPending = reqs.some((r: any) => {
        const requester = (r.requester || r[0]) as string
        const pending = r.pending ?? r[2]
        return pending && requester.toLowerCase() === userAddress?.toLowerCase()
      })
      if (hasPending) {
        statusMap[id] = 'pending'
        continue
      }
    }
    statusMap[id] = 'none'
  }

  const refetch = () => { r1(); r2() }
  return { statusMap, refetch }
}

// ──────────────────────────── Datasets User Has Access To ──────

export function useMyLicensedDatasets(userAddress: string | undefined) {
  const { datasets, isLoading, refetch } = useAllDatasets()
  const datasetIds = datasets.map(d => d.datasetId)
  const { statusMap } = useUserAccessStatus(userAddress, datasetIds)

  const licensedDatasets = datasets.filter(d => statusMap[d.datasetId] === 'licensed')
  const pendingDatasets = datasets.filter(d => statusMap[d.datasetId] === 'pending')

  return { licensedDatasets, pendingDatasets, isLoading, refetch }
}

// ──────────────────────────── Researcher Notifications (approved/rejected) ──

export interface ResearcherNotification {
  type: 'approved' | 'rejected'
  datasetId: number
  researcher: string
  txHash: string
  blockNumber: bigint
}

export function useResearcherNotifications(userAddress: string | undefined) {
  const publicClient = usePublicClient()
  const [notifications, setNotifications] = useState<ResearcherNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchNotifications = useCallback(async () => {
    if (!publicClient || !userAddress) { setIsLoading(false); return }

    try {
      const [approveLogs, rejectLogs] = await Promise.all([
        publicClient.getLogs({ address: NEURORIGHTS_VAULT_ADDRESS, event: EVENT_ABIS.AccessApproved, fromBlock: 39591253n, toBlock: 'latest' }).catch(() => []),
        publicClient.getLogs({ address: NEURORIGHTS_VAULT_ADDRESS, event: EVENT_ABIS.AccessRejected, fromBlock: 39591253n, toBlock: 'latest' }).catch(() => []),
      ])

      const notifs: ResearcherNotification[] = []

      for (const log of approveLogs) {
        const args = log.args as any
        const researcher = args.researcher as string
        if (researcher.toLowerCase() === userAddress.toLowerCase()) {
          notifs.push({ type: 'approved', datasetId: Number(args.datasetId), researcher, txHash: log.transactionHash, blockNumber: log.blockNumber })
        }
      }

      for (const log of rejectLogs) {
        const args = log.args as any
        const researcher = args.researcher as string
        if (researcher.toLowerCase() === userAddress.toLowerCase()) {
          notifs.push({ type: 'rejected', datasetId: Number(args.datasetId), researcher, txHash: log.transactionHash, blockNumber: log.blockNumber })
        }
      }

      notifs.sort((a, b) => Number(b.blockNumber - a.blockNumber))
      setNotifications(notifs)
    } catch (err) {
      console.error('Failed to fetch researcher notifications:', err)
    }
    setIsLoading(false)
  }, [publicClient, userAddress])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  return { notifications, isLoading, refetch: fetchNotifications }
}

// ──────────────────────────── Pending Requests (from contract, not events) ──

export interface PendingRequest {
  datasetId: number
  requestIndex: number
  requester: string
  amount: string
  datasetName: string
}

export function usePendingRequests(ownerAddress: string | undefined) {
  const { datasets } = useAllDatasets()
  const myDatasets = ownerAddress
    ? datasets.filter(d => d.owner.toLowerCase() === ownerAddress.toLowerCase())
    : []

  // Read pending requests for each of my datasets
  const contracts = myDatasets.map(d => ({
    address: NEURORIGHTS_VAULT_ADDRESS,
    abi: NEURORIGHTS_VAULT_ABI,
    functionName: 'getPendingRequestsRaw' as const,
    args: [BigInt(d.datasetId)] as const,
  }))

  const { data, isLoading, refetch } = useReadContracts({
    contracts: contracts.length > 0 ? contracts : undefined,
  })

  const requests: PendingRequest[] = []
  if (data) {
    for (let i = 0; i < data.length; i++) {
      const result = data[i]
      const dataset = myDatasets[i]
      if (result.status === 'success' && result.result) {
        const rawRequests = result.result as any[]
        for (let j = 0; j < rawRequests.length; j++) {
          const req = rawRequests[j]
          const pending = req.pending ?? req[2]
          if (pending) {
            requests.push({
              datasetId: dataset.datasetId,
              requestIndex: j,
              requester: req.requester || req[0],
              amount: formatEther(req.amount || req[1]),
              datasetName: dataset.name,
            })
          }
        }
      }
    }
  }

  return { requests, isLoading, refetch }
}
