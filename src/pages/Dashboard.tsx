import { useEffect, useRef, useState } from 'react'
import { useAccount, useWriteContract, usePublicClient } from 'wagmi'
import { Link } from 'react-router-dom'
import { Database, Shield, DollarSign, Activity, Upload, Loader2, Wallet } from 'lucide-react'
import { useMyDatasets, useAllMyLicenses } from '../lib/hooks'
import { NEURORIGHTS_VAULT_ADDRESS, NEURORIGHTS_VAULT_ABI } from '../lib/contract'
import { toast } from '../lib/toast'
import { getWithdrawnAmount, recordWithdrawal } from '../lib/withdrawTracker'
import DatasetCard from '../components/DatasetCard'

function useCountUp(target: number, duration = 600, enabled = true) {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number>(0)
  useEffect(() => {
    if (!enabled) { setValue(target); return }
    let start: number | null = null
    const step = (ts: number) => {
      if (!start) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      setValue((1 - Math.pow(1 - progress, 3)) * target)
      if (progress < 1) rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration, enabled])
  return value
}

function StatTile({ icon: Icon, label, value, numericValue, suffix, accentColor = 'bg-accent', barPercent, delay }: {
  icon: typeof Database; label: string; value: string; numericValue: number; suffix?: string; accentColor?: string; barPercent: number; delay: number
}) {
  const count = useCountUp(numericValue, 600, numericValue > 0)
  const isDecimal = suffix === ' ETH'
  const displayValue = numericValue === 0 ? value : isDecimal ? count.toFixed(4) : Math.round(count).toString()

  return (
    <div className="bg-surface border border-border-subtle p-5 flex flex-col justify-between min-h-[140px] animate-tile-enter" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between mb-4">
        <Icon className="w-5 h-5 text-accent" />
        <span className="text-[10px] text-text-muted uppercase tracking-widest font-mono">{label}</span>
      </div>
      <div>
        <p className="text-3xl font-bold text-text-primary tabular-nums leading-none">
          {displayValue}
          {numericValue > 0 && suffix && <span className="text-sm text-text-secondary font-normal ml-1.5">{suffix}</span>}
        </p>
        <div className="mt-4 h-[2px] bg-border-subtle overflow-hidden">
          <div className={`h-full ${accentColor} transition-all duration-700 ease-out`} style={{ width: `${barPercent}%`, transitionDelay: `${delay + 300}ms` }} />
        </div>
      </div>
    </div>
  )
}

function SovereigntyRing({ score, show }: { score: number; show: boolean }) {
  const c = 2 * Math.PI * 40
  return (
    <div className="relative w-28 h-28 mx-auto">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r="40" fill="none" stroke="#21262d" strokeWidth="6" />
        <circle cx="50" cy="50" r="40" fill="none" stroke="#00f5d4" strokeWidth="6" strokeDasharray={c} strokeDashoffset={show ? c - (score / 100) * c : c} strokeLinecap="round" className="transition-all duration-1000 ease-out" style={{ transitionDelay: '400ms' }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-accent tabular-nums">{score}</span>
    </div>
  )
}

const Logo = ({ className = 'w-16 h-16' }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className={className}>
    <rect width="32" height="32" rx="8" fill="#0a0a0c" />
    <circle cx="16" cy="16" r="3" fill="#6c5ce7" />
    <path d="M16 8v5M16 19v5M8 16h5M19 16h5M10.3 10.3l3.5 3.5M18.2 18.2l3.5 3.5M21.7 10.3l-3.5 3.5M13.8 18.2l-3.5 3.5" stroke="#00f5d4" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
  </svg>
)

export default function Dashboard() {
  const { address, isConnected } = useAccount()
  const { myDatasets, isLoading, refetch } = useMyDatasets(address)
  const datasetIds = myDatasets.map(d => d.datasetId)
  const { licensesMap } = useAllMyLicenses(datasetIds)
  const { writeContractAsync } = useWriteContract()
  const publicClient = usePublicClient()
  const [mounted, setMounted] = useState(false)
  const [withdrawingAll, setWithdrawingAll] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const totalEarnings = myDatasets.reduce((sum, d) => sum + parseFloat(d.totalEarnings || '0'), 0)
  const totalWithdrawn = myDatasets.reduce((sum, d) => sum + getWithdrawnAmount(d.datasetId), 0)
  const totalWithdrawable = Math.max(totalEarnings - totalWithdrawn, 0)

  const handleWithdrawAll = async () => {
    const datasetsWithBalance = myDatasets.filter(d => {
      const earned = parseFloat(d.totalEarnings || '0')
      const withdrawn = getWithdrawnAmount(d.datasetId)
      return earned - withdrawn > 0.000001
    })
    if (datasetsWithBalance.length === 0) {
      toast('No earnings to withdraw', 'info')
      return
    }
    setWithdrawingAll(true)
    let successCount = 0
    for (const ds of datasetsWithBalance) {
      try {
        const tx = await writeContractAsync({
          address: NEURORIGHTS_VAULT_ADDRESS,
          abi: NEURORIGHTS_VAULT_ABI,
          functionName: 'withdraw',
          args: [BigInt(ds.datasetId)],
        })
        if (publicClient) await publicClient.waitForTransactionReceipt({ hash: tx })
        recordWithdrawal(ds.datasetId, parseFloat(ds.totalEarnings))
        successCount++
      } catch (err: any) {
        const msg = err?.shortMessage || err?.message || ''
        if (msg.includes('No earnings')) {
          recordWithdrawal(ds.datasetId, parseFloat(ds.totalEarnings))
        } else {
          toast(`Withdraw failed for ${ds.name}: ${msg}`, 'error')
        }
      }
    }
    if (successCount > 0) {
      toast(`Withdrawn from ${successCount} dataset${successCount > 1 ? 's' : ''} successfully`, 'success')
    }
    refetch()
    setWithdrawingAll(false)
  }
  const totalLicenses = Object.values(licensesMap).flat().filter(l => l.active).length

  // Compute sovereignty score from real metrics (0-100)
  const sovereigntyScore = (() => {
    if (myDatasets.length === 0) return 0
    let score = 0
    // Base: has datasets on-chain (25 pts)
    score += Math.min(myDatasets.length * 10, 25)
    // Encryption: all datasets use Lit Protocol (25 pts)
    const litCount = myDatasets.filter(d => d.litEncrypted).length
    score += Math.round((litCount / myDatasets.length) * 25)
    // Decentralized storage: all have IPFS CIDs (20 pts)
    const ipfsCount = myDatasets.filter(d => d.ipfsCid && d.ipfsCid.startsWith('bafy')).length
    score += Math.round((ipfsCount / myDatasets.length) * 20)
    // Active licensing: has active licenses (15 pts)
    score += totalLicenses > 0 ? Math.min(totalLicenses * 5, 15) : 0
    // Earning from data: monetization active (15 pts)
    score += totalEarnings > 0 ? 15 : 0
    return Math.min(score, 100)
  })()

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center animate-slide-up">
        <Logo className="w-20 h-20 mb-8" />
        <h2 className="text-3xl font-bold text-text-primary tracking-tight">Connect Your Wallet</h2>
        <p className="text-text-secondary mt-3 max-w-sm text-sm leading-relaxed">Link your wallet to access your NeuroRights Vault and manage your brain data sovereignty.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-accent animate-spin mb-4" />
        <p className="text-text-secondary text-sm">Loading on-chain data...</p>
      </div>
    )
  }

  const stats = [
    { icon: Database, label: 'Datasets', value: myDatasets.length.toString(), numericValue: myDatasets.length, barPercent: Math.min(myDatasets.length * 20, 100), delay: 0, accentColor: 'bg-accent' },
    { icon: Shield, label: 'Active Licenses', value: totalLicenses.toString(), numericValue: totalLicenses, barPercent: Math.min(totalLicenses * 15, 100), delay: 80, accentColor: 'bg-purple' },
    { icon: DollarSign, label: 'Total Earned', value: totalEarnings.toFixed(4), numericValue: totalEarnings, suffix: ' ETH', barPercent: Math.min(totalEarnings * 50, 100), delay: 160, accentColor: 'bg-success' },
    { icon: Activity, label: 'Sovereignty Score', value: sovereigntyScore > 0 ? sovereigntyScore.toString() : '\u2014', numericValue: sovereigntyScore, barPercent: sovereigntyScore, delay: 240, accentColor: 'bg-warning' },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {stats.map((stat, i) => <StatTile key={i} {...stat} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        <div className="lg:col-span-3 space-y-3">
          <div className="bg-surface border border-border-subtle p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-text-primary tracking-tight">Your Datasets (on-chain)</h2>
              <div className="flex items-center gap-2">
                {totalWithdrawable > 0.000001 && (
                  <button onClick={handleWithdrawAll} disabled={withdrawingAll}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-success-dim hover:bg-success/20 text-success text-xs font-medium rounded-sm transition-colors duration-200 disabled:opacity-50">
                    {withdrawingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wallet className="w-3.5 h-3.5" />}
                    Withdraw All ({totalWithdrawable.toFixed(4)} ETH)
                  </button>
                )}
              <Link to="/upload" className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-base text-xs font-medium rounded-sm transition-colors duration-200">
                <Upload className="w-3.5 h-3.5" /> Upload EEG
              </Link>
              </div>
            </div>
            {myDatasets.length === 0 ? (
              <div className="border border-border border-dashed p-10 text-center">
                <Database className="w-8 h-8 text-text-muted mx-auto mb-3" />
                <h3 className="text-sm font-medium text-text-primary">No datasets yet</h3>
                <p className="text-text-secondary mt-1 mb-5 max-w-xs mx-auto text-xs leading-relaxed">Upload your first EEG dataset to register it on-chain.</p>
                <Link to="/upload" className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent-hover text-base text-xs font-medium rounded-sm transition-colors duration-200">
                  <Upload className="w-3.5 h-3.5" /> Upload First Dataset
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {myDatasets.map(ds => (
                  <DatasetCard key={ds.datasetId} dataset={ds} licenses={licensesMap[ds.datasetId] || []} onRefetch={refetch} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-surface border border-border-subtle p-5 animate-tile-enter" style={{ animationDelay: '300ms', boxShadow: myDatasets.length > 0 ? '0 0 30px -8px rgba(0, 245, 212, 0.08)' : 'none' }}>
            <h2 className="text-sm font-semibold text-text-primary tracking-tight mb-6">Sovereignty Health</h2>
            <SovereigntyRing score={sovereigntyScore} show={mounted && myDatasets.length > 0} />
            {myDatasets.length > 0 ? (
              <div className="mt-6 space-y-3">
                {[
                  { label: 'Lit Protocol access-controlled encryption', ok: myDatasets.some(d => d.litEncrypted) },
                  { label: 'Stored on decentralized IPFS (Storacha)', ok: myDatasets.some(d => d.ipfsCid?.startsWith('bafy')) },
                  { label: 'Registered on Base Sepolia', ok: myDatasets.length > 0 },
                  { label: 'Active licenses generating revenue', ok: totalLicenses > 0 },
                ].map((c, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${c.ok ? 'bg-success' : 'bg-warning'}`} />
                    <span className="text-xs text-text-body leading-relaxed">{c.label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-xs text-text-muted mt-5">Upload a dataset to see your sovereignty score</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
