import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWriteContract, usePublicClient } from 'wagmi'
import { Database, Users, DollarSign, Clock, ChevronDown, ChevronUp, ExternalLink, Loader2, Wallet } from 'lucide-react'
import type { OnChainDataset, OnChainLicense } from '../lib/hooks'
import { getIPFSUrl } from '../lib/storacha'
import { NEURORIGHTS_VAULT_ADDRESS, NEURORIGHTS_VAULT_ABI } from '../lib/contract'
import { toast } from '../lib/toast'
import { getWithdrawnAmount, recordWithdrawal } from '../lib/withdrawTracker'

interface Props {
  dataset: OnChainDataset
  licenses: OnChainLicense[]
  onRefetch?: () => void
}

export default function DatasetCard({ dataset, licenses, onRefetch }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)
  const navigate = useNavigate()
  const { writeContractAsync } = useWriteContract()
  const publicClient = usePublicClient()
  const activeLicenses = licenses.filter(l => l.active).length
  const hasIpfsCid = dataset.ipfsCid && dataset.ipfsCid.startsWith('bafy')

  const totalEarned = parseFloat(dataset.totalEarnings)
  const alreadyWithdrawn = getWithdrawnAmount(dataset.datasetId)
  const withdrawable = Math.max(totalEarned - alreadyWithdrawn, 0)
  const hasWithdrawable = withdrawable > 0.000001

  const handleWithdraw = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setWithdrawing(true)
    try {
      const tx = await writeContractAsync({
        address: NEURORIGHTS_VAULT_ADDRESS,
        abi: NEURORIGHTS_VAULT_ABI,
        functionName: 'withdraw',
        args: [BigInt(dataset.datasetId)],
      })
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash: tx })
      recordWithdrawal(dataset.datasetId, totalEarned)
      toast(`Withdrawn ${withdrawable.toFixed(4)} ETH successfully`, 'success')
      onRefetch?.()
    } catch (err: any) {
      const msg = err?.shortMessage || err?.message || ''
      if (msg.includes('No earnings')) {
        recordWithdrawal(dataset.datasetId, totalEarned)
        toast('Already withdrawn — no earnings available', 'info')
      } else {
        toast(`Withdraw failed: ${msg}`, 'error')
      }
    }
    setWithdrawing(false)
  }

  return (
    <div className="bg-surface border border-border-subtle overflow-hidden transition-colors duration-200 hover:border-accent">
      <div className="p-5 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-accent-dim flex items-center justify-center shrink-0">
              <Database className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="font-medium text-text-primary">{dataset.name}</h3>
              <p className="text-xs text-text-muted mt-0.5 font-mono">
                ID #{dataset.datasetId} &middot; {dataset.ipfsCid ? `${dataset.ipfsCid.slice(0, 12)}...` : 'on-chain'}
              </p>
            </div>
          </div>
          {expanded ? <ChevronUp className="w-5 h-5 text-text-muted" /> : <ChevronDown className="w-5 h-5 text-text-muted" />}
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="grid grid-cols-3 gap-3 flex-1">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-text-muted" />
              <div>
                <p className="text-xs text-text-muted">Licenses</p>
                <p className="text-sm font-medium text-text-primary tabular-nums">{activeLicenses}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-text-muted" />
              <div>
                <p className="text-xs text-text-muted">Earned</p>
                <p className="text-sm font-medium text-success tabular-nums">{dataset.totalEarnings} ETH</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-text-muted" />
              <div>
                <p className="text-xs text-text-muted">Uploaded</p>
                <p className="text-sm font-medium text-text-primary tabular-nums">{new Date(dataset.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
          {hasWithdrawable && (
            <button onClick={handleWithdraw} disabled={withdrawing}
              className="ml-3 px-3 py-1.5 bg-success-dim hover:bg-success/20 text-success text-xs font-medium rounded-sm transition-colors duration-200 inline-flex items-center gap-1.5 shrink-0 disabled:opacity-50">
              {withdrawing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wallet className="w-3 h-3" />}
              Withdraw {withdrawable.toFixed(4)}
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border px-5 py-4 animate-slide-up">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-text-muted">Channels:</span> <span className="text-text-body tabular-nums">{dataset.channels}</span></div>
            <div><span className="text-text-muted">Sample Rate:</span> <span className="text-text-body tabular-nums">{dataset.samplingRate}Hz</span></div>
            <div><span className="text-text-muted">Duration:</span> <span className="text-text-body tabular-nums">{dataset.duration}s</span></div>
            <div><span className="text-text-muted">Price:</span> <span className="text-text-body tabular-nums">{dataset.pricePerAccess} ETH</span></div>
          </div>
          <p className="text-sm text-text-secondary mt-3">{dataset.description}</p>

          {/* Active licenses list */}
          {activeLicenses > 0 && (
            <div className="mt-4 border-t border-border-subtle pt-3">
              <p className="text-xs text-text-muted uppercase tracking-wider mb-2">Active Licenses</p>
              {licenses.filter(l => l.active).map((lic, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 text-xs">
                  <span className="font-mono text-text-body">{lic.researcher.slice(0, 6)}...{lic.researcher.slice(-4)}</span>
                  <span className="text-text-muted">{lic.purpose}</span>
                  <span className="text-text-muted tabular-nums">exp {new Date(lic.expiry).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-3 mt-4">
            <button
              onClick={(e) => { e.stopPropagation(); navigate('/licenses') }}
              className="px-4 py-2 bg-accent hover:bg-accent-hover text-base text-sm rounded-sm transition-colors duration-200 font-medium"
            >
              Manage Licenses
            </button>
            {hasIpfsCid ? (
              <a href={getIPFSUrl(dataset.ipfsCid)} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                className="px-4 py-2 bg-elevated hover:bg-overlay text-text-body text-sm rounded-sm transition-colors duration-200 inline-flex items-center gap-1.5">
                View on IPFS <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : null}
            <a href={`https://sepolia.basescan.org/address/${NEURORIGHTS_VAULT_ADDRESS}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
              className="px-4 py-2 bg-elevated hover:bg-overlay text-text-body text-sm rounded-sm transition-colors duration-200 inline-flex items-center gap-1.5">
              BaseScan <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
