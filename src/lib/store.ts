import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface EEGDataset {
  id: string
  name: string
  cid: string
  owner: string
  metadata: {
    channels: number
    samplingRate: number
    duration: number
    format: string
    description: string
  }
  pricePerAccess: string
  uploadedAt: number
  totalEarnings: string
  licenses: License[]
}

export interface License {
  id: string
  datasetId: string
  researcher: string
  purpose: string
  grantedAt: number
  expiresAt: number
  active: boolean
  revokedAt?: number
}

export interface ActivityEvent {
  id: string
  type: 'upload' | 'access_request' | 'license_granted' | 'license_revoked' | 'payment_received'
  datasetId: string
  actor: string
  timestamp: number
  details: string
}

interface VaultStore {
  datasets: EEGDataset[]
  activities: ActivityEvent[]
  addDataset: (dataset: EEGDataset) => void
  addLicense: (datasetId: string, license: License) => void
  revokeLicense: (datasetId: string, licenseId: string) => void
  addActivity: (event: ActivityEvent) => void
  getDatasetsByOwner: (owner: string) => EEGDataset[]
}

export const useVaultStore = create<VaultStore>()(
  persist(
    (set, get) => ({
      datasets: [],
      activities: [],

      addDataset: (dataset) => {
        set((state) => ({ datasets: [...state.datasets, dataset] }))
        get().addActivity({
          id: crypto.randomUUID(),
          type: 'upload',
          datasetId: dataset.id,
          actor: dataset.owner,
          timestamp: Date.now(),
          details: `Registered dataset "${dataset.name}"`,
        })
      },

      addLicense: (datasetId, license) => {
        set((state) => ({
          datasets: state.datasets.map((d) =>
            d.id === datasetId ? { ...d, licenses: [...d.licenses, license] } : d
          ),
        }))
        get().addActivity({
          id: crypto.randomUUID(),
          type: 'license_granted',
          datasetId,
          actor: license.researcher,
          timestamp: Date.now(),
          details: `License granted to ${license.researcher.slice(0, 6)}...${license.researcher.slice(-4)} for "${license.purpose}"`,
        })
      },

      revokeLicense: (datasetId, licenseId) => {
        set((state) => ({
          datasets: state.datasets.map((d) =>
            d.id === datasetId
              ? {
                  ...d,
                  licenses: d.licenses.map((l) =>
                    l.id === licenseId ? { ...l, active: false, revokedAt: Date.now() } : l
                  ),
                }
              : d
          ),
        }))
        get().addActivity({
          id: crypto.randomUUID(),
          type: 'license_revoked',
          datasetId,
          actor: 'owner',
          timestamp: Date.now(),
          details: `License ${licenseId.slice(0, 8)} revoked`,
        })
      },

      addActivity: (event) => {
        set((state) => ({ activities: [event, ...state.activities].slice(0, 100) }))
      },

      getDatasetsByOwner: (owner) => {
        return get().datasets.filter((d) => d.owner.toLowerCase() === owner.toLowerCase())
      },
    }),
    {
      name: 'neurorights-vault',
    }
  )
)
