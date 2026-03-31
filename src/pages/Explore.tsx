import { useState } from 'react'
import { useAccount, useWriteContract, usePublicClient } from 'wagmi'
import { parseEther } from 'viem'
import { Link } from 'react-router-dom'
import { Search, Database, Zap, Filter, Clock, DollarSign, Loader2, Check, Hourglass } from 'lucide-react'
import { toast } from '../lib/toast'
import { useAllDatasets, useUserAccessStatus } from '../lib/hooks'
import { NEURORIGHTS_VAULT_ADDRESS, NEURORIGHTS_VAULT_ABI } from '../lib/contract'

export default function Explore() {
  const { address } = useAccount()
  const { datasets, isLoading, refetch } = useAllDatasets()
  const datasetIds = datasets.map(d => d.datasetId)
  const { statusMap, refetch: refetchStatus } = useUserAccessStatus(address, datasetIds)
  const { writeContractAsync } = useWriteContract()
  const publicClient = usePublicClient()
  const [search, setSearch] = useState('')
  const [requesting, setRequesting] = useState<number | null>(null)

  const filtered = datasets.filter(d => {
    if (!search) return true
    return d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.description.toLowerCase().includes(search.toLowerCase())
  })

  const handleRequestAccess = async (datasetId: number, pricePerAccess: string) => {
    setRequesting(datasetId)
    try {
      const txHash = await writeContractAsync({
        address: NEURORIGHTS_VAULT_ADDRESS,
        abi: NEURORIGHTS_VAULT_ABI,
        functionName: 'requestAccess',
        args: [BigInt(datasetId)],
        value: parseEther(pricePerAccess || '0.001'),
      })
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash: txHash })
      toast('Access requested — awaiting owner approval', 'success')
      refetch()
      refetchStatus()
    } catch (err: any) {
      console.error('Request access failed:', err)
      toast(`Transaction failed: ${err?.shortMessage || err?.message || 'Unknown error'}`, 'error')
    }
    setRequesting(null)
  }

  const doRefresh = () => { refetch(); refetchStatus() }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-accent animate-spin mb-4" />
        <p className="text-text-secondary text-sm">Loading datasets from chain...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Explore Datasets</h1>
        <p className="text-text-secondary text-sm mt-1">Browse all on-chain neurodata datasets</p>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, description..."
            className="w-full bg-elevated border border-border rounded-sm pl-10 pr-4 py-3 text-text-primary text-sm focus:outline-none focus:border-accent/50" />
        </div>
        <button onClick={doRefresh} className="flex items-center gap-2 px-4 py-3 bg-elevated hover:bg-overlay border border-border rounded-sm text-text-secondary text-sm transition-colors duration-200">
          <Filter className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="flex items-center gap-6 text-sm text-text-secondary">
        <span className="flex items-center gap-1.5">
          <Database className="w-4 h-4" />
          <span className="tabular-nums">{filtered.length}</span> datasets on-chain
        </span>
        <span className="flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-accent" />
          All data from smart contract
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-surface border border-border-subtle p-12 text-center">
          <Database className="w-10 h-10 text-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-primary">{search ? 'No matching datasets' : 'No datasets registered yet'}</h3>
          <p className="text-text-secondary text-sm mt-1">{search ? 'Try a different search term' : 'Be the first to upload and register a dataset on-chain.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((ds, i) => {
            const isOwner = ds.owner.toLowerCase() === address?.toLowerCase()
            const status = statusMap[ds.datasetId] || 'none'

            return (
              <div key={ds.datasetId} className="bg-surface border border-border-subtle p-5 transition-colors duration-200 hover:border-accent animate-tile-enter" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-sm bg-accent-dim flex items-center justify-center">
                    <Database className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex gap-2">
                    <span className="px-2 py-0.5 bg-surface border border-border-subtle text-text-muted text-[10px] font-mono rounded-full">#{ds.datasetId}</span>
                    {isOwner && <span className="px-2 py-0.5 bg-accent-dim text-accent text-xs rounded-full">Yours</span>}
                  </div>
                </div>

                <h3 className="font-medium text-text-primary">{ds.name}</h3>
                <p className="text-xs text-text-secondary mt-1 line-clamp-2">{ds.description}</p>
                <p className="text-[10px] text-text-muted font-mono mt-1">Owner: {ds.owner.slice(0, 6)}...{ds.owner.slice(-4)}</p>

                <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                  <div className="flex items-center gap-1.5 text-text-muted">
                    <Zap className="w-3 h-3" />
                    <span className="font-mono tabular-nums">{ds.channels}</span> ch / <span className="font-mono tabular-nums">{ds.samplingRate}</span>Hz
                  </div>
                  <div className="flex items-center gap-1.5 text-text-muted">
                    <Clock className="w-3 h-3" />
                    <span className="font-mono tabular-nums">{ds.duration}</span>s
                  </div>
                  <div className="flex items-center gap-1.5 text-text-muted col-span-2">
                    <DollarSign className="w-3 h-3" />
                    <span className="font-mono tabular-nums">{ds.pricePerAccess}</span> ETH per access
                  </div>
                </div>

                {/* Action button based on status */}
                {!isOwner && (
                  <div className="mt-4">
                    {status === 'licensed' ? (
                      <Link
                        to="/access"
                        className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-success-dim text-success text-sm rounded-sm transition-colors duration-200 font-medium"
                      >
                        <Check className="w-4 h-4" /> Licensed — View Data
                      </Link>
                    ) : status === 'pending' ? (
                      <button disabled className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-warning-dim text-warning text-sm rounded-sm font-medium opacity-80">
                        <Hourglass className="w-4 h-4" /> Pending Approval
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRequestAccess(ds.datasetId, ds.pricePerAccess)}
                        disabled={requesting === ds.datasetId}
                        className="w-full px-4 py-2 bg-accent hover:bg-accent-hover text-base text-sm rounded-sm transition-colors duration-200 font-medium disabled:opacity-50"
                      >
                        {requesting === ds.datasetId ? 'Confirming tx...' : `Request Access (${ds.pricePerAccess} ETH)`}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
