const STORAGE_KEY = 'neurorights:withdrawn'

function getStore(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch { return {} }
}

export function getWithdrawnAmount(datasetId: number): number {
  return getStore()[datasetId.toString()] || 0
}

export function recordWithdrawal(datasetId: number, totalEarned: number) {
  const store = getStore()
  store[datasetId.toString()] = totalEarned
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}
