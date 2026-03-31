# NeuroRights Vault

**The first decentralized platform for neurodata sovereignty.**

Encrypt, store, license, and revoke access to your brain data. All on-chain, all in your control.

## The Problem

96.7% of neurotech companies reserve the right to transfer your brain data. The $1.7B neurotech market has zero data sovereignty tools. Five countries have passed neurorights legislation, but there is no enforcement tooling. NeuroRights Vault is the missing infrastructure.

## What It Does

NeuroRights Vault lets users:

1. **Encrypt** EEG brain data with Lit Protocol's threshold encryption: access-controlled by on-chain license status
2. **Store** encrypted data on IPFS via Storacha: no central server can be compelled to hand over your data
3. **Register** datasets on-chain (Base Sepolia) with immutable ownership records
4. **License** access to researchers with time-bound, purpose-specific smart contract licenses
5. **Decrypt**: licensed researchers decrypt data via Lit Protocol (network verifies on-chain license before releasing key shares)
6. **Revoke** any license instantly: propagated on-chain, immediately revokes decryption ability
7. **Escrow payments**: researchers pay to request access, owners approve (funds released) or reject (funds refunded)

## Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────────────┐
│    Browser       │     │   Storacha   │     │   Base Sepolia          │
│                  │     │   (IPFS)     │     │   Smart Contract        │
│  React App       │────>│  Encrypted   │     │                         │
│  Lit Protocol    │     │  EEG Data    │     │  registerDataset        │
│  Threshold Enc.  │     │  Real CIDs   │     │  requestAccess (escrow) │
│                  │─────────────────────────>│  approveAccess (pay+lic)│
│  Lit Protocol    │     │  Pinned to   │     │  rejectAccess (refund)  │
│  Access Control  │     │  Filecoin    │     │  grantLicense           │
│                  │     │              │     │  revokeLicense          │
│  Wagmi +         │     │  Gateway:    │     │  withdraw               │
│  RainbowKit      │     │  storacha.   │     │  hasActiveLicense       │
│                  │     │  link/ipfs/  │     │  getPendingRequests     │
└─────────────────┘     └──────────────┘     └─────────────────────────┘
```

**Fully on-chain. No backend server. No localStorage.** Every read and write goes directly to the smart contract, IPFS, or the user's browser (for encryption).

## Data Storage

| Data | Where | How |
|------|-------|-----|
| Dataset metadata (owner, price, channels, CID) | On-chain | `registerDataset()` stores JSON in contract |
| Encrypted EEG data (actual brain data) | IPFS via Storacha | Pinned to Filecoin network |
| IPFS CID (link to encrypted data) | On-chain | Embedded in metadata JSON string |
| Licenses (researcher, expiry, purpose) | On-chain | `approveAccess()` / `grantLicense()` |
| Access requests + escrow payments | On-chain | `requestAccess()` holds ETH in contract |
| Approvals, rejections, revocations | On-chain | Contract events (indexed, queryable) |
| Activity feed | On-chain | Read from contract event logs |
| Notifications | On-chain | `getPendingRequests()` + event queries |
| Encryption keys | Lit Protocol network | Threshold-shared across Lit nodes, released only when on-chain conditions met |
| Lit decryption hash | On-chain | Stored in dataset metadata JSON for decrypt verification |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 8 |
| Styling | Tailwind CSS 4, Framer Motion |
| Web3 | Wagmi 2, Viem, RainbowKit |
| Storage | Storacha (IPFS/Filecoin) |
| Blockchain | Base Sepolia (Solidity 0.8.20) |
| Encryption & Access Control | Lit Protocol (threshold encryption, on-chain gated decryption, DatilTest) |
| Charts | Recharts (EEG waveform visualization) |
| Icons | Lucide React |

## Smart Contract

**Deployed:** [`0x83ebf8d8753bd56176b2ce6105d34b0a62f02d43`](https://sepolia.basescan.org/address/0x83ebf8d8753bd56176b2ce6105d34b0a62f02d43) on Base Sepolia

### Core Functions

| Function | Description |
|----------|-------------|
| `registerDataset(cid, metadata, price)` | Register encrypted EEG data on-chain |
| `requestAccess(datasetId)` | Pay to request access (ETH held in escrow) |
| `approveAccess(datasetId, idx, duration, purpose)` | Approve request: release payment + grant license |
| `rejectAccess(datasetId, idx)` | Reject request: refund ETH to requester |
| `grantLicense(datasetId, researcher, duration, purpose)` | Directly grant a time-bound license |
| `revokeLicense(datasetId, researcher)` | Instantly revoke all licenses for a researcher |
| `withdraw(datasetId)` | Withdraw accumulated earnings |
| `hasActiveLicense(datasetId, researcher)` | Check if researcher has active license (used by Lit Protocol) |
| `getPendingRequests(datasetId)` | Get all pending access requests |

### Events

`DatasetRegistered` · `AccessRequested` · `AccessApproved` · `AccessRejected` · `LicenseGranted` · `LicenseRevoked`

## Sponsor Integrations

### Storacha (IPFS/Filecoin)
- Encrypted EEG data uploaded to IPFS via Storacha's `@storacha/client`
- Real CIDs generated and pinned to the Filecoin network
- Data retrievable at `https://storacha.link/ipfs/{cid}`
- Pre-authenticated with delegated credentials (no user email flow)

