export interface ExchangeVenue {
  id: string
  name: string
  tradingFees: {
    maker: number
    taker: number
  }
  withdrawalFees: Record<string, number>
  minOrderSize: Record<string, number>
  supportedPairs: string[]
  apiRateLimit: {
    requests: number
    window: number // in seconds
  }
  status: 'active' | 'maintenance' | 'inactive'
}

export const EXCHANGE_VENUES: Record<string, ExchangeVenue> = {
  bybit: {
    id: 'bybit',
    name: 'Bybit',
    tradingFees: {
      maker: 0.001, // 0.1%
      taker: 0.001  // 0.1%
    },
    withdrawalFees: {
      BTC: 0.0005,
      ETH: 0.005,
      USDT: 1,
      USDC: 1
    },
    minOrderSize: {
      BTC: 0.0001,
      ETH: 0.001,
      USDT: 10,
      USDC: 10
    },
    supportedPairs: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'ADA/USDT'],
    apiRateLimit: {
      requests: 120,
      window: 60
    },
    status: 'inactive'
  },

  binance: {
    id: 'binance',
    name: 'Binance',
    tradingFees: {
      maker: 0.001, // 0.1%
      taker: 0.001  // 0.1%
    },
    withdrawalFees: {
      BTC: 0.0005,
      ETH: 0.005,
      USDT: 1,
      USDC: 1
    },
    minOrderSize: {
      BTC: 0.00001,
      ETH: 0.001,
      USDT: 10,
      USDC: 10
    },
    supportedPairs: ['BTC/USDT', 'ETH/USDT', 'BTC/USDC', 'ETH/USDC'],
    apiRateLimit: {
      requests: 1200,
      window: 60
    },
    status: 'inactive'
  },
  
  coinbase: {
    id: 'coinbase',
    name: 'Coinbase',
    tradingFees: {
      maker: 0.004, // 0.4%
      taker: 0.006  // 0.6%
    },
    withdrawalFees: {
      BTC: 0.0001,
      ETH: 0.002,
      USDT: 0,
      USDC: 0
    },
    minOrderSize: {
      BTC: 0.0001,
      ETH: 0.001,
      USDT: 1,
      USDC: 1
    },
    supportedPairs: ['BTC/USD', 'ETH/USD', 'BTC/USDT', 'ETH/USDT'],
    apiRateLimit: {
      requests: 100,
      window: 60
    },
    status: 'active'
  },
  
  kraken: {
    id: 'kraken',
    name: 'Kraken',
    tradingFees: {
      maker: 0.0016, // 0.16%
      taker: 0.0026  // 0.26%
    },
    withdrawalFees: {
      BTC: 0.0005,
      ETH: 0.005,
      USDT: 5,
      USDC: 0
    },
    minOrderSize: {
      BTC: 0.0001,
      ETH: 0.001,
      USDT: 5,
      USDC: 1
    },
    supportedPairs: ['BTC/USD', 'ETH/USD', 'BTC/USDT', 'ETH/USDT'],
    apiRateLimit: {
      requests: 15,
      window: 60
    },
    status: 'active'
  },
  
  kucoin: {
    id: 'kucoin',
    name: 'KuCoin',
    tradingFees: {
      maker: 0.001, // 0.1%
      taker: 0.001  // 0.1%
    },
    withdrawalFees: {
      BTC: 0.0005,
      ETH: 0.01,
      USDT: 1,
      USDC: 1
    },
    minOrderSize: {
      BTC: 0.0001,
      ETH: 0.001,
      USDT: 1,
      USDC: 1
    },
    supportedPairs: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'ADA/USDT'],
    apiRateLimit: {
      requests: 1800,
      window: 60
    },
    status: 'active'
  },

  okx: {
    id: 'okx',
    name: 'OKX',
    tradingFees: {
      maker: 0.0008, // 0.08%
      taker: 0.001   // 0.1%
    },
    withdrawalFees: {
      BTC: 0.0005,
      ETH: 0.005,
      USDT: 1,
      USDC: 1
    },
    minOrderSize: {
      BTC: 0.00001,
      ETH: 0.001,
      USDT: 1,
      USDC: 1
    },
    supportedPairs: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'ADA/USDT'],
    apiRateLimit: {
      requests: 100,
      window: 60
    },
    status: 'active'
  },

  gateio: {
    id: 'gateio',
    name: 'Gate.io',
    tradingFees: {
      maker: 0.0015, // 0.15%
      taker: 0.0015  // 0.15%
    },
    withdrawalFees: {
      BTC: 0.0005,
      ETH: 0.01,
      USDT: 1,
      USDC: 1
    },
    minOrderSize: {
      BTC: 0.0001,
      ETH: 0.001,
      USDT: 1,
      USDC: 1
    },
    supportedPairs: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'ADA/USDT'],
    apiRateLimit: {
      requests: 300,
      window: 60
    },
    status: 'active'
  }
}

export function getVenueById(id: string): ExchangeVenue | undefined {
  return EXCHANGE_VENUES[id.toLowerCase()]
}

export function getActiveVenues(): ExchangeVenue[] {
  return Object.values(EXCHANGE_VENUES).filter(venue => venue.status === 'active')
}

