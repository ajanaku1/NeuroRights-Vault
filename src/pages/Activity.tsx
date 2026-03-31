import { Upload, UserCheck, UserX, DollarSign, Eye, Database, Loader2, ExternalLink, CheckCircle, XCircle } from 'lucide-react'
import { useContractEvents, type OnChainEvent } from '../lib/hooks'

const eventConfig: Record<string, { icon: typeof Upload; color: string; bg: string }> = {
  DatasetRegistered: { icon: Upload, color: 'text-accent', bg: 'bg-accent-dim' },
  AccessRequested: { icon: Eye, color: 'text-warning', bg: 'bg-warning-dim' },
  LicenseGranted: { icon: UserCheck, color: 'text-success', bg: 'bg-success-dim' },
  LicenseRevoked: { icon: UserX, color: 'text-danger', bg: 'bg-danger-dim' },
  AccessApproved: { icon: CheckCircle, color: 'text-success', bg: 'bg-success-dim' },
  AccessRejected: { icon: XCircle, color: 'text-danger', bg: 'bg-danger-dim' },
}

export default function Activity() {
  const { events, isLoading } = useContractEvents()

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-accent animate-spin mb-4" />
        <p className="text-text-secondary text-sm">Loading events from chain...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Activity Feed</h1>
        <p className="text-text-secondary text-sm mt-1">On-chain events from the NeuroRights Vault contract</p>
      </div>

      {events.length === 0 ? (
        <div className="bg-surface border border-border-subtle p-12 text-center">
          <Database className="w-10 h-10 text-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-primary">No on-chain events yet</h3>
          <p className="text-text-secondary text-sm mt-1">Events will appear here as datasets are registered, licenses granted, and access requested.</p>
        </div>
      ) : (
        <div className="bg-surface border border-border-subtle overflow-hidden">
          <div className="divide-y divide-border-subtle">
            {events.map((event, i) => {
              const config = eventConfig[event.type]
              const Icon = config.icon
              return (
                <div key={i} className="p-4 flex items-center gap-4 animate-tile-enter" style={{ animationDelay: `${i * 40}ms` }}>
                  <div className={`w-10 h-10 rounded-sm ${config.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary">{event.details}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-text-muted font-mono">{event.actor.slice(0, 6)}...{event.actor.slice(-4)}</span>
                      <span className="text-xs text-text-muted">Block #{event.blockNumber.toString()}</span>
                      {event.txHash && (
                        <a
                          href={`https://sepolia.basescan.org/tx/${event.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-accent hover:underline inline-flex items-center gap-0.5"
                        >
                          tx <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                  <div className={`px-2 py-0.5 rounded-full text-xs ${config.bg} ${config.color} whitespace-nowrap`}>
                    {event.type.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-center gap-2 text-sm text-text-muted">
        <div className="w-2 h-2 rounded-full bg-success animate-pulse-neural" />
        Reading from Base Sepolia contract
      </div>
    </div>
  )
}