### Lit Protocol (Decentralized Encryption & Access Control)
- EEG data encrypted with Lit Protocol's threshold encryption (no single point of decryption)
- Access control conditions gate decryption to: (a) dataset owners, or (b) researchers with an active on-chain license
- Uses `hasActiveLicense(datasetId, researcher)` and `datasets(datasetId).owner` as Lit EVM contract conditions
- Decryption requires Lit network nodes to verify the on-chain condition before releasing key shares
- Licensed researchers can decrypt directly from the My Access page: no key exchange needed
- Revoking a license on-chain immediately revokes decryption ability (Lit checks conditions at decrypt time)
- Network: DatilTest (testnet)

## User Journeys

### Data Owner (Neuroscientist / Patient)

1. **Landing Page**: Learn about the neurorights crisis
2. **Enter Vault**: Opens the app in a new tab
3. **Connect Wallet**: Establish sovereign identity
4. **Upload EEG**: Drag & drop CSV, preview channels, set access price
5. **Encrypt**: Lit Protocol threshold encryption (gated by on-chain license status)
6. **Pin to IPFS**: Encrypted ciphertext uploaded to Storacha
7. **Register On-Chain**: Dataset + IPFS CID + decryption hash registered on Base Sepolia
8. **Receive Requests**: Notification bell shows incoming access requests
9. **Approve / Reject**: Approve releases escrow payment + grants license; reject refunds requester
10. **Manage Licenses**: View, grant, revoke licenses at any time
11. **Withdraw Earnings**: Pull accumulated ETH from the contract

### Researcher

1. **Explore Datasets**: Browse all on-chain datasets with metadata
2. **Request Access**: Pay the dataset's price (ETH held in escrow)
3. **Wait for Approval**: Status shows "Pending Approval" on Explore page
4. **Get Notified**: Notification bell shows "Access Approved" or "Access Rejected"
5. **My Access**: View all licensed datasets, decrypt & download via Lit Protocol
6. **Decrypt**: Lit network verifies on-chain license, releases decryption key shares
7. **Access Refunded**: If rejected, ETH is returned on-chain

## App Pages

| Page | Purpose |
|------|---------|
| `/` | Immersive landing page (Neural Cortex design, particle canvas) |
| `/vault` | Dashboard: your datasets, stats, sovereignty health score |
| `/upload` | Multi-step upload wizard (select → preview → encrypt → IPFS → register) |
| `/licenses` | Manage licenses for your datasets (grant/revoke on-chain) |
| `/explore` | Browse all on-chain datasets, request access |
| `/access` | View datasets you have licensed access to |
| `/activity` | On-chain event feed from contract logs |

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Fill in: VITE_WALLETCONNECT_PROJECT_ID, VITE_CONTRACT_ADDRESS, VITE_STORACHA_KEY, VITE_STORACHA_PROOF

# Run development server
npm run dev

# Compile smart contract
npx hardhat compile --config hardhat.config.cjs

# Deploy smart contract
DEPLOYER_PRIVATE_KEY=0x... node scripts/deploy.mjs
```

## Project Structure

```
src/
├── pages/
│   ├── Landing.tsx      # Immersive landing (particle canvas, animations)
│   ├── Dashboard.tsx    # Vault overview (on-chain stats, datasets)
│   ├── Upload.tsx       # Multi-step EEG upload wizard
│   ├── Licenses.tsx     # License management (grant/revoke)
│   ├── Explore.tsx      # Browse & request access to datasets
│   ├── MyAccess.tsx     # Datasets you have licensed access to
│   └── Activity.tsx     # On-chain event feed
├── components/
│   ├── Layout.tsx       # Sidebar nav, notification bell, wallet connect
│   ├── DatasetCard.tsx  # Expandable dataset display with IPFS/BaseScan links
│   └── EEGChart.tsx     # Recharts EEG waveform visualization
├── lib/
│   ├── contract.ts      # Smart contract ABI & address
│   ├── hooks.ts         # On-chain read hooks (datasets, licenses, events, notifications)
│   ├── encryption.ts    # AES-256-GCM encrypt/decrypt (Web Crypto API)
│   ├── storacha.ts      # IPFS upload via Storacha
│   ├── lit.ts           # Lit Protocol access control (threshold encryption)
│   ├── eeg.ts           # EEG CSV parser & statistics
│   ├── wagmi.ts         # Wallet configuration (Base Sepolia)
│   └── polyfills.ts     # Buffer polyfill for browser
contracts/
└── NeuroRightsVault.sol # Solidity smart contract (escrow + licensing)
scripts/
└── deploy.mjs           # Viem-based deployment script
```

## Legal Context

- Chile amended its constitution for neurorights (2021)
- UN published neurorights recommendations (2024)
- US MIND Act is in committee
- EU AI Act includes neural data provisions

NeuroRights Vault provides the first practical tooling for exercising these rights.

## Hackathon

Built for **PL Genesis: Frontiers of Collaboration Hackathon 2026**

### Tracks & Bounties

| Track / Bounty | How NeuroRights Integrates |
|----------------|---------------------------|
| **Neurotech** (Focus Area) | Core track: neural data sovereignty platform with on-chain consent, encrypted BCI data, cognitive rights enforcement |
| **Infrastructure & Digital Rights** (Focus Area) | Decentralized data ownership, privacy-preserving encryption, censorship-resistant storage |
| **Storacha** (Sponsor) | Encrypted EEG ciphertext uploaded & pinned via `@storacha/client`, real CIDs, Filecoin-backed persistence |
| **Lit Protocol** (Sponsor) | Threshold encryption with on-chain access control conditions: `hasActiveLicense` gates decryption at the Lit network level |
| **Filecoin** (Sponsor) | Data stored on IPFS/Filecoin via Storacha; immutable, censorship-resistant neural data storage |
| **Fresh Code** | Built entirely during the hackathon period |

---

Built on IPFS + Filecoin + Base + Lit Protocol