export function calculateTradingFee(venueId: string, amount: number, isMaker: boolean = false): number {
  const venue = getVenueById(venueId)
  if (!venue) return 0
  
  const feeRate = isMaker ? venue.tradingFees.maker : venue.tradingFees.taker
  return amount * feeRate
}

export function getBestVenueForPair(pair: string, amount: number, isMaker: boolean = false): ExchangeVenue | null {
  const activeVenues = getActiveVenues()
  const supportedVenues = activeVenues.filter(venue => 
    venue.supportedPairs.includes(pair)
  )
  
  if (supportedVenues.length === 0) return null
  
  // Find venue with lowest fees
  return supportedVenues.reduce((best, current) => {
    const bestFee = calculateTradingFee(best.id, amount, isMaker)
    const currentFee = calculateTradingFee(current.id, amount, isMaker)
    return currentFee < bestFee ? current : best
  })
}

export function getVenueComparison(pair: string, amount: number): Array<{
  venue: ExchangeVenue
  makerFee: number
  takerFee: number
  totalCost: number
}> {
  const activeVenues = getActiveVenues()
  const supportedVenues = activeVenues.filter(venue => 
    venue.supportedPairs.includes(pair)
  )
  
  return supportedVenues.map(venue => ({
    venue,
    makerFee: calculateTradingFee(venue.id, amount, true),
    takerFee: calculateTradingFee(venue.id, amount, false),
    totalCost: amount + calculateTradingFee(venue.id, amount, false)
  })).sort((a, b) => a.totalCost - b.totalCost)
}

// NEW: Calculate effective price including fees
export function calculateEffectivePrice(
  midPrice: number, 
  venueId: string, 
  isMaker: boolean = false
): number {
  const venue = getVenueById(venueId)
  if (!venue) return midPrice
  
  const feeRate = isMaker ? venue.tradingFees.maker : venue.tradingFees.taker
  return midPrice * (1 + feeRate)
}

// NEW: Get best venue for a given price and pair
export function getBestVenueForPrice(
  pair: string, 
  bidPrice: number, 
  askPrice: number
): { venue: ExchangeVenue; effectiveBid: number; effectiveAsk: number; spread: number } | null {
  const activeVenues = getActiveVenues()
  const supportedVenues = activeVenues.filter(venue => 
    venue.supportedPairs.includes(pair)
  )
  
  if (supportedVenues.length === 0) return null
  
  const midPrice = (bidPrice + askPrice) / 2
  
  // Calculate effective prices for each venue
  const venuePrices = supportedVenues.map(venue => {
    const effectiveBid = calculateEffectivePrice(bidPrice, venue.id, false) // taker fee for buying
    const effectiveAsk = calculateEffectivePrice(askPrice, venue.id, false) // taker fee for selling
    const spread = effectiveAsk - effectiveBid
    
    return {
      venue,
      effectiveBid,
      effectiveAsk,
      spread,
      midPrice: (effectiveBid + effectiveAsk) / 2
    }
  })
  
  // Find venue with lowest effective mid price (best for buyers)
  const bestVenue = venuePrices.reduce((best, current) => 
    current.midPrice < best.midPrice ? current : best
  )
  
  return {
    venue: bestVenue.venue,
    effectiveBid: bestVenue.effectiveBid,
    effectiveAsk: bestVenue.effectiveAsk,
    spread: bestVenue.spread
  }
}

// NEW: Compare venues for a specific pair with current market data
export function compareVenuesForPair(
  pair: string,
  venueData: Array<{
    venueId: string
    bid: number
    ask: number
    lastUpdate: number
  }>
): Array<{
  venue: ExchangeVenue
  bid: number
  ask: number
  midPrice: number
  effectiveBid: number
  effectiveAsk: number
  effectiveMidPrice: number
  spread: number
  effectiveSpread: number
  isBest: boolean
}> {
  const activeVenues = getActiveVenues()
  
  const comparisons = venueData
    .map(data => {
      const venue = activeVenues.find(v => v.id === data.venueId)
      if (!venue) return null
      
      const midPrice = (data.bid + data.ask) / 2
      const effectiveBid = calculateEffectivePrice(data.bid, venue.id, false)
      const effectiveAsk = calculateEffectivePrice(data.ask, venue.id, false)
      const effectiveMidPrice = (effectiveBid + effectiveAsk) / 2
      const spread = data.ask - data.bid
      const effectiveSpread = effectiveAsk - effectiveBid
      
      return {
        venue,
        bid: data.bid,
        ask: data.ask,
        midPrice,
        effectiveBid,
        effectiveAsk,
        effectiveMidPrice,
        spread,
        effectiveSpread,
        isBest: false // Will be set below
      }
    })
    .filter(Boolean) as Array<{
      venue: ExchangeVenue
      bid: number
      ask: number
      midPrice: number
      effectiveBid: number
      effectiveAsk: number
      effectiveMidPrice: number
      spread: number
      effectiveSpread: number
      isBest: boolean
    }>
  
  // Mark the best venue (lowest effective mid price)
  if (comparisons.length > 0) {
    const bestIndex = comparisons.reduce((bestIndex, current, index) => 
      current.effectiveMidPrice < comparisons[bestIndex].effectiveMidPrice ? index : bestIndex
    , 0)
    comparisons[bestIndex].isBest = true
  }
  
  return comparisons.sort((a, b) => a.effectiveMidPrice - b.effectiveMidPrice)
}
