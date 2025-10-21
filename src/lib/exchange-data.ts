import type { VenueId } from '@/config/markets'

export interface OrderBookResult {
  venueId: VenueId
  bid: number
  ask: number
  timestamp: number
}

export class ExchangeFetchError extends Error {
  venueId: string
  status?: number

  constructor(venueId: string, message: string, status?: number) {
    super(message)
    this.name = 'ExchangeFetchError'
    this.venueId = venueId
    this.status = status
  }
}

async function fetchJson(url: string, venueId: VenueId, init?: RequestInit) {
  const response = await fetch(url, {
    cache: 'no-store',
    headers: {
      'User-Agent': 'Crypto-Router-DCA/1.0',
      Accept: 'application/json',
      ...init?.headers
    },
    ...init
  })

  if (!response.ok) {
    throw new ExchangeFetchError(venueId, `Request failed with status ${response.status}`, response.status)
  }

  return response.json()
}

async function fetchKrakenTicker(symbol: string): Promise<OrderBookResult> {
  const url = `https://api.kraken.com/0/public/Ticker?pair=${symbol}`
  const data = await fetchJson(url, 'kraken')

  if (!data?.result) {
    throw new ExchangeFetchError('kraken', `Invalid Kraken payload for ${symbol}`)
  }

  const key = Object.keys(data.result)[0]
  const ticker = key ? data.result[key] : undefined
  const bid = Number(ticker?.b?.[0])
  const ask = Number(ticker?.a?.[0])

  if (!isFinite(bid) || !isFinite(ask) || bid <= 0 || ask <= 0) {
    throw new ExchangeFetchError('kraken', `Invalid Kraken data for ${symbol}`)
  }

  return {
    venueId: 'kraken',
    bid,
    ask,
    timestamp: Date.now()
  }
}

async function fetchOkxTicker(symbol: string): Promise<OrderBookResult> {
  const url = `https://www.okx.com/api/v5/market/ticker?instId=${symbol}`
  const data = await fetchJson(url, 'okx')
  const ticker = data?.data?.[0]

  const bid = Number(ticker?.bidPx)
  const ask = Number(ticker?.askPx)

  if (!isFinite(bid) || !isFinite(ask) || bid <= 0 || ask <= 0) {
    throw new ExchangeFetchError('okx', `Invalid OKX data for ${symbol}`)
  }

  return {
    venueId: 'okx',
    bid,
    ask,
    timestamp: Number(ticker?.ts ?? Date.now())
  }
}

async function fetchGateioTicker(symbol: string): Promise<OrderBookResult> {
  const gateSymbol = symbol.includes('_') ? symbol : symbol.replace('/', '_')
  const url = `https://api.gateio.ws/api/v4/spot/tickers?currency_pair=${gateSymbol}`
  const data = await fetchJson(url, 'gateio')
  const ticker = Array.isArray(data) ? data[0] : undefined

  const bid = Number(ticker?.highest_bid)
  const ask = Number(ticker?.lowest_ask)

  if (!isFinite(bid) || !isFinite(ask) || bid <= 0 || ask <= 0) {
    throw new ExchangeFetchError('gateio', `Invalid Gate.io data for ${symbol}`)
  }

  return {
    venueId: 'gateio',
    bid,
    ask,
    timestamp: Date.now()
  }
}

const EXCHANGE_FETCHERS: Record<VenueId, (symbol: string) => Promise<OrderBookResult>> = {
  kraken: fetchKrakenTicker,
  okx: fetchOkxTicker,
  gateio: fetchGateioTicker
}

export async function fetchOrderBook(venueId: VenueId, symbol: string): Promise<OrderBookResult> {
  const fetcher = EXCHANGE_FETCHERS[venueId]
  if (!fetcher) {
    throw new ExchangeFetchError(venueId, `No fetcher registered for venue ${venueId}`)
  }

  return fetcher(symbol)
}

export type { VenueId }
