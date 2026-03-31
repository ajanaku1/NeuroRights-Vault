import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import type { EEGData } from '../lib/eeg'

const CHANNEL_COLORS = [
  '#6c5ce7', '#00f5d4', '#ff4757', '#f0a500', '#00d68f',
  '#a29bfe', '#fd79a8', '#74b9ff', '#ffeaa7', '#55efc4',
  '#e17055', '#0984e3', '#b2bec3', '#dfe6e9', '#636e72',
  '#2d3436', '#fab1a0', '#81ecec', '#fdcb6e',
]

interface Props {
  data: EEGData
  height?: number
  selectedChannels?: string[]
}

export default function EEGChart({ data, height = 300, selectedChannels }: Props) {
  const chartData = useMemo(() => {
    const channels = selectedChannels || data.channels.slice(0, 4)
    return data.timestamps.map((t, i) => {
      const point: Record<string, number> = { time: Math.round(t * 1000) / 1000 }
      channels.forEach((ch) => {
        const chIdx = data.channels.indexOf(ch)
        if (chIdx >= 0) point[ch] = data.data[chIdx][i]
      })
      return point
    })
  }, [data, selectedChannels])

  const channels = selectedChannels || data.channels.slice(0, 4)

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <XAxis
            dataKey="time"
            stroke="#5c6370"
            fontSize={10}
            tickFormatter={(v) => `${v}s`}
          />
          <YAxis stroke="#5c6370" fontSize={10} tickFormatter={(v) => `${v}μV`} />
          {channels.map((ch, i) => (
            <Line
              key={ch}
              type="monotone"
              dataKey={ch}
              stroke={CHANNEL_COLORS[i % CHANNEL_COLORS.length]}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
