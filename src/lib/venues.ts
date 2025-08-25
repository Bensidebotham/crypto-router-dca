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
    status: 'active'
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
    supportedPairs: ['BTC/USDT', 'ETH/USDT', 'BTC/USDC', 'ETH/USDC'],
    apiRateLimit: {
      requests: 1800,
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
