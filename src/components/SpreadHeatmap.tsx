'use client'

import { useState, useEffect, useMemo } from 'react'

interface SpreadData {
  exchange: string
  symbol: string
  bid: number
  ask: number
  spread: number
  spreadPercent: number
  lastUpdate: number
}

type Venue = 'Binance' | 'Kraken' | 'KuCoin' | 'Coinbase' | 'OKX'

// We will fetch two assets to start. Feel free to add more symbols here.
const ASSETS = [
  { symbol: 'BTC/USDT', binance: 'BTCUSDT', kraken: 'XBTUSDT', kucoin: 'BTC-USDT', coinbase: 'BTC-USD', okx: 'BTC-USDT' },
  { symbol: 'ETH/USDT', binance: 'ETHUSDT', kraken: 'ETHUSDT', kucoin: 'ETH-USDT', coinbase: 'ETH-USD', okx: 'ETH-USDT' },
] as const

const REFRESH_MS = 10_000 // refresh every 10 seconds

async function fetchBinanceBook(symbol: string): Promise<{ bid: number; ask: number }> {
  try {
    const url = `https://api.binance.com/api/v3/ticker/bookTicker?symbol=${symbol}`
    const r = await fetch(url, { 
      cache: 'no-store',
      headers: { 'User-Agent': 'Crypto-Router-DCA/1.0' }
    })
    if (!r.ok) {
      if (r.status === 451) {
        throw new Error('Geographic restriction - Binance blocked in your region')
      }
      throw new Error(`Binance request failed: ${r.status}`)
    }
    const j = await r.json()
    const bid = Number(j.bidPrice)
    const ask = Number(j.askPrice)
    if (!isFinite(bid) || !isFinite(ask) || bid <= 0 || ask <= 0) {
      throw new Error('Invalid Binance data')
    }
    return { bid, ask }
  } catch (error: any) {
    console.warn(`Binance ${symbol} fetch failed:`, error.message)
    throw error
  }
}

async function fetchKrakenBook(symbol: string): Promise<{ bid: number; ask: number }> {
  const url = `https://api.kraken.com/0/public/Ticker?pair=${symbol}`
  const r = await fetch(url, { cache: 'no-store' })
  if (!r.ok) throw new Error('Kraken request failed')
  const j = await r.json()
  const key = j?.result ? Object.keys(j.result)[0] : undefined
  const d = key ? j.result[key] : undefined
  const bid = d?.b ? Number(d.b[0]) : NaN
  const ask = d?.a ? Number(d.a[0]) : NaN
  if (!isFinite(bid) || !isFinite(ask)) throw new Error('Invalid Kraken data')
  return { bid, ask }
}

async function fetchKuCoinBook(symbol: string): Promise<{ bid: number; ask: number }> {
  try {
    const url = `https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=${symbol}`
    const r = await fetch(url, { 
      cache: 'no-store',
      headers: { 'User-Agent': 'Crypto-Router-DCA/1.0' }
    })
    if (!r.ok) throw new Error(`KuCoin request failed: ${r.status}`)
    const j = await r.json()
    
    // Debug logging to see what we're getting
    console.log(`KuCoin ${symbol} response:`, j)
    
    const bid = Number(j?.data?.bestBid)
    const ask = Number(j?.data?.bestAsk)
    
    if (!isFinite(bid) || !isFinite(ask) || bid <= 0 || ask <= 0) {
      throw new Error(`Invalid KuCoin data: bid=${bid}, ask=${ask}`)
    }
    return { bid, ask }
  } catch (error: any) {
    console.warn(`KuCoin ${symbol} fetch failed:`, error.message)
    throw error
  }
}

