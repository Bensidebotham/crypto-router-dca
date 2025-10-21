'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { SUPPORTED_SYMBOLS, VENUE_METADATA } from '@/config/markets'
import type { VenueId } from '@/config/markets'

interface TickerRow {
  symbol: string
  displaySymbol: string
  price: number
  previousPrice: number
  changeAbs: number
  changePct: number
  venueLabel: string
  timestamp: number
}

type ConnectionStatus = 'loading' | 'online' | 'updating' | 'error'

const HISTORY_POINTS = 90
const POLL_INTERVAL = 5_000

export function LiveTicker() {
  const [rows, setRows] = useState<TickerRow[]>([])
  const [histories, setHistories] = useState<Record<string, number[]>>({})
  const [status, setStatus] = useState<ConnectionStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)

  const rowsRef = useRef<TickerRow[]>([])
  const historiesRef = useRef(histories)

  useEffect(() => {
    historiesRef.current = histories
  }, [histories])

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const fetchData = async () => {
      if (cancelled) return

      setStatus((prev) => (prev === 'loading' ? 'loading' : 'updating'))

      try {
        const symbolParam = SUPPORTED_SYMBOLS.map((symbol) => encodeURIComponent(symbol)).join(',')
        const response = await fetch(`/api/router/quote?symbols=${symbolParam}`, { cache: 'no-store' })
        if (!response.ok) {
          throw new Error(`Router API error: ${response.status}`)
        }

        const payload = await response.json()
        if (cancelled) return

        const pricesForHistory: Record<string, number> = {}
        const nextRows: TickerRow[] = []

        for (const symbolResult of payload.symbols ?? []) {
          const symbol: string = symbolResult.symbol
          const bestVenue = symbolResult.bestVenue
          const venueQuotes: Array<{ venueId: string; status: string; bid: number | null; ask: number | null; timestamp: number | null }> =
            symbolResult.venues ?? []

          let price: number | null = null
          if (bestVenue) {
            price = bestVenue.effectiveMidPrice ?? bestVenue.midPrice ?? null
          }

          if (price === null) {
            const fallback = symbolResult.comparisons?.[0]
            price = fallback?.effectiveMidPrice ?? fallback?.midPrice ?? null
          }

          const previousRow = rowsRef.current.find((row) => row.symbol === symbol)

          if (price === null || !isFinite(price)) {
            if (previousRow) {
              nextRows.push(previousRow)
            }
            continue
          }

          const quoteForBest = bestVenue
            ? venueQuotes.find((quote) => quote.venueId === bestVenue.venue.id && quote.status === 'ok')
            : undefined

          const bestVenueId = bestVenue?.venue.id as VenueId | undefined
          const venueLabel = bestVenueId
            ? VENUE_METADATA[bestVenueId]?.label ?? bestVenue?.venue.name ?? 'Unavailable'
            : 'Unavailable'

          const timestamp = quoteForBest?.timestamp ?? previousRow?.timestamp ?? Date.now()

          const previousPrice = previousRow?.price ?? price
          const changeAbs = price - previousPrice
          const changePct = previousPrice !== 0 ? (changeAbs / previousPrice) * 100 : 0

          pricesForHistory[symbol] = price

          nextRows.push({
            symbol,
            displaySymbol: symbol,
            price,
            previousPrice,
            changeAbs,
            changePct,
            venueLabel,
            timestamp
          })
        }

        nextRows.sort((a, b) => a.symbol.localeCompare(b.symbol))

        rowsRef.current = nextRows
        setRows(nextRows)

        setHistories((prev) => {
          const updated = { ...prev }

          Object.entries(pricesForHistory).forEach(([symbol, price]) => {
            const arr = updated[symbol] ? [...updated[symbol]] : []
            arr.push(price)
            if (arr.length > HISTORY_POINTS) arr.shift()
            updated[symbol] = arr
          })

          historiesRef.current = updated
          return updated
        })

        setStatus('online')
        setError(null)
        setLastUpdated(Date.now())
      } catch (err) {
        if (cancelled) return
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Failed to load ticker')
      } finally {
        if (!cancelled) {
          timer = setTimeout(fetchData, POLL_INTERVAL)
        }
      }
    }

    fetchData()

    return () => {
      cancelled = true
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [])

  const statusColor = useMemo(() => {
    switch (status) {
      case 'online':
        return 'bg-green-500'
      case 'updating':
        return 'bg-yellow-500'
      case 'error':
        return 'bg-red-500'
      default:
        return 'bg-slate-400'
    }
  }, [status])

  const statusText = useMemo(() => {
    switch (status) {
      case 'online':
        return 'Live (Router)'
      case 'updating':
        return 'Refreshing quotes…'
      case 'error':
        return 'Connection error'
      case 'loading':
      default:
        return 'Initializing…'
    }
  }, [status])

  const Sparkline = ({ symbol }: { symbol: string }) => {
    const data = (histories[symbol] ?? []).map((value, index) => ({ index, value }))
    if (data.length < 2) {
      return <div className="h-10 w-28 rounded-md bg-slate-100" />
    }

    return (
      <div className="h-10 w-28">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, bottom: 0, left: 0, right: 0 }}>
            <XAxis dataKey="index" hide />
            <YAxis hide domain={['auto', 'auto']} />
            <Line type="monotone" dataKey="value" dot={false} stroke="#38bdf8" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-3 w-3 rounded-full ${statusColor} ${status === 'online' ? 'animate-pulse' : ''}`} />
          <span className="text-sm font-medium text-slate-700">{statusText}</span>
          {status === 'online' && (
            <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-600">
              {rows.length} symbols
            </span>
          )}
        </div>
        <span className="text-xs text-slate-500">
          {lastUpdated ? `Updated ${new Date(lastUpdated).toLocaleTimeString()}` : 'Waiting for data…'}
        </span>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {rows.length > 0 ? (
          rows.map((row) => {
            const isPositive = row.changeAbs >= 0
            return (
              <div
                key={row.symbol}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white/90 px-3 py-3 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold text-slate-900">{row.displaySymbol}</span>
                    <span className="text-xs font-medium text-slate-500">{row.venueLabel}</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {new Date(row.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Sparkline symbol={row.symbol} />
                  <div className={`text-right ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                    <div className="text-sm font-semibold">
                      {isPositive ? '+' : ''}
                      {row.changeAbs.toFixed(2)}
                    </div>
                    <div className="text-xs">
                      {isPositive ? '+' : ''}
                      {row.changePct.toFixed(2)}%
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-lg text-slate-900">{formatCurrency(row.price)}</div>
                    <div className="text-xs text-slate-500">Prev {formatCurrency(row.previousPrice)}</div>
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-medium text-slate-500">
            {status === 'error' ? 'Unable to load live quotes right now.' : 'Waiting for first update…'}
          </div>
        )}
      </div>
    </div>
  )
}
