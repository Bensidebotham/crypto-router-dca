import { SYMBOL_CONFIG, VENUE_METADATA, SUPPORTED_SYMBOLS } from '@/config/markets'
import type { SupportedSymbol, VenueId } from '@/config/markets'
import { fetchOrderBook, type OrderBookResult, ExchangeFetchError } from '@/lib/exchange-data'
import { compareVenuesForPair } from '@/lib/venues'

interface CacheEntry {
  data: OrderBookResult
  timestamp: number
}

interface VenueQuote {
  venueId: VenueId
  bid: number | null
  ask: number | null
  timestamp: number | null
  status: 'ok' | 'error'
  error?: string
}

export interface SymbolSnapshot {
  symbol: SupportedSymbol
  venues: VenueQuote[]
  comparisons: ReturnType<typeof compareVenuesForPair>
  bestVenue: ReturnType<typeof compareVenuesForPair>[number] | null
  history: RouterHistoryPoint[]
}

export interface RouterHistoryPoint {
  timestamp: number
  bestVenueId: VenueId | null
  bestVenueLabel: string | null
  bestEffectiveMidPrice: number | null
  bestEffectiveSpreadBps: number | null
}

export interface RouteSimulationInput {
  symbol: SupportedSymbol
  side: 'buy' | 'sell'
  size: number
  referenceVenue?: string
}

export interface RouteSimulationResult {
  symbol: SupportedSymbol
  side: 'buy' | 'sell'
  size: number
  timestamp: number
  bestRoute: RouteVenueQuote | null
  referenceRoute: RouteVenueQuote | null
  savingsUSD: number | null
  savingsBps: number | null
  quotes: ReturnType<typeof compareVenuesForPair>
}

interface RouteVenueQuote {
  venueId: VenueId
  venueLabel: string
  effectivePrice: number
  rawBid: number
  rawAsk: number
  effectiveBid: number
  effectiveAsk: number
  effectiveSpread: number
}

const CACHE_TTL_MS = 5_000
const HISTORY_LIMIT = 120

const orderCache = new Map<string, CacheEntry>()
const historyStore = new Map<SupportedSymbol, RouterHistoryPoint[]>()

function cacheKey(venueId: VenueId, venueSymbol: string) {
  return `${venueId}:${venueSymbol}`
}

async function getOrderBookWithCache(venueId: VenueId, venueSymbol: string): Promise<OrderBookResult> {
  const key = cacheKey(venueId, venueSymbol)
  const entry = orderCache.get(key)
  const now = Date.now()

  if (entry && now - entry.timestamp <= CACHE_TTL_MS) {
    return entry.data
  }

  const data = await fetchOrderBook(venueId, venueSymbol)
  orderCache.set(key, { data, timestamp: now })
  return data
}

function recordHistoryPoint(symbol: SupportedSymbol, comparisons: ReturnType<typeof compareVenuesForPair>) {
  const history = historyStore.get(symbol) ?? []
  const best = comparisons.find((comp) => comp.isBest) ?? null

  const bestVenueId = best?.venue.id as VenueId | undefined

  history.push({
    timestamp: Date.now(),
    bestVenueId: bestVenueId ?? null,
    bestVenueLabel: bestVenueId ? (VENUE_METADATA[bestVenueId]?.label ?? best?.venue.name ?? null) : null,
    bestEffectiveMidPrice: best?.effectiveMidPrice ?? null,
    bestEffectiveSpreadBps: best && best.effectiveMidPrice > 0
      ? (best.effectiveSpread / best.effectiveMidPrice) * 10_000
      : null
  })

  historyStore.set(symbol, history.slice(-HISTORY_LIMIT))
}

export function getRouterHistory(symbol: SupportedSymbol, limit = 60): RouterHistoryPoint[] {
  const history = historyStore.get(symbol) ?? []
  return history.slice(-limit)
}

