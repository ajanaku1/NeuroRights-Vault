import { useState } from 'react'
import { useAccount, useConnectorClient } from 'wagmi'
import { Link } from 'react-router-dom'
import { Database, Clock, Zap, Download, FolderKey, Loader2, Hourglass, Lock, Eye } from 'lucide-react'
import { useMyLicensedDatasets } from '../lib/hooks'
import { fetchFromIPFS } from '../lib/storacha'
const getLitDecrypt = () => import('../lib/lit').then(m => m.litDecrypt)
import type { OnChainDataset } from '../lib/hooks'

function DecryptButton({ dataset }: { dataset: OnChainDataset }) {
  const { data: connectorClient } = useConnectorClient()
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [decryptedData, setDecryptedData] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const handleDecrypt = async () => {
    if (!connectorClient?.transport) return
    setStatus('loading')
    setErrorMsg('')
    try {
      const ciphertext = await fetchFromIPFS(dataset.ipfsCid)
      // Parse dataToEncryptHash from on-chain metadata
      let metadata: any = {}
      try { metadata = JSON.parse(dataset.description) } catch {}
      // dataToEncryptHash is stored alongside ipfsCid in the metadata JSON
      // We need to get it from the raw on-chain metadata, which is parsed in hooks.ts
      // The dataset object has description from parsed metadata, but we stored dataToEncryptHash there
      const dataToEncryptHash = (dataset as any).dataToEncryptHash

      if (!dataToEncryptHash) {
        throw new Error('Dataset missing decryption hash — may use legacy encryption')
      }

      const litDecryptFn = await getLitDecrypt()
      const decrypted = await litDecryptFn(
        ciphertext,
        dataToEncryptHash,
        dataset.datasetId.toString(),
        connectorClient.transport
      )
      setDecryptedData(decrypted)
      setStatus('done')
    } catch (err: any) {
      console.error('Decrypt error:', err)
      setErrorMsg(err?.message || 'Decryption failed')
      setStatus('error')
    }
  }

  const handleDownload = () => {
    if (!decryptedData) return
    const blob = new Blob([decryptedData], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${dataset.name}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (status === 'done' && decryptedData) {
    return (
      <div className="mt-4 space-y-2">
        <div className="flex gap-2">
          <button onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent-hover text-base text-sm rounded-sm transition-colors duration-200 font-medium">
            <Download className="w-3.5 h-3.5" /> Download CSV
          </button>
        </div>
        <pre className="max-h-32 overflow-auto bg-elevated p-2 rounded-sm text-[10px] text-text-secondary font-mono">
          {decryptedData.slice(0, 500)}{decryptedData.length > 500 ? '...' : ''}
        </pre>
      </div>
    )
  }

  return (
    <div className="mt-4">
      <button onClick={handleDecrypt} disabled={status === 'loading'}
        className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent-hover text-base text-sm rounded-sm transition-colors duration-200 font-medium disabled:opacity-50">
        {status === 'loading' ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Decrypting...</>
        ) : (
          <><Lock className="w-3.5 h-3.5" /> Decrypt & Access Data</>
        )}
      </button>
      {status === 'error' && (
        <p className="text-xs text-danger mt-1.5">{errorMsg}</p>
      )}
    </div>
  )
}

export default function MyAccess() {
  const { address, isConnected } = useAccount()
  const { licensedDatasets, pendingDatasets, isLoading, refetch } = useMyLicensedDatasets(address)

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <FolderKey className="w-12 h-12 text-text-muted mb-4" />
        <h2 className="text-xl font-bold text-text-primary">Connect Wallet</h2>
        <p className="text-text-secondary text-sm mt-2">Connect your wallet to see datasets you have access to.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-accent animate-spin mb-4" />
        <p className="text-text-secondary text-sm">Loading your licensed datasets...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">My Access</h1>
          <p className="text-text-secondary text-sm mt-1">Datasets you have licensed access to</p>
        </div>
        <button onClick={() => refetch()} className="px-3 py-1.5 bg-elevated hover:bg-overlay border border-border rounded-sm text-text-secondary text-xs transition-colors duration-200">
          Refresh
        </button>
      </div>

      {/* Pending Requests */}
      {pendingDatasets.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-warning uppercase tracking-wider mb-3 flex items-center gap-2">
            <Hourglass className="w-4 h-4" /> Pending Requests
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingDatasets.map((ds, i) => (
              <div key={ds.datasetId} className="bg-surface border border-warning/20 p-5 animate-tile-enter" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-sm bg-warning-dim flex items-center justify-center">
                    <Hourglass className="w-5 h-5 text-warning" />
                  </div>
                  <span className="px-2 py-0.5 bg-warning-dim text-warning text-[10px] font-mono rounded-full">Pending</span>
                </div>
                <h3 className="font-medium text-text-primary">{ds.name}</h3>
                <p className="text-xs text-text-secondary mt-1 line-clamp-2">{ds.description}</p>
                <p className="text-[10px] text-text-muted font-mono mt-2">Owner: {ds.owner.slice(0, 6)}...{ds.owner.slice(-4)}</p>
                <div className="mt-3 text-xs text-warning">Awaiting owner approval...</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Licensed Datasets */}
      {licensedDatasets.length > 0 ? (
        <div>
          <h2 className="text-sm font-semibold text-success uppercase tracking-wider mb-3 flex items-center gap-2">
            <FolderKey className="w-4 h-4" /> Active Licenses ({licensedDatasets.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {licensedDatasets.map((ds, i) => {
              const hasIpfsCid = ds.ipfsCid && ds.ipfsCid.startsWith('bafy')
              return (
                <div key={ds.datasetId} className="bg-surface border border-success/20 p-5 animate-tile-enter" style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-sm bg-success-dim flex items-center justify-center">
                      <Database className="w-5 h-5 text-success" />
                    </div>
                    <span className="px-2 py-0.5 bg-success-dim text-success text-[10px] font-mono rounded-full">Licensed</span>
                  </div>
                  <h3 className="font-medium text-text-primary">{ds.name}</h3>
                  <p className="text-xs text-text-secondary mt-1 line-clamp-2">{ds.description}</p>
                  <p className="text-[10px] text-text-muted font-mono mt-2">Owner: {ds.owner.slice(0, 6)}...{ds.owner.slice(-4)}</p>

                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                    <div className="flex items-center gap-1.5 text-text-muted">
                      <Zap className="w-3 h-3" />
                      <span className="font-mono tabular-nums">{ds.channels}</span> ch / <span className="font-mono tabular-nums">{ds.samplingRate}</span>Hz
                    </div>
                    <div className="flex items-center gap-1.5 text-text-muted">
                      <Clock className="w-3 h-3" />
                      <span className="font-mono tabular-nums">{ds.duration}</span>s
                    </div>
                  </div>

                  {hasIpfsCid && <DecryptButton dataset={ds} />}
                </div>
              )
            })}
          </div>
        </div>
      ) : pendingDatasets.length === 0 ? (
        <div className="bg-surface border border-border-subtle p-12 text-center">
          <FolderKey className="w-10 h-10 text-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-primary">No licensed datasets yet</h3>
          <p className="text-text-secondary text-sm mt-1 mb-5">Browse and request access to datasets on the Explore page.</p>
          <Link to="/explore" className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent-hover text-base text-xs font-medium rounded-sm transition-colors duration-200">
            Explore Datasets
          </Link>
        </div>
      ) : null}
    </div>
  )
}
