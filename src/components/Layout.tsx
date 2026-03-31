import { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAccount, useWriteContract, usePublicClient } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import {
  LayoutDashboard,
  Upload,
  Shield,
  Compass,
  Activity,
  FolderKey,
  ChevronLeft,
  ChevronRight,
  Bell,
  Check,
  X,
} from 'lucide-react'
import { usePendingRequests, useResearcherNotifications, useAllDatasets } from '../lib/hooks'
import { NEURORIGHTS_VAULT_ADDRESS, NEURORIGHTS_VAULT_ABI } from '../lib/contract'
import { toast } from '../lib/toast'
import Toasts from './Toasts'

const navItems = [
  { to: '/vault', icon: LayoutDashboard, label: 'Vault', shortcut: '1' },
  { to: '/upload', icon: Upload, label: 'Upload', shortcut: '2' },
  { to: '/licenses', icon: Shield, label: 'Licenses', shortcut: '3' },
  { to: '/explore', icon: Compass, label: 'Explore', shortcut: '4' },
  { to: '/access', icon: FolderKey, label: 'My Access', shortcut: '5' },
  { to: '/activity', icon: Activity, label: 'Activity', shortcut: '6' },
]

const pageTitles: Record<string, string> = {
  '/vault': 'Vault',
  '/upload': 'Upload',
  '/licenses': 'Licenses',
  '/explore': 'Explore',
  '/access': 'My Access',
  '/activity': 'Activity',
}

const Logo = ({ className = 'w-8 h-8' }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className={className}>
    <rect width="32" height="32" rx="8" fill="#0a0a0c" />
    <circle cx="16" cy="16" r="3" fill="#6c5ce7" />
    <path d="M16 8v5M16 19v5M8 16h5M19 16h5M10.3 10.3l3.5 3.5M18.2 18.2l3.5 3.5M21.7 10.3l-3.5 3.5M13.8 18.2l-3.5 3.5" stroke="#00f5d4" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
  </svg>
)