export async function getSymbolSnapshot(symbol: SupportedSymbol): Promise<SymbolSnapshot> {
  const venueMap = SYMBOL_CONFIG[symbol]
  const venues = Object.entries(venueMap) as Array<[VenueId, string]>
  const quotes: VenueQuote[] = []

  const jobs = await Promise.allSettled(
    venues.map(async ([venueId, venueSymbol]) => {
      const data = await getOrderBookWithCache(venueId, venueSymbol)
      return data
    })
  )

  jobs.forEach((result, index) => {
    const [venueId] = venues[index]
    if (result.status === 'fulfilled') {
      quotes.push({
        venueId,
        bid: result.value.bid,
        ask: result.value.ask,
        timestamp: result.value.timestamp,
        status: 'ok'
      })
    } else {
      const reason = result.reason as Error
      const message = reason instanceof ExchangeFetchError ? reason.message : reason.message ?? 'Unknown error'
      quotes.push({
        venueId,
        bid: null,
        ask: null,
        timestamp: null,
        status: 'error',
        error: message
      })
    }
  })

  const validQuotes = quotes
    .filter((quote): quote is VenueQuote & { bid: number; ask: number; timestamp: number } =>
      quote.status === 'ok' && isFinite(quote.bid ?? NaN) && isFinite(quote.ask ?? NaN)
    )
    .map((quote) => ({
      venueId: quote.venueId,
      bid: quote.bid,
      ask: quote.ask,
      lastUpdate: quote.timestamp
    }))

  const comparisons = compareVenuesForPair(symbol, validQuotes)
  const bestVenue = comparisons.find((comp) => comp.isBest) ?? null

  recordHistoryPoint(symbol, comparisons)

  return {
    symbol,
    venues: quotes,
    comparisons,
    bestVenue,
    history: getRouterHistory(symbol)
  }
}

export async function getSymbolSnapshots(symbols: SupportedSymbol[]): Promise<SymbolSnapshot[]> {
  return Promise.all(symbols.map((symbol) => getSymbolSnapshot(symbol)))
}

function normalizeVenue(input?: string): VenueId | undefined {
  if (!input) return undefined
  const normalized = input.toLowerCase()

  const byId = (Object.keys(VENUE_METADATA) as VenueId[]).find((id) => id === normalized)
  if (byId) return byId

  const byLabel = (Object.entries(VENUE_METADATA) as Array<[VenueId, { label: string }]>) //
    .find(([, meta]) => meta.label.toLowerCase() === normalized)
  return byLabel?.[0]
}

export async function simulateRoute({
  symbol,
  side,
  size,
  referenceVenue
}: RouteSimulationInput): Promise<RouteSimulationResult> {
  const [snapshot] = await getSymbolSnapshots([symbol])
  const quotes = snapshot.comparisons

  const priceSelector = side === 'buy'
    ? (comp: typeof quotes[number]) => comp.effectiveAsk
    : (comp: typeof quotes[number]) => comp.effectiveBid

  const comparator = side === 'buy'
    ? (a: typeof quotes[number], b: typeof quotes[number]) => priceSelector(a) - priceSelector(b)
    : (a: typeof quotes[number], b: typeof quotes[number]) => priceSelector(b) - priceSelector(a)

  const sortedQuotes = [...quotes].sort(comparator)
  const best = sortedQuotes[0]

  const normalizedReference = normalizeVenue(referenceVenue)
  const reference = normalizedReference
    ? quotes.find((comp) => comp.venue.id === normalizedReference) ?? null
    : null

  const bestRoute = best
    ? {
        venueId: best.venue.id,
        venueLabel: VENUE_METADATA[best.venue.id].label,
        effectivePrice: priceSelector(best),
        rawBid: best.bid,
        rawAsk: best.ask,
        effectiveBid: best.effectiveBid,
        effectiveAsk: best.effectiveAsk,
        effectiveSpread: best.effectiveSpread
      }
    : null

  const referenceRoute = reference
    ? {
        venueId: reference.venue.id,
        venueLabel: VENUE_METADATA[reference.venue.id].label,
        effectivePrice: priceSelector(reference),
        rawBid: reference.bid,
        rawAsk: reference.ask,
        effectiveBid: reference.effectiveBid,
        effectiveAsk: reference.effectiveAsk,
        effectiveSpread: reference.effectiveSpread
      }
    : null

  let savingsUSD: number | null = null
  let savingsBps: number | null = null

  if (bestRoute && referenceRoute && bestRoute.venueId !== referenceRoute.venueId) {
    if (side === 'buy') {
      savingsUSD = (referenceRoute.effectivePrice - bestRoute.effectivePrice) * size
      savingsBps = referenceRoute.effectivePrice > 0
        ? ((referenceRoute.effectivePrice - bestRoute.effectivePrice) / referenceRoute.effectivePrice) * 10_000
        : null
    } else {
      savingsUSD = (bestRoute.effectivePrice - referenceRoute.effectivePrice) * size
      savingsBps = referenceRoute.effectivePrice > 0
        ? ((bestRoute.effectivePrice - referenceRoute.effectivePrice) / referenceRoute.effectivePrice) * 10_000
        : null
    }
  }

  return {
    symbol,
    side,
    size,
    timestamp: Date.now(),
    bestRoute,
    referenceRoute,
    savingsUSD,
    savingsBps,
    quotes
  }
}

export { SUPPORTED_SYMBOLS }
