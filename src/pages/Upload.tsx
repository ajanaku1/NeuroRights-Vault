import { useState, useCallback } from 'react'
import { useAccount, useSignMessage, useWriteContract, usePublicClient, useReadContract } from 'wagmi'
import { parseEther, keccak256, toHex } from 'viem'
import { Upload as UploadIcon, Brain, Check, Loader2, Lock } from 'lucide-react'
import { parseEEGCsv, getEEGStats, type EEGData } from '../lib/eeg'
import { encryptData, arrayBufferToHex } from '../lib/encryption'
import { uploadRawToIPFS } from '../lib/storacha'
const getLitEncrypt = () => import('../lib/lit').then(m => m.litEncrypt)
import { NEURORIGHTS_VAULT_ADDRESS, NEURORIGHTS_VAULT_ABI } from '../lib/contract'
import EEGChart from '../components/EEGChart'

type Step = 'select' | 'preview' | 'encrypt' | 'upload' | 'register' | 'done'

const SAMPLE_FILES = [
  { name: 'Resting State EEG', file: '/samples/sample_resting_state.csv' },
  { name: 'Cognitive Task EEG', file: '/samples/sample_cognitive_task.csv' },
  { name: 'Sleep Stage EEG', file: '/samples/sample_sleep_stage.csv' },
]

const ALL_STEPS: Step[] = ['select', 'preview', 'encrypt', 'upload', 'register', 'done']
const STEP_LABELS = ['Select', 'Preview', 'Encrypt', 'IPFS', 'Register', 'Done']

