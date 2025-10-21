export type VenueId = 'kraken' | 'okx' | 'gateio'

export const VENUE_METADATA: Record<VenueId, { label: string }> = {
  kraken: { label: 'Kraken' },
  okx: { label: 'OKX' },
  gateio: { label: 'Gate.io' }
}

export const VENUE_IDS = Object.entries(VENUE_METADATA).map(([id, meta]) => ({
  id: id as VenueId,
  label: meta.label
}))

export type SupportedSymbol = 'BTC/USDT' | 'ETH/USDT' | 'SOL/USDT' | 'ADA/USDT'

export const SYMBOL_CONFIG: Record<SupportedSymbol, Partial<Record<VenueId, string>>> = {
  'BTC/USDT': {
    kraken: 'XBTUSDT',
    okx: 'BTC-USDT',
    gateio: 'BTC_USDT'
  },
  'ETH/USDT': {
    kraken: 'ETHUSDT',
    okx: 'ETH-USDT',
    gateio: 'ETH_USDT'
  },
  'SOL/USDT': {
    kraken: 'SOLUSDT',
    okx: 'SOL-USDT',
    gateio: 'SOL_USDT'
  },
  'ADA/USDT': {
    kraken: 'ADAUSDT',
    okx: 'ADA-USDT',
    gateio: 'ADA_USDT'
  }
}

export const SUPPORTED_SYMBOLS: SupportedSymbol[] = Object.keys(SYMBOL_CONFIG) as SupportedSymbol[]