// Coinbase Pro fetcher
async function fetchCoinbaseBook(symbol: string): Promise<{ bid: number; ask: number }> {
  try {
    const url = `https://api.pro.coinbase.com/products/${symbol}/ticker`
    const r = await fetch(url, { 
      cache: 'no-store',
      headers: { 'User-Agent': 'Crypto-Router-DCA/1.0' }
    })
    if (!r.ok) throw new Error(`Coinbase request failed: ${r.status}`)
    const j = await r.json()
    const bid = Number(j.bid)
    const ask = Number(j.ask)
    if (!isFinite(bid) || !isFinite(ask) || bid <= 0 || ask <= 0) {
      throw new Error('Invalid Coinbase data')
    }
    return { bid, ask }
  } catch (error) {
    console.warn(`Coinbase ${symbol} fetch failed:`, error)
    throw error
  }
}

// OKX fetcher
async function fetchOKXBook(symbol: string): Promise<{ bid: number; ask: number }> {
  try {
    const url = `https://www.okx.com/api/v5/market/ticker?instId=${symbol}`
    const r = await fetch(url, { 
      cache: 'no-store',
      headers: { 'User-Agent': 'Crypto-Router-DCA/1.0' }
    })
    if (!r.ok) throw new Error(`OKX request failed: ${r.status}`)
    const j = await r.json()
    const data = j?.data?.[0]
    const bid = Number(data?.bidPx)
    const ask = Number(data?.askPx)
    if (!isFinite(bid) || !isFinite(ask) || bid <= 0 || ask <= 0) {
      throw new Error('Invalid OKX data')
    }
    return { bid, ask }
  } catch (error) {
    console.warn(`OKX ${symbol} fetch failed:`, error)
    throw error
  }
}