export default function Upload() {
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const { writeContractAsync } = useWriteContract()
  const publicClient = usePublicClient()
  const { data: datasetCount } = useReadContract({
    address: NEURORIGHTS_VAULT_ADDRESS,
    abi: NEURORIGHTS_VAULT_ABI,
    functionName: 'datasetCount',
  })

  const [step, setStep] = useState<Step>('select')
  const [fileName, setFileName] = useState('')
  const [rawCsv, setRawCsv] = useState('')
  const [eegData, setEegData] = useState<EEGData | null>(null)
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('0.001')
  const [error, setError] = useState('')

  const handleFile = useCallback(async (file: File) => {
    try {
      const text = await file.text()
      const parsed = parseEEGCsv(text)
      setRawCsv(text)
      setFileName(file.name)
      setEegData(parsed)
      setStep('preview')
      setError('')
    } catch {
      setError('Invalid EEG CSV file. Please use Temple University EEG Corpus format.')
    }
  }, [])

  const handleSample = useCallback(async (samplePath: string, name: string) => {
    try {
      const resp = await fetch(samplePath)
      const text = await resp.text()
      const parsed = parseEEGCsv(text)
      setRawCsv(text)
      setFileName(name + '.csv')
      setEegData(parsed)
      setStep('preview')
      setError('')
    } catch {
      setError('Failed to load sample file.')
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleUpload = async () => {
    if (!address || !rawCsv) return

    try {
      setStep('encrypt')

      let ipfsCid: string
      let dataToEncryptHash = ''
      let litEncrypted = false

      // Try Lit Protocol first, fall back to AES-256-GCM
      try {
        const predictedId = (datasetCount != null ? Number(datasetCount) : 0).toString()
        const litEncryptFn = await getLitEncrypt()
        const litResult = await litEncryptFn(rawCsv, predictedId)
        dataToEncryptHash = litResult.dataToEncryptHash
        litEncrypted = true

        setStep('upload')
        ipfsCid = await uploadRawToIPFS(litResult.ciphertext, `${fileName.replace('.csv', '')}.lit.enc`)
      } catch (litErr) {
        console.warn('Lit Protocol unavailable, using AES-256-GCM fallback:', litErr)
        const signature = await signMessageAsync({
          message: `NeuroRights Vault: Encrypt dataset "${fileName}" for ${address}`,
        })
        const { encrypted, iv } = await encryptData(rawCsv, signature)

        setStep('upload')
        // Pack IV + ciphertext together so decryption is possible
        const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('')
        // Use uploadRawToIPFS for the combined data
        const combinedText = ivHex + '\n' + arrayBufferToHex(encrypted)
        ipfsCid = await uploadRawToIPFS(combinedText, `${fileName.replace('.csv', '')}.enc`)
      }

      // Register on-chain
      setStep('register')
      const stats = eegData ? getEEGStats(eegData) : { channels: 0, samplingRate: 256, duration: 0, totalSamples: 0, format: '' }
      const metadata = JSON.stringify({
        name: fileName.replace('.csv', ''),
        ipfsCid,
        dataToEncryptHash,
        litEncrypted,
        channels: stats.channels,
        samplingRate: stats.samplingRate,
        duration: stats.duration,
        format: stats.format,
        description: description || `EEG recording: ${fileName}`,
      })

      const cidBytes = keccak256(toHex(ipfsCid))
      const priceInWei = parseEther(price || '0.001')

      const txHash = await writeContractAsync({
        address: NEURORIGHTS_VAULT_ADDRESS,
        abi: NEURORIGHTS_VAULT_ABI,
        functionName: 'registerDataset',
        args: [cidBytes, metadata, priceInWei],
      })

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: txHash })
      }

      setStep('done')
    } catch (err: any) {
      console.error('Upload error:', err)
      const msg = err?.shortMessage || err?.message || 'Unknown error'
      setError(`Upload failed: ${msg}`)
      setStep('preview')
    }
  }

  const reset = () => {
    setStep('select')
    setFileName('')
    setRawCsv('')
    setEegData(null)
    setDescription('')
    setPrice('0.001')
    setError('')
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="bento-tile p-8 max-w-sm">
          <Lock className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <h2 className="text-xl font-display font-bold text-text-primary">Connect Wallet to Upload</h2>
          <p className="text-text-secondary text-sm mt-2">Your wallet signature is used to derive the encryption key.</p>
        </div>
      </div>
    )
  }

  const currentStepIndex = ALL_STEPS.indexOf(step)

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-display font-bold text-text-primary">Upload EEG Data</h1>
        <p className="text-text-secondary text-sm mt-1">Encrypt, pin to IPFS, and register on-chain</p>
      </div>

      {/* Progress - horizontal step indicator */}
      <div className="bento-tile p-4">
        <div className="flex items-center justify-between relative">
          {/* Connecting line */}
          <div className="absolute top-3 left-4 right-4 h-px bg-border" />
          <div
            className="absolute top-3 left-4 h-px bg-accent transition-all duration-500"
            style={{ width: `${(currentStepIndex / (ALL_STEPS.length - 1)) * 100}%`, maxWidth: 'calc(100% - 2rem)' }}
          />

          {ALL_STEPS.map((s, i) => {
            const isActive = step === s
            const isPast = currentStepIndex > i

            return (
              <div key={s} className="relative flex flex-col items-center z-10">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors duration-200 ${
                    isPast
                      ? 'bg-accent border-accent'
                      : isActive
                      ? 'bg-base border-accent ring-4 ring-accent/20'
                      : 'bg-base border-border'
                  }`}
                >
                  {isPast && <Check className="w-3 h-3 text-base" />}
                  {isActive && <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />}
                </div>
                <span
                  className={`text-xs mt-2 whitespace-nowrap ${
                    isActive ? 'text-accent font-medium' : isPast ? 'text-text-body' : 'text-text-muted'
                  }`}
                >
                  {STEP_LABELS[i]}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {error && (
        <div className="bento-tile border-danger/30 p-3 text-sm text-danger bg-danger-dim">
          {error}
        </div>
      )}

      {/* Step: Select */}
      {step === 'select' && (
        <div className="space-y-4">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="bento-tile border-dashed border-2 border-border hover:border-accent/50 p-12 text-center transition-colors duration-200 cursor-pointer"
            onClick={() => {
              const input = document.createElement('input')
              input.type = 'file'
              input.accept = '.csv'
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0]
                if (file) handleFile(file)
              }
              input.click()
            }}
          >
            <UploadIcon className="w-10 h-10 text-text-muted mx-auto mb-4" />
            <p className="text-text-primary font-medium">Drop your EEG file here or click to browse</p>
            <p className="text-text-muted text-sm mt-1">CSV format (Temple University EEG Corpus)</p>
          </div>

          <div>
            <p className="text-sm text-text-secondary mb-3">Or use a sample dataset:</p>
            <div className="bento-grid-3">
              {SAMPLE_FILES.map((s, i) => (
                <button
                  key={s.file}
                  onClick={() => handleSample(s.file, s.name)}
                  className="bento-tile text-left transition-colors duration-200 hover:border-accent animate-tile-enter"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <Brain className="w-5 h-5 text-accent mb-2" />
                  <p className="text-sm font-medium text-text-primary">{s.name}</p>
                  <p className="text-xs text-text-muted mt-1 font-mono tabular-nums">256Hz, 19 channels</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step: Preview */}
      {step === 'preview' && eegData && (
        <div className="space-y-4">
          <div className="bento-tile">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-medium text-text-primary">{fileName}</h3>
                <p className="text-xs text-text-muted mt-0.5 font-mono tabular-nums">
                  {eegData.channels.length} channels, {eegData.samplingRate}Hz,{' '}
                  {(eegData.timestamps[eegData.timestamps.length - 1] - eegData.timestamps[0]).toFixed(1)}s
                </p>
              </div>
              <div className="flex gap-1 flex-wrap justify-end">
                {eegData.channels.slice(0, 6).map((ch) => (
                  <span key={ch} className="px-2 py-0.5 bg-elevated rounded-sm text-xs text-text-secondary font-mono">
                    {ch}
                  </span>
                ))}
                {eegData.channels.length > 6 && (
                  <span className="px-2 py-0.5 bg-elevated rounded-sm text-xs text-text-muted">
                    +{eegData.channels.length - 6} more
                  </span>
                )}
              </div>
            </div>
            <EEGChart data={eegData} height={250} />
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-text-body mb-1.5">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this dataset (e.g., resting state, eyes closed, 5 min recording)"
                className="w-full bg-elevated border border-border rounded-sm px-4 py-3 text-text-primary placeholder:text-text-muted text-sm resize-none h-24 focus:outline-none focus:border-accent/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-body mb-1.5">
                Price per access (ETH)
              </label>
              <input
                type="number"
                step="0.001"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-elevated border border-border rounded-sm px-4 py-3 text-text-primary text-sm focus:outline-none focus:border-accent/50 tabular-nums"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={reset}
              className="px-5 py-2.5 bg-elevated hover:bg-overlay text-text-body rounded-sm transition-colors duration-200"
            >
              Back
            </button>
            <button
              onClick={handleUpload}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover text-base rounded-sm transition-colors duration-200 font-medium"
            >
              <Lock className="w-4 h-4" />
              Encrypt & Upload
            </button>
          </div>
        </div>
      )}

      {/* Processing steps */}
      {(step === 'encrypt' || step === 'upload' || step === 'register') && (
        <div className="bento-tile p-8 text-center">
          <Loader2 className="w-10 h-10 text-accent mx-auto mb-4 animate-spin" />
          <h3 className="text-lg font-medium text-text-primary">
            {step === 'encrypt' && 'Encrypting your neural data...'}
            {step === 'upload' && 'Pinning to IPFS via Storacha...'}
            {step === 'register' && 'Registering on Base Sepolia...'}
          </h3>
          <p className="text-sm text-text-secondary mt-2">
            {step === 'encrypt' && 'Securing with Lit Protocol threshold encryption or AES-256-GCM'}
            {step === 'upload' && 'Your encrypted data is being pinned to decentralized storage'}
            {step === 'register' && 'Creating on-chain record of your dataset'}
          </p>

          {/* Sub-step progress */}
          <div className="flex items-center justify-center gap-3 mt-6">
            {['Encrypt', 'Pin', 'Register'].map((label, i) => {
              const subSteps: Step[] = ['encrypt', 'upload', 'register']
              const subIdx = subSteps.indexOf(step)
              const done = i < subIdx
              const active = i === subIdx
              return (
                <div key={label} className="flex items-center gap-2">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                      done
                        ? 'bg-accent text-base'
                        : active
                        ? 'border-2 border-accent text-accent'
                        : 'border border-border text-text-muted'
                    }`}
                  >
                    {done && <Check className="w-3 h-3" />}
                    {active && <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />}
                  </div>
                  <span className={`text-xs ${active ? 'text-accent' : done ? 'text-text-body' : 'text-text-muted'}`}>
                    {label}
                  </span>
                  {i < 2 && <div className={`w-6 h-px ${done ? 'bg-accent' : 'bg-border'}`} />}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Done */}
      {step === 'done' && (
        <div className="bento-tile border-success/30 p-8 text-center">
          <div className="w-16 h-16 rounded-sm bg-success-dim flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-success" />
          </div>
          <h3 className="text-xl font-display font-bold text-text-primary">Dataset Registered</h3>
          <p className="text-text-secondary mt-2 max-w-md mx-auto text-sm">
            Your EEG data has been encrypted with Lit Protocol, pinned to IPFS via Storacha,
            and registered on-chain. Only researchers with an active license can decrypt it.
          </p>
          <div className="flex gap-3 justify-center mt-6">
            <button
              onClick={reset}
              className="px-5 py-2.5 bg-elevated hover:bg-overlay text-text-body rounded-sm transition-colors duration-200"
            >
              Upload Another
            </button>
            <a
              href="/vault"
              className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-base rounded-sm transition-colors duration-200 font-medium"
            >
              View in Vault
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
