'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import { ResponsiveContainer, AreaChart, Area } from 'recharts'
import { compareVenuesForPair } from '@/lib/venues'
import type { VenueId } from '@/config/markets'
import { SUPPORTED_SYMBOLS, VENUE_METADATA, VENUE_IDS } from '@/config/markets'

interface SpreadData {
  exchange: string
  venueId: VenueId
  symbol: string
  bid: number
  ask: number
  spread: number
  spreadPercent: number
  lastUpdate: number
  stale?: boolean
}

interface RouterHistoryPoint {
  timestamp: number
  bestVenueId: VenueId | null
  bestVenueLabel: string | null
  bestEffectiveMidPrice: number | null
  bestEffectiveSpreadBps: number | null
}
const REFRESH_MS = 10_000 // refresh every 10 seconds

export function SpreadHeatmap() {
  const [spreads, setSpreads] = useState<SpreadData[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const [exchangeStatus, setExchangeStatus] = useState<Record<string, { status: 'online' | 'offline' | 'error'; lastSeen: number; error?: string }>>({})
  const [history, setHistory] = useState<Record<string, RouterHistoryPoint[]>>({})
  
  // Price cache to prevent data from disappearing
  const [priceCache, setPriceCache] = useState<Record<string, SpreadData>>({})
  
  // Missed Savings Calculator - Ring buffer for 1 hour of data
  const [referenceVenue, setReferenceVenue] = useState<string>(VENUE_IDS[0]?.label ?? 'Kraken')
  const [missedSavingsBuffer, setMissedSavingsBuffer] = useState<Array<{
    timestamp: number
    symbol: string
    bestEffectivePrice: number
    referenceEffectivePrice: number
    missedSavings: number
  }>>([])

  const priceCacheRef = useRef(priceCache)
  const spreadsRef = useRef(spreads)
  const referenceVenueRef = useRef(referenceVenue)

  useEffect(() => {
    priceCacheRef.current = priceCache
  }, [priceCache])

  useEffect(() => {
    spreadsRef.current = spreads
  }, [spreads])

  useEffect(() => {
    referenceVenueRef.current = referenceVenue
  }, [referenceVenue])

  // Enhanced data processing with fee-adjusted calculations
  const processedSpreads = useMemo(() => {
    if (spreads.length === 0) return []

    // Group by symbol
    const groupedBySymbol = spreads.reduce((acc, spread) => {
      if (!acc[spread.symbol]) acc[spread.symbol] = []
      acc[spread.symbol].push(spread)
      return acc
    }, {} as Record<string, SpreadData[]>)

    // Process each symbol group
    const processed: Array<{
      symbol: string
      venues: Array<{
        venue: string
        bid: number
        ask: number
        spread: number
        spreadPercent: number
        effectiveBid: number
        effectiveAsk: number
        effectiveSpread: number
        effectiveSpreadPercent: number
        isBest: boolean
        lastUpdate: number
      }>
    }> = []

    Object.entries(groupedBySymbol).forEach(([symbol, symbolSpreads]) => {
      const staleKeys = new Set<string>()
      symbolSpreads.forEach((spread) => {
        if (spread.stale) {
          staleKeys.add(`${spread.venueId}-${symbol}`)
        }
      })

      const venueData = symbolSpreads
        .filter((spread) => !!spread.venueId && isFinite(spread.bid) && isFinite(spread.ask))
        .map(spread => ({
          venueId: spread.venueId,
          bid: spread.bid,
          ask: spread.ask,
          lastUpdate: spread.lastUpdate
        }))

      const comparisons = compareVenuesForPair(symbol, venueData)
      
      const processedVenues = comparisons.map((comp: any) => ({
        venue: comp.venue.name,
        bid: comp.bid,
        ask: comp.ask,
        spread: comp.spread,
        spreadPercent: (comp.spread / comp.midPrice) * 100,
        effectiveBid: comp.effectiveBid,
        effectiveAsk: comp.effectiveAsk,
        effectiveSpread: comp.effectiveSpread,
        effectiveSpreadPercent: (comp.effectiveSpread / comp.effectiveMidPrice) * 100,
        isBest: comp.isBest,
        lastUpdate: Date.now(),
        stale: staleKeys.has(`${comp.venue.id}-${symbol}`)
      }))

      processed.push({
        symbol,
        venues: processedVenues
      })
    })

    return processed
  }, [spreads])

  // Calculate missed savings for the last hour
  const missedSavingsData = useMemo(() => {
    if (processedSpreads.length === 0) return { total: 0, bySymbol: {} }
    
    const now = Date.now()
    const oneHourAgo = now - 60 * 60 * 1000 // 1 hour ago
    
    // Filter buffer to last hour
    const recentData = missedSavingsBuffer.filter(item => item.timestamp > oneHourAgo)
    
    // Calculate total missed savings across all symbols
    const totalMissedSavings = recentData.reduce((sum, item) => sum + item.missedSavings, 0)
    
    // Calculate by symbol
    const bySymbol = recentData.reduce((acc, item) => {
      if (!acc[item.symbol]) acc[item.symbol] = 0
      acc[item.symbol] += item.missedSavings
      return acc
    }, {} as Record<string, number>)
    
    return {
      total: totalMissedSavings,
      bySymbol,
      dataPoints: recentData.length
    }
  }, [missedSavingsBuffer, processedSpreads])

  const summaryMetrics = useMemo(() => {
    if (processedSpreads.length === 0) {
      return {
        activeSymbols: 0,
        topVenue: '—',
        avgBestSpreadBps: 0,
        totalMissedSavings: missedSavingsData.total
      }
    }

    const venueWins: Record<string, number> = {}
    let spreadAccumulator = 0
    let spreadCount = 0

    processedSpreads.forEach((group) => {
      const best = group.venues.find((venue) => venue.isBest)
      if (best) {
        venueWins[best.venue] = (venueWins[best.venue] ?? 0) + 1
        spreadAccumulator += best.effectiveSpreadPercent
        spreadCount += 1
      }
    })

    const topVenueEntry = Object.entries(venueWins)
      .sort((a, b) => b[1] - a[1])[0]

    return {
      activeSymbols: processedSpreads.length,
      topVenue: topVenueEntry ? `${topVenueEntry[0]} • ${topVenueEntry[1]} wins` : '—',
      avgBestSpreadBps: spreadCount > 0 ? (spreadAccumulator / spreadCount) * 100 : 0,
      totalMissedSavings: missedSavingsData.total
    }
  }, [processedSpreads, missedSavingsData.total])

  useEffect(() => {
    let isMounted = true

    async function load() {
      // Only show loading on initial load, not on refreshes
      if (spreadsRef.current.length === 0) {
        setLoading(true)
      } else {
        setUpdating(true)
      }
      setError(null)
      
      try {
        const symbolParam = SUPPORTED_SYMBOLS.map((symbol) => encodeURIComponent(symbol)).join(',')
        const response = await fetch(`/api/router/quote?symbols=${symbolParam}`, { cache: 'no-store' })
        if (!response.ok) {
          throw new Error(`Router API error: ${response.status}`)
        }

        const payload = await response.json()
        if (!isMounted) return

        const processedResults: SpreadData[] = []
        const newPriceCache = { ...priceCacheRef.current }
        const newExchangeStatus: typeof exchangeStatus = {}
        const newHistory: Record<string, RouterHistoryPoint[]> = {}

        for (const symbolResult of payload.symbols ?? []) {
          const symbol: string = symbolResult.symbol
          if (Array.isArray(symbolResult.history)) {
            newHistory[symbol] = symbolResult.history as RouterHistoryPoint[]
          }

          for (const venueResult of symbolResult.venues ?? []) {
            const venueId = venueResult.venueId as VenueId | undefined
            if (!venueId) continue

            const exchangeName = VENUE_METADATA[venueId]?.label ?? venueId.toUpperCase()

            if (venueResult.status === 'ok' && isFinite(venueResult.bid ?? NaN) && isFinite(venueResult.ask ?? NaN)) {
              const bid = Number(venueResult.bid)
              const ask = Number(venueResult.ask)
              const mid = (bid + ask) / 2
              const spread = Math.max(0, ask - bid)
              const spreadPercent = mid > 0 ? (spread / mid) * 100 : 0
              const lastUpdate = venueResult.timestamp ?? Date.now()

              const quote: SpreadData = {
                exchange: exchangeName,
                venueId,
                symbol,
                bid,
                ask,
                spread,
                spreadPercent,
                lastUpdate
              }

              processedResults.push(quote)
              newPriceCache[`${exchangeName}-${symbol}`] = quote
              newExchangeStatus[exchangeName] = {
                status: 'online',
                lastSeen: lastUpdate
              }
            } else {
              const prevStatus = newExchangeStatus[exchangeName]
              if (!prevStatus || prevStatus.status !== 'online') {
                newExchangeStatus[exchangeName] = {
                  status: 'offline',
                  lastSeen: prevStatus?.lastSeen ?? Date.now(),
                  error: venueResult.error
                }
              }

              const cachedPrice = priceCacheRef.current?.[`${exchangeName}-${symbol}`]
              if (cachedPrice) {
                processedResults.push({
                  ...cachedPrice,
                  stale: true
                } as SpreadData & { stale: true })
              }
            }
          }
        }

        setExchangeStatus(newExchangeStatus)
        setPriceCache(newPriceCache)
        setSpreads(processedResults)
        setLastUpdated(Date.now())
        if (Object.keys(newHistory).length > 0) {
          setHistory((prev) => ({ ...prev, ...newHistory }))
        }
        if (processedResults.length === 0) {
          setError('No exchange data available. Please check your internet connection.')
        }

        // Update missed savings buffer with new data
        if (processedResults.length > 0) {
          const currentReferenceVenue = referenceVenueRef.current

          // Group by symbol to calculate missed savings per symbol per update
          const symbolGroups = processedResults.reduce((acc, result) => {
            if (!acc[result.symbol]) acc[result.symbol] = []
            acc[result.symbol].push(result)
            return acc
          }, {} as Record<string, typeof processedResults>)
          
          const newMissedSavingsData = Object.entries(symbolGroups)
            .map(([symbol, symbolResults]) => {
              // Only process if we have data from reference venue and at least one other venue
              const referenceVenueData = symbolResults.find(r => r.exchange === currentReferenceVenue && isFinite(r.bid) && isFinite(r.ask))
              if (!referenceVenueData) return null
              
              // Find best venue (lowest mid price)
              const validResults = symbolResults.filter(r => isFinite(r.bid) && isFinite(r.ask))
              if (validResults.length < 2) return null // Need at least 2 venues to compare
              
              const bestVenue = validResults.reduce((best, current) => {
                const currentMid = (current.bid + current.ask) / 2
                const bestMid = (best.bid + best.ask) / 2
                return currentMid < bestMid ? current : best
              })
              
              // Calculate missed savings per $1000 of trade (normalized)
              const bestMid = (bestVenue.bid + bestVenue.ask) / 2
              const referenceMid = (referenceVenueData.bid + referenceVenueData.ask) / 2
              const priceDifference = referenceMid - bestMid
              
              // Normalize to $1000 trade size for meaningful comparison
              const normalizedMissedSavings = (priceDifference / bestMid) * 1000
              
              console.log(`Missed Savings for ${symbol}:`, {
                bestVenue: bestVenue.exchange,
                bestPrice: bestMid.toFixed(2),
                referenceVenue: currentReferenceVenue,
                referencePrice: referenceMid.toFixed(2),
                priceDifference: priceDifference.toFixed(4),
                normalizedSavings: normalizedMissedSavings.toFixed(2)
              })
              
              return {
                timestamp: Date.now(),
                symbol,
                bestEffectivePrice: bestMid,
                referenceEffectivePrice: referenceMid,
                missedSavings: Math.max(0, normalizedMissedSavings)
              }
            })
            .filter(Boolean)
          
          // Add to buffer and maintain only last 60 points (1 hour at 1-minute intervals)
          setMissedSavingsBuffer(prev => {
            const validData = newMissedSavingsData.filter((item): item is NonNullable<typeof item> => item !== null)
            const newBuffer = [...prev, ...validData]
            return newBuffer.slice(-60) // Keep only last 60 data points
          })
        }
        
        if (processedResults.length === 0) {
          setError('No exchange data available. Please check your internet connection.')
        }
      } catch (e: any) {
        if (!isMounted) return
        setError(e?.message || 'Failed to load spreads')
      } finally {
        if (isMounted) {
          setLoading(false)
          setUpdating(false)
          console.log('Load completed, loading:', false, 'updating:', false)
        }
      }
    }

    load()
    const id = setInterval(load, REFRESH_MS)
    return () => {
      isMounted = false
      clearInterval(id)
    }
  }, [])

  const getSpreadColor = (spreadPercent: number) => {
    if (!isFinite(spreadPercent)) return 'bg-gray-100 text-gray-600'
    if (spreadPercent < 0.05) return 'bg-green-100 text-green-800'
    if (spreadPercent < 0.1) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const getExchangeStatusColor = (venue: string) => {
    const status = exchangeStatus[venue]?.status
    switch (status) {
      case 'online': return 'bg-green-500'
      case 'offline': return 'bg-red-500'
      case 'error': return 'bg-yellow-500'
      default: return 'bg-gray-400'
    }
  }

  const Sparkline = ({ symbol }: { symbol: string }) => {
    const points = history[symbol] ?? []
    const chartData = useMemo(() => (
      points
        .filter((point) => point.bestEffectiveMidPrice !== null)
        .map((point) => ({
          timestamp: point.timestamp,
          value: point.bestEffectiveMidPrice as number
        }))
    ), [points])

    if (chartData.length < 2) {
      return <div className="h-12 w-32 rounded-lg bg-slate-100" />
    }

    const gradientId = `sparkline-${symbol.replace(/[^a-z0-9]/gi, '').toLowerCase()}`

    return (
      <div className="h-12 w-32">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, bottom: 0, left: 0, right: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="value" stroke="#38bdf8" strokeWidth={2} fill={`url(#${gradientId})`} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    )
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0 }
  }

  const rowVariants = {
    hidden: { opacity: 0, y: 6 },
    visible: { opacity: 1, y: 0 }
  }

  if (loading && Object.keys(priceCache).length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error && spreads.length === 0) {
    return (
      <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded">
        Failed to load data: {error}
      </div>
    )
  }

  const summaryCards = [
    {
      title: 'Active Symbols',
      value: summaryMetrics.activeSymbols,
      helper: 'Tracked pairs'
    },
    {
      title: 'Top Venue',
      value: summaryMetrics.topVenue,
      helper: 'Most frequent optimal route'
    },
    {
      title: 'Avg Best Spread',
      value: `${summaryMetrics.avgBestSpreadBps.toFixed(2)} bps`,
      helper: 'Fee-adjusted basis points'
    }
  ]

  const averageMissedSavings = missedSavingsData.dataPoints > 0
    ? missedSavingsData.total / missedSavingsData.dataPoints
    : 0

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/80 shadow-xl backdrop-blur">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100" />
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-500" />
      <div className="pointer-events-none absolute -right-32 -top-40 h-72 w-72 rounded-full bg-sky-100 opacity-60 blur-3xl" />
      <div className="pointer-events-none absolute -left-32 bottom-0 h-64 w-64 rounded-full bg-emerald-100 opacity-60 blur-3xl" />

      <div className="relative space-y-8 p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
        >
          <div>
            <h3 className="text-2xl font-semibold text-slate-900">Routing Intelligence</h3>
            <p className="text-sm text-slate-500">
              Normalized order books with fee-adjusted routing insights across leading spot venues.
            </p>
          </div>

          <div className="flex items-center gap-3 text-sm text-slate-500">
            {updating && (
              <span className="flex items-center gap-1 text-sky-600">
                <span className="h-2 w-2 animate-pulse rounded-full bg-sky-500" />
                Refreshing…
              </span>
            )}
            <span>Last updated {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : '--:--:--'}</span>
          </div>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="visible"
          transition={{ staggerChildren: 0.05, delayChildren: 0.1 }}
          className="grid gap-4 sm:grid-cols-3"
        >
          {summaryCards.map((card, idx) => (
            <motion.div
              key={card.title}
              variants={cardVariants}
              className="group rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm transition hover:-translate-y-1 hover:border-sky-200 hover:shadow-md"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{card.title}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{card.value}</p>
              <p className="text-xs text-slate-500">{card.helper}</p>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="grid gap-4 lg:grid-cols-2"
        >
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Venue Health</span>
              <span className="text-xs text-slate-400">Live heartbeat</span>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {VENUE_IDS.map(({ id, label }) => {
                const status = exchangeStatus[label]
                return (
                  <div key={id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${getExchangeStatusColor(label)}`} />
                      <span className="text-sm font-medium text-slate-700">{label}</span>
                    </div>
                    <span className="text-xs font-medium text-slate-500">
                      {status?.status === 'online' ? 'Online' : status?.status === 'offline' ? 'Offline' : 'Unknown'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-emerald-800">Missed Savings (1h)</span>
              <div className="flex items-center gap-2 text-xs text-emerald-700">
                <span>Reference venue</span>
                <select
                  value={referenceVenue}
                  onChange={(e) => setReferenceVenue(e.target.value)}
                  className="rounded-md border border-emerald-200 bg-white px-2 py-1 text-xs font-medium text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                >
                  {VENUE_IDS.map(({ label }) => (
                    <option key={label} value={label}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-emerald-600">Total (per $1000)</p>
                <p className="mt-1 text-3xl font-semibold text-emerald-700">
                  ${missedSavingsData.total.toFixed(2)}
                </p>
                <p className="text-xs text-emerald-600">{missedSavingsData.dataPoints} data points</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-emerald-600">Average update</p>
                <p className="mt-1 text-2xl font-semibold text-emerald-700">
                  ${averageMissedSavings.toFixed(4)}
                </p>
                <p className="text-xs text-emerald-600">Based on last hour</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-emerald-700">
              Fee-adjusted comparison versus {referenceVenue}. Numbers represent normalized savings per $1000 notional routed to the best venue.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Exchange</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Symbol</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Trend</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Bid</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Ask</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Spread</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Spread %</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Effective Bid</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Effective Ask</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Best</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {processedSpreads.flatMap((symbolGroup, groupIndex) =>
                  symbolGroup.venues.map((venue) => (
                    <motion.tr
                      key={`${symbolGroup.symbol}-${venue.venue}`}
                      initial="hidden"
                      animate="visible"
                      variants={rowVariants}
                      transition={{ duration: 0.3, delay: groupIndex * 0.05 }}
                      className={`bg-white/90 transition hover:bg-slate-50 ${updating ? 'opacity-75' : 'opacity-100'}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${getExchangeStatusColor(venue.venue)}`} />
                          <span className="text-sm font-semibold text-slate-900">{venue.venue}</span>
                          {(venue as any).stale && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Cached</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-700">{symbolGroup.symbol}</td>
                      <td className="px-4 py-3"><Sparkline symbol={symbolGroup.symbol} /></td>
                      <td className="px-4 py-3 text-right text-sm font-mono text-slate-700">${venue.bid.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-sm font-mono text-slate-700">${venue.ask.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-sm font-mono text-slate-700">${venue.spread.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex min-w-[4rem] justify-end rounded-full px-2 py-1 text-xs font-semibold ${getSpreadColor(venue.spreadPercent)}`}>
                          {venue.spreadPercent.toFixed(3)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-mono text-slate-700">${venue.effectiveBid.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-sm font-mono text-slate-700">${venue.effectiveAsk.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">
                        {venue.isBest && (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                            Best
                          </span>
                        )}
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        <p className="text-xs text-slate-500">
          Aggregated from public spot endpoints (Kraken, OKX, Gate.io). Fee adjustments include venue taker costs; cached quotes surface when venues throttle or block access.
        </p>
      </div>
    </div>
  )
}
