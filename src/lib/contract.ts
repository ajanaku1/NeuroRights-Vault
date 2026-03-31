export const NEURORIGHTS_VAULT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS?.trim() || '0x0000000000000000000000000000000000000000') as `0x${string}`

export const NEURORIGHTS_VAULT_ABI = [
  // Events
  { type: 'event', name: 'DatasetRegistered', inputs: [{ name: 'datasetId', type: 'uint256', indexed: true }, { name: 'owner', type: 'address', indexed: true }, { name: 'cid', type: 'bytes32' }, { name: 'metadata', type: 'string' }, { name: 'pricePerAccess', type: 'uint256' }] },
  { type: 'event', name: 'LicenseGranted', inputs: [{ name: 'datasetId', type: 'uint256', indexed: true }, { name: 'researcher', type: 'address', indexed: true }, { name: 'expiry', type: 'uint256' }, { name: 'purpose', type: 'string' }] },
  { type: 'event', name: 'LicenseRevoked', inputs: [{ name: 'datasetId', type: 'uint256', indexed: true }, { name: 'researcher', type: 'address', indexed: true }, { name: 'revokedAt', type: 'uint256' }] },
  { type: 'event', name: 'AccessRequested', inputs: [{ name: 'datasetId', type: 'uint256', indexed: true }, { name: 'researcher', type: 'address', indexed: true }, { name: 'payment', type: 'uint256' }] },
  { type: 'event', name: 'AccessApproved', inputs: [{ name: 'datasetId', type: 'uint256', indexed: true }, { name: 'researcher', type: 'address', indexed: true }, { name: 'payment', type: 'uint256' }] },
  { type: 'event', name: 'AccessRejected', inputs: [{ name: 'datasetId', type: 'uint256', indexed: true }, { name: 'researcher', type: 'address', indexed: true }, { name: 'refundAmount', type: 'uint256' }] },

  // Write functions
  { type: 'function', name: 'registerDataset', stateMutability: 'nonpayable', inputs: [{ name: 'cid', type: 'bytes32' }, { name: 'metadata', type: 'string' }, { name: 'pricePerAccess', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'grantLicense', stateMutability: 'nonpayable', inputs: [{ name: 'datasetId', type: 'uint256' }, { name: 'researcher', type: 'address' }, { name: 'duration', type: 'uint256' }, { name: 'purpose', type: 'string' }], outputs: [] },
  { type: 'function', name: 'revokeLicense', stateMutability: 'nonpayable', inputs: [{ name: 'datasetId', type: 'uint256' }, { name: 'researcher', type: 'address' }], outputs: [] },
  { type: 'function', name: 'requestAccess', stateMutability: 'payable', inputs: [{ name: 'datasetId', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'approveAccess', stateMutability: 'nonpayable', inputs: [{ name: 'datasetId', type: 'uint256' }, { name: 'requestIndex', type: 'uint256' }, { name: 'duration', type: 'uint256' }, { name: 'purpose', type: 'string' }], outputs: [] },
  { type: 'function', name: 'rejectAccess', stateMutability: 'nonpayable', inputs: [{ name: 'datasetId', type: 'uint256' }, { name: 'requestIndex', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'withdraw', stateMutability: 'nonpayable', inputs: [{ name: 'datasetId', type: 'uint256' }], outputs: [] },

  // Read functions
  { type: 'function', name: 'datasetCount', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'datasets', stateMutability: 'view', inputs: [{ name: 'datasetId', type: 'uint256' }], outputs: [{ name: 'owner', type: 'address' }, { name: 'cid', type: 'bytes32' }, { name: 'metadata', type: 'string' }, { name: 'pricePerAccess', type: 'uint256' }, { name: 'totalEarnings', type: 'uint256' }, { name: 'createdAt', type: 'uint256' }, { name: 'active', type: 'bool' }] },
  { type: 'function', name: 'getMyDatasets', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ name: '', type: 'uint256[]' }] },
  { type: 'function', name: 'getActiveLicenses', stateMutability: 'view', inputs: [{ name: 'datasetId', type: 'uint256' }], outputs: [{ name: '', type: 'tuple[]', components: [{ name: 'researcher', type: 'address' }, { name: 'expiry', type: 'uint256' }, { name: 'purpose', type: 'string' }, { name: 'active', type: 'bool' }, { name: 'grantedAt', type: 'uint256' }] }] },
  { type: 'function', name: 'hasActiveLicense', stateMutability: 'view', inputs: [{ name: 'datasetId', type: 'uint256' }, { name: 'researcher', type: 'address' }], outputs: [{ name: '', type: 'bool' }] },
  { type: 'function', name: 'getPendingRequests', stateMutability: 'view', inputs: [{ name: 'datasetId', type: 'uint256' }], outputs: [{ name: '', type: 'tuple[]', components: [{ name: 'requester', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'pending', type: 'bool' }] }] },
  { type: 'function', name: 'getPendingRequestsRaw', stateMutability: 'view', inputs: [{ name: 'datasetId', type: 'uint256' }], outputs: [{ name: '', type: 'tuple[]', components: [{ name: 'requester', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'pending', type: 'bool' }] }] },
] as const