function NotificationBell() {
  const { address } = useAccount()
  const navigate = useNavigate()
  const { requests, refetch: refetchRequests } = usePendingRequests(address)
  const { notifications: researcherNotifs, refetch: refetchNotifs } = useResearcherNotifications(address)
  const { datasets } = useAllDatasets()
  const { writeContractAsync } = useWriteContract()
  const publicClient = usePublicClient()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])
  const [dismissedNotifs, setDismissedNotifs] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('neurorights:dismissed-notifs')
      return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch { return new Set() }
  })

  useEffect(() => {
    localStorage.setItem('neurorights:dismissed-notifs', JSON.stringify([...dismissedNotifs]))
  }, [dismissedNotifs])

  const visibleResearcherNotifs = researcherNotifs.filter(n => !dismissedNotifs.has(n.txHash))
  const totalCount = requests.length + visibleResearcherNotifs.length

  const handleApprove = async (datasetId: number, requestIndex: number) => {
    const key = `${datasetId}-${requestIndex}`
    setProcessing(key)
    try {
      const tx = await writeContractAsync({
        address: NEURORIGHTS_VAULT_ADDRESS,
        abi: NEURORIGHTS_VAULT_ABI,
        functionName: 'approveAccess',
        args: [BigInt(datasetId), BigInt(requestIndex), BigInt(30 * 86400), 'Approved access request'],
      })
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash: tx })
      toast('Access approved — license granted', 'success')
      refetchRequests()
    } catch (err: any) {
      toast(`Approve failed: ${err?.shortMessage || err?.message}`, 'error')
    }
    setProcessing(null)
  }

  const handleReject = async (datasetId: number, requestIndex: number) => {
    const key = `${datasetId}-${requestIndex}`
    setProcessing(key)
    try {
      const tx = await writeContractAsync({
        address: NEURORIGHTS_VAULT_ADDRESS,
        abi: NEURORIGHTS_VAULT_ABI,
        functionName: 'rejectAccess',
        args: [BigInt(datasetId), BigInt(requestIndex)],
      })
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash: tx })
      toast('Access rejected — funds refunded', 'success')
      refetchRequests()
    } catch (err: any) {
      toast(`Reject failed: ${err?.shortMessage || err?.message}`, 'error')
    }
    setProcessing(null)
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => { setOpen(!open); if (!open) { refetchRequests(); refetchNotifs() } }}
        className="relative w-9 h-9 flex items-center justify-center rounded-sm hover:bg-elevated transition-colors duration-200"
        aria-label="Notifications"
      >
        <Bell className="w-[18px] h-[18px] text-text-secondary" />
        {totalCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-warning text-base text-[10px] font-bold rounded-full flex items-center justify-center">
            {totalCount}
          </span>
        )}
      </button>

      {open && (
          <div className="absolute right-0 top-11 z-50 w-80 bg-surface border border-border-subtle shadow-xl shadow-black/40 overflow-hidden">
            <div className="px-4 py-3 border-b border-border-subtle">
              <span className="text-xs font-semibold text-text-primary uppercase tracking-wider">Notifications</span>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {/* Researcher notifications — approved/rejected */}
              {visibleResearcherNotifs.map((notif) => {
                const ds = datasets.find(d => d.datasetId === notif.datasetId)
                return (
                  <div key={notif.txHash} className={`px-4 py-3 border-b border-border-subtle ${notif.type === 'approved' ? 'border-l-2 border-l-success' : 'border-l-2 border-l-danger'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-text-primary">
                          {notif.type === 'approved' ? 'Access Approved' : 'Access Rejected'}
                        </p>
                        <p className="text-[10px] text-text-secondary mt-0.5">
                          {ds?.name || `Dataset #${notif.datasetId}`}
                        </p>
                        <p className={`text-[10px] mt-0.5 ${notif.type === 'approved' ? 'text-success' : 'text-danger'}`}>
                          {notif.type === 'approved' ? 'You now have access — view in My Access' : 'Your payment has been refunded'}
                        </p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        {notif.type === 'approved' && (
                          <button
                            onClick={() => { navigate('/access'); setOpen(false) }}
                            className="px-2 py-1 bg-success-dim text-success text-[10px] rounded-sm hover:bg-success/20 transition-colors"
                          >
                            View
                          </button>
                        )}
                        <button
                          onClick={() => setDismissedNotifs(prev => new Set([...prev, notif.txHash]))}
                          className="w-6 h-6 flex items-center justify-center text-text-muted hover:text-text-secondary"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Owner notifications — pending requests */}
              {requests.length > 0 && (
                <div className="px-4 py-2 border-b border-border-subtle bg-elevated/50">
                  <span className="text-[10px] text-text-muted uppercase tracking-wider">Pending Requests ({requests.length})</span>
                </div>
              )}
              {requests.map((req) => {
                const key = `${req.datasetId}-${req.requestIndex}`
                const isProcessing = processing === key
                return (
                  <div key={key} className="px-4 py-3 border-b border-border-subtle border-l-2 border-l-warning">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-text-primary font-medium truncate">{req.datasetName}</p>
                        <p className="text-[10px] text-text-muted font-mono mt-0.5">From: {req.requester.slice(0, 6)}...{req.requester.slice(-4)}</p>
                        <p className="text-[10px] text-accent mt-0.5">{req.amount} ETH</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button onClick={() => handleApprove(req.datasetId, req.requestIndex)} disabled={isProcessing}
                          className="w-7 h-7 flex items-center justify-center bg-success-dim hover:bg-success/20 text-success rounded-sm transition-colors duration-200 disabled:opacity-50"
                          title="Approve — grant 30-day license, receive payment">
                          {isProcessing ? <span className="w-3 h-3 border border-success border-t-transparent rounded-full animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => handleReject(req.datasetId, req.requestIndex)} disabled={isProcessing}
                          className="w-7 h-7 flex items-center justify-center bg-danger-dim hover:bg-danger/20 text-danger rounded-sm transition-colors duration-200 disabled:opacity-50"
                          title="Reject — refund payment to requester">
                          {isProcessing ? <span className="w-3 h-3 border border-danger border-t-transparent rounded-full animate-spin" /> : <X className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Empty state */}
              {requests.length === 0 && visibleResearcherNotifs.length === 0 && (
                <div className="px-4 py-8 text-center text-text-muted text-xs">No notifications</div>
              )}
            </div>
          </div>
      )}
    </div>
  )
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const pageTitle = pageTitles[location.pathname] || 'Vault'
  const sidebarWidth = collapsed ? 'w-16' : 'w-56'
  const contentMargin = collapsed ? 'ml-16' : 'ml-56'

  return (
    <div className="min-h-screen bg-base">
      <Toasts />
      {/* ===== DESKTOP SIDEBAR ===== */}
      <aside className={`hidden md:flex flex-col fixed top-0 left-0 h-screen bg-surface border-r border-border-subtle z-40 transition-all duration-300 ease-out ${sidebarWidth}`}>
        <Link to="/" className="flex items-center gap-2.5 px-4 h-14 shrink-0">
          <Logo className="w-8 h-8 shrink-0" />
          {!collapsed && (
            <span className="font-semibold text-text-primary text-[15px] tracking-tight whitespace-nowrap">
              Neuro<span className="text-accent">Rights</span>
            </span>
          )}
        </Link>

        <nav className="flex-1 flex flex-col gap-0.5 px-2 mt-2">
          {navItems.map(({ to, icon: Icon, label, shortcut }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 h-10 rounded-sm text-sm transition-colors duration-200 ${collapsed ? 'justify-center px-0' : 'px-3'} ${isActive ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:text-text-primary hover:bg-elevated'}`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-accent rounded-r-sm" />}
                  <Icon className="w-[18px] h-[18px] shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate">{label}</span>
                      <span className="text-[11px] text-text-muted font-mono opacity-0 group-hover:opacity-100 transition-opacity duration-200">{shortcut}</span>
                    </>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="shrink-0 border-t border-border-subtle">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center h-10 text-text-muted hover:text-text-secondary hover:bg-elevated transition-colors duration-200"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* ===== DESKTOP CONTENT ===== */}
      <div className={`hidden md:flex flex-col min-h-screen transition-all duration-300 ease-out ${contentMargin}`}>
        <header className="sticky top-0 z-30 h-12 flex items-center justify-between px-6 bg-base/80 backdrop-blur-md border-b border-border-subtle">
          <h1 className="text-sm font-medium text-text-secondary tracking-wide uppercase">{pageTitle}</h1>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
          </div>
        </header>
        <main className="flex-1 p-6 overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      {/* ===== MOBILE LAYOUT ===== */}
      <div className="md:hidden flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 h-12 flex items-center justify-between px-4 bg-surface border-b border-border-subtle">
          <Link to="/" className="flex items-center gap-2">
            <Logo className="w-6 h-6" />
            <span className="text-sm font-semibold text-text-primary">Neuro<span className="text-accent">Rights</span></span>
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <ConnectButton showBalance={false} chainStatus="none" accountStatus="avatar" />
          </div>
        </header>

        <main className="flex-1 px-4 py-4 pb-20">
          <Outlet />
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border-subtle">
          <div className="flex items-center justify-around h-14">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] transition-colors duration-200 ${isActive ? 'text-accent' : 'text-text-muted'}`
                }
              >
                <Icon className="w-5 h-5" />
                {label}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  )
}
