import { useState } from 'react'
import { useAccount, useWriteContract, usePublicClient } from 'wagmi'
import { Shield, UserX, Clock, AlertTriangle, Check, Plus, Loader2 } from 'lucide-react'
import { useMyDatasets, useAllMyLicenses } from '../lib/hooks'
import { NEURORIGHTS_VAULT_ADDRESS, NEURORIGHTS_VAULT_ABI } from '../lib/contract'
import { toast } from '../lib/toast'

export default function Licenses() {
  const { address, isConnected } = useAccount()
  const { myDatasets, isLoading, refetch } = useMyDatasets(address)
  const datasetIds = myDatasets.map(d => d.datasetId)
  const { licensesMap, refetch: refetchLicenses } = useAllMyLicenses(datasetIds)
  const { writeContractAsync } = useWriteContract()
  const publicClient = usePublicClient()

  const [showGrantModal, setShowGrantModal] = useState<number | null>(null)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [granting, setGranting] = useState(false)
  const [grantForm, setGrantForm] = useState({ researcher: '', purpose: '', days: '30' })

  const handleRevoke = async (datasetId: number, researcher: string) => {
    const key = `${datasetId}-${researcher}`
    setRevoking(key)
    try {
      const txHash = await writeContractAsync({
        address: NEURORIGHTS_VAULT_ADDRESS,
        abi: NEURORIGHTS_VAULT_ABI,
        functionName: 'revokeLicense',
        args: [BigInt(datasetId), researcher as `0x${string}`],
      })
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash: txHash })
      toast('License revoked successfully', 'success')
      refetch()
      refetchLicenses()
    } catch (err: any) {
      toast(`Revoke failed: ${err?.shortMessage || err?.message}`, 'error')
    }
    setRevoking(null)
  }

  const handleGrant = async (datasetId: number) => {
    setGranting(true)
    const durationSeconds = parseInt(grantForm.days) * 86400
    try {
      const txHash = await writeContractAsync({
        address: NEURORIGHTS_VAULT_ADDRESS,
        abi: NEURORIGHTS_VAULT_ABI,
        functionName: 'grantLicense',
        args: [
          BigInt(datasetId),
          grantForm.researcher as `0x${string}`,
          BigInt(durationSeconds),
          grantForm.purpose,
        ],
      })
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash: txHash })
      toast('License granted successfully', 'success')
      setShowGrantModal(null)
      setGrantForm({ researcher: '', purpose: '', days: '30' })
      refetch()
      refetchLicenses()
    } catch (err: any) {
      toast(`Grant failed: ${err?.shortMessage || err?.message}`, 'error')
    }
    setGranting(false)
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Shield className="w-12 h-12 text-text-muted mb-4" />
        <h2 className="text-xl font-bold text-text-primary">Connect Wallet</h2>
        <p className="text-text-secondary text-sm mt-2">Connect your wallet to manage licenses.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-accent animate-spin mb-4" />
        <p className="text-text-secondary text-sm">Loading licenses from chain...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">License Manager</h1>
        <p className="text-text-secondary text-sm mt-1">Grant and revoke on-chain access to your datasets</p>
      </div>

      {myDatasets.length === 0 ? (
        <div className="bg-surface border border-border-subtle p-12 text-center">
          <Shield className="w-10 h-10 text-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-primary">No datasets to manage</h3>
          <p className="text-text-secondary text-sm mt-1">Upload a dataset first to manage its licenses.</p>
        </div>
      ) : (
        myDatasets.map(ds => {
          const licenses = licensesMap[ds.datasetId] || []
          return (
            <div key={ds.datasetId} className="bg-surface border border-border-subtle overflow-hidden">
              <div className="p-5 border-b border-border-subtle flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-text-primary">{ds.name}</h3>
                  <p className="text-xs text-text-muted mt-0.5 font-mono">Dataset #{ds.datasetId} &middot; {ds.ipfsCid ? `${ds.ipfsCid.slice(0, 16)}...` : 'on-chain'}</p>
                </div>
                <button
                  onClick={() => setShowGrantModal(ds.datasetId)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-accent hover:bg-accent-hover text-base text-sm rounded-sm transition-colors duration-200"
                >
                  <Plus className="w-3.5 h-3.5" /> Grant License
                </button>
              </div>

              {licenses.length === 0 ? (
                <div className="p-8 text-center text-text-muted text-sm">No active licenses</div>
              ) : (
                <div className="divide-y divide-border-subtle">
                  {licenses.map((lic, i) => {
                    const key = `${ds.datasetId}-${lic.researcher}`
                    return (
                      <div key={i} className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-sm flex items-center justify-center ${lic.active ? 'bg-success-dim' : 'bg-danger-dim'}`}>
                            {lic.active ? <Check className="w-4 h-4 text-success" /> : <UserX className="w-4 h-4 text-danger" />}
                          </div>
                          <div>
                            <p className="text-sm font-mono text-text-primary">{lic.researcher.slice(0, 6)}...{lic.researcher.slice(-4)}</p>
                            <p className="text-xs text-text-secondary">{lic.purpose}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="flex items-center gap-1 text-xs text-text-muted">
                              <Clock className="w-3 h-3" />
                              <span>Expires {new Date(lic.expiry).toLocaleDateString()}</span>
                            </div>
                          </div>
                          {lic.active && (
                            <button
                              onClick={() => handleRevoke(ds.datasetId, lic.researcher)}
                              disabled={revoking === key}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-danger-dim hover:bg-danger/20 text-danger text-sm rounded-sm transition-colors duration-200 disabled:opacity-50"
                            >
                              {revoking === key ? 'Revoking...' : <><AlertTriangle className="w-3.5 h-3.5" /> Revoke</>}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })
      )}

      {/* Grant Modal */}
      {showGrantModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border-subtle p-6 w-full max-w-md mx-4 animate-slide-up">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Grant License (on-chain)</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-text-body mb-1.5">Researcher Address</label>
                <input value={grantForm.researcher} onChange={e => setGrantForm(f => ({ ...f, researcher: e.target.value }))} placeholder="0x..."
                  className="w-full bg-elevated border border-border rounded-sm px-4 py-3 text-text-primary text-sm font-mono focus:outline-none focus:border-accent/50" />
              </div>
              <div>
                <label className="block text-sm text-text-body mb-1.5">Purpose</label>
                <input value={grantForm.purpose} onChange={e => setGrantForm(f => ({ ...f, purpose: e.target.value }))} placeholder="e.g., Alzheimer's research study"
                  className="w-full bg-elevated border border-border rounded-sm px-4 py-3 text-text-primary text-sm focus:outline-none focus:border-accent/50" />
              </div>
              <div>
                <label className="block text-sm text-text-body mb-1.5">Duration (days)</label>
                <input type="number" value={grantForm.days} onChange={e => setGrantForm(f => ({ ...f, days: e.target.value }))}
                  className="w-full bg-elevated border border-border rounded-sm px-4 py-3 text-text-primary text-sm focus:outline-none focus:border-accent/50" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowGrantModal(null)} className="flex-1 px-4 py-2.5 bg-elevated hover:bg-overlay text-text-body rounded-sm transition-colors duration-200">Cancel</button>
              <button onClick={() => handleGrant(showGrantModal)} disabled={!grantForm.researcher || !grantForm.purpose || granting}
                className="flex-1 px-4 py-2.5 bg-accent hover:bg-accent-hover text-base rounded-sm transition-colors duration-200 disabled:opacity-50 font-medium">
                {granting ? 'Sending tx...' : 'Grant Access'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
