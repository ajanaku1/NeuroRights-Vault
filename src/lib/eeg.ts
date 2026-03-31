export interface EEGData {
  channels: string[]
  samplingRate: number
  data: number[][]
  timestamps: number[]
}

export function parseEEGCsv(csvText: string): EEGData {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) throw new Error('Invalid EEG CSV file')

  const headers = lines[0].split(',').map((h) => h.trim())
  const channels = headers.filter((h) => h !== 'timestamp' && h !== 'time' && h !== '')
  const timeIdx = headers.findIndex((h) => h === 'timestamp' || h === 'time')

  const data: number[][] = channels.map(() => [])
  const timestamps: number[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => parseFloat(v.trim()))
    if (values.some(isNaN)) continue

    if (timeIdx >= 0) {
      timestamps.push(values[timeIdx])
    } else {
      timestamps.push((i - 1) / 256) // default 256Hz
    }

    let channelIdx = 0
    for (let j = 0; j < values.length; j++) {
      if (j === timeIdx) continue
      if (channelIdx < channels.length) {
        data[channelIdx].push(values[j])
        channelIdx++
      }
    }
  }

  return {
    channels,
    samplingRate: 256,
    data,
    timestamps,
  }
}

export function getEEGStats(eegData: EEGData) {
  const duration = eegData.timestamps[eegData.timestamps.length - 1] - eegData.timestamps[0]
  const totalSamples = eegData.data[0]?.length || 0

  return {
    channels: eegData.channels.length,
    samplingRate: eegData.samplingRate,
    duration: Math.round(duration * 10) / 10,
    totalSamples,
    format: 'Temple University EEG Corpus',
  }
}