// CoinGecko fallback fetcher (when other exchanges fail)
async function fetchCoinGeckoBook(symbol: string): Promise<{ bid: number; ask: number }> {
  try {
    // Map our symbols to CoinGecko IDs
    const symbolMap: Record<string, string> = {
      'BTC/USDT': 'bitcoin',
      'ETH/USDT': 'ethereum',
      'SOL/USDT': 'solana',
      'ADA/USDT': 'cardano'
    }
    
    const coinId = symbolMap[symbol]
    if (!coinId) throw new Error(`Unsupported symbol for CoinGecko: ${symbol}`)
    
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`
    const r = await fetch(url, { 
      cache: 'no-store',
      headers: { 'User-Agent': 'Crypto-Router-DCA/1.0' }
    })
    
    if (!r.ok) throw new Error(`CoinGecko request failed: ${r.status}`)
    const j = await r.json()
    
    const price = j[coinId]?.usd
    if (!isFinite(price) || price <= 0) {
      throw new Error('Invalid CoinGecko data')
    }
    
    // CoinGecko only gives current price, so we estimate bid/ask with a small spread
    const spread = price * 0.001 // 0.1% spread
    const bid = price - (spread / 2)
    const ask = price + (spread / 2)
    
    return { bid, ask }
  } catch (error: any) {
    console.warn(`CoinGecko ${symbol} fetch failed:`, error.message)
    throw error
  }
}

export function SpreadHeatmap() {
  const [spreads, setSpreads] = useState<SpreadData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const [exchangeStatus, setExchangeStatus] = useState<Record<string, { status: 'online' | 'offline' | 'error'; lastSeen: number; error?: string }>>({})

  const exchanges: { venue: Venue; fetcher: (sym: string) => Promise<{ bid: number; ask: number }>; key: keyof typeof ASSETS[number] }[] = useMemo(
    () => [
      { venue: 'Binance', fetcher: fetchBinanceBook, key: 'binance' },
      { venue: 'Kraken', fetcher: fetchKrakenBook, key: 'kraken' },
      { venue: 'KuCoin', fetcher: fetchKuCoinBook, key: 'kucoin' },
      { venue: 'Coinbase', fetcher: fetchCoinbaseBook, key: 'coinbase' },
      { venue: 'OKX', fetcher: fetchOKXBook, key: 'okx' },
    ],
    []
  )

  useEffect(() => {
    let isMounted = true

    async function load() {
      setLoading(true)
      setError(null)

      // Build all fetch promises
      const jobs: Promise<SpreadData>[] = []
      const exchangeResults: Record<string, { success: boolean; timestamp: number; error?: string }> = {}

      for (const a of ASSETS) {
        for (const ex of exchanges) {
          const mapSym = a[ex.key]
          if (!mapSym) continue
          
          const job = ex
            .fetcher(mapSym)
            .then(({ bid, ask }) => {
              const mid = (bid + ask) / 2
              const spread = Math.max(0, ask - bid)
              const spreadPercent = mid > 0 ? (spread / mid) * 100 : 0
              
              // Track successful exchange
              exchangeResults[ex.venue] = { success: true, timestamp: Date.now() }
              
              return {
                exchange: ex.venue,
                symbol: a.symbol,
                bid,
                ask,
                spread,
                spreadPercent,
                lastUpdate: Date.now(),
              } satisfies SpreadData
            })
            .catch((error) => {
              // Track failed exchange with error details
              exchangeResults[ex.venue] = { 
                success: false, 
                timestamp: Date.now(),
                error: error.message || 'Unknown error'
              }
              
              console.warn(`${ex.venue} failed for ${a.symbol}:`, error.message)
              
              // Return unavailable data
              return {
                exchange: ex.venue,
                symbol: a.symbol,
                bid: NaN,
                ask: NaN,
                spread: NaN,
                spreadPercent: NaN,
                lastUpdate: Date.now(),
              } as SpreadData
            })
          jobs.push(job)
        }
      }

      try {
        const results = await Promise.all(jobs)
        if (!isMounted) return
        
        // Update exchange status
        setExchangeStatus(prev => {
          const newStatus = { ...prev }
          Object.entries(exchangeResults).forEach(([venue, result]) => {
            newStatus[venue] = {
              status: result.success ? 'online' : 'offline',
              lastSeen: result.timestamp,
              error: result.error
            }
          })
          return newStatus
        })
        
        // Filter out any entries where either bid/ask is NaN
        const ok = results.filter((r) => isFinite(r.bid) && isFinite(r.ask))
        setSpreads(ok)
        setLastUpdated(Date.now())
        
        if (ok.length === 0) {
          setError('No exchange data available. Please check your internet connection.')
        }
      } catch (e: any) {
        if (!isMounted) return
        setError(e?.message || 'Failed to load spreads')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    load()
    const id = setInterval(load, REFRESH_MS)
    return () => {
      isMounted = false
      clearInterval(id)
    }
  }, [exchanges])

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

  if (loading) {
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Exchange Spreads</h3>
        <div className="text-sm text-gray-600">
          Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : '--:--:--'}
        </div>
      </div>

      {/* Exchange Status Indicators */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Exchange Status:</h4>
        <div className="flex flex-wrap gap-3">
          {exchanges.map(({ venue }) => {
            const status = exchangeStatus[venue]
            return (
              <div key={venue} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getExchangeStatusColor(venue)}`} />
                <span className="text-sm font-medium text-gray-700">{venue}</span>
                <span className="text-xs text-gray-500">
                  {status?.status === 'online' ? '✓' : status?.status === 'offline' ? '✗' : '?'}
                </span>
                {status?.error && (
                  <span className="text-xs text-red-500" title={status.error}>!</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exchange</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Bid</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ask</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Spread</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Spread %</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {spreads.map((spread, index) => (
              <tr key={`${spread.exchange}-${spread.symbol}-${index}`} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getExchangeStatusColor(spread.exchange)}`} />
                    {spread.exchange}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{spread.symbol}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-mono">
                  ${spread.bid.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-mono">
                  ${spread.ask.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-mono">
                  ${spread.spread.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSpreadColor(spread.spreadPercent)}`}>
                    {isFinite(spread.spreadPercent) ? spread.spreadPercent.toFixed(3) + '%' : 'N/A'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500">
        Data fetched from public endpoints (Binance, Kraken, KuCoin, Coinbase, OKX) without API keys. 
        Some venues may occasionally fail or block CORS; rows with missing data are omitted automatically.
      </p>
    </div>
  )
}
