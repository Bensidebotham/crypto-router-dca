const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3'

export interface CoinGeckoPrice {
  [coinId: string]: {
    [currency: string]: number
  }
}

export interface CoinGeckoMarketData {
  id: string
  symbol: string
  name: string
  current_price: number
  market_cap: number
  market_cap_rank: number
  total_volume: number
  high_24h: number
  low_24h: number
  price_change_24h: number
  price_change_percentage_24h: number
  market_cap_change_24h: number
  market_cap_change_percentage_24h: number
  circulating_supply: number
  total_supply: number
  max_supply: number
  ath: number
  ath_change_percentage: number
  ath_date: string
  atl: number
  atl_change_percentage: number
  atl_date: string
  last_updated: string
}

export interface CoinGeckoError {
  error: string
  status: number
}

class CoinGeckoAPI {
  private baseUrl: string
  private rateLimitDelay: number = 1000 // 1 second between requests
  private lastRequestTime: number = 0

  constructor(baseUrl: string = COINGECKO_API_BASE) {
    this.baseUrl = baseUrl
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await new Promise(resolve => 
        setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest)
      )
    }
    
    this.lastRequestTime = Date.now()
  }

  private async makeRequest<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    await this.rateLimit()
    
    const url = new URL(endpoint, this.baseUrl)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value)
      })
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Crypto-Router-DCA/1.0'
      }
    })

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  async getSimplePrice(
    ids: string | string[],
    vs_currencies: string | string[],
    include_market_cap: boolean = false,
    include_24hr_vol: boolean = false,
    include_24hr_change: boolean = false,
    include_last_updated_at: boolean = false
  ): Promise<CoinGeckoPrice> {
    const params: Record<string, string> = {
      ids: Array.isArray(ids) ? ids.join(',') : ids,
      vs_currencies: Array.isArray(vs_currencies) ? vs_currencies.join(',') : vs_currencies
    }

    if (include_market_cap) params.include_market_cap = 'true'
    if (include_24hr_vol) params.include_24hr_vol = 'true'
    if (include_24hr_change) params.include_24hr_change = 'true'
    if (include_last_updated_at) params.include_last_updated_at = 'true'

    return this.makeRequest<CoinGeckoPrice>('/simple/price', params)
  }

  async getCoinsMarkets(
    vs_currency: string = 'usd',
    ids?: string | string[],
    order: string = 'market_cap_desc',
    per_page: number = 100,
    page: number = 1,
    sparkline: boolean = false,
    price_change_percentage?: string | string[]
  ): Promise<CoinGeckoMarketData[]> {
    const params: Record<string, string> = {
      vs_currency,
      order,
      per_page: per_page.toString(),
      page: page.toString(),
      sparkline: sparkline.toString()
    }

    if (ids) {
      params.ids = Array.isArray(ids) ? ids.join(',') : ids
    }
    if (price_change_percentage) {
      params.price_change_percentage = Array.isArray(price_change_percentage) 
        ? price_change_percentage.join(',') 
        : price_change_percentage
    }

    return this.makeRequest<CoinGeckoMarketData[]>('/coins/markets', params)
  }

  async getCoinHistory(
    id: string,
    date: string, // DD-MM-YYYY format
    localization: boolean = true
  ): Promise<any> {
    const params: Record<string, string> = {
      date,
      localization: localization.toString()
    }

    return this.makeRequest(`/coins/${id}/history`, params)
  }

  async getCoinMarketChart(
    id: string,
    vs_currency: string = 'usd',
    days: number | string = 1
  ): Promise<any> {
    const params: Record<string, string> = {
      vs_currency,
      days: days.toString()
    }

    return this.makeRequest(`/coins/${id}/market_chart`, params)
  }

  async getExchangeRates(): Promise<any> {
    return this.makeRequest('/exchange_rates')
  }

  async getGlobalData(): Promise<any> {
    return this.makeRequest('/global')
  }

  async search(query: string): Promise<any> {
    const params: Record<string, string> = { query }
    return this.makeRequest('/search', params)
  }

  // Utility methods
  async getBitcoinPrice(vs_currency: string = 'usd'): Promise<number> {
    const prices = await this.getSimplePrice('bitcoin', vs_currency)
    return prices.bitcoin[vs_currency]
  }

  async getEthereumPrice(vs_currency: string = 'usd'): Promise<number> {
    const prices = await this.getSimplePrice('ethereum', vs_currency)
    return prices.ethereum[vs_currency]
  }

  async getTopCoins(limit: number = 10, vs_currency: string = 'usd'): Promise<CoinGeckoMarketData[]> {
    return this.getCoinsMarkets(vs_currency, undefined, 'market_cap_desc', limit, 1)
  }

  async getPriceChange24h(ids: string | string[], vs_currency: string = 'usd'): Promise<Record<string, number>> {
    const prices = await this.getSimplePrice(ids, vs_currency, false, false, true)
    
    const result: Record<string, number> = {}
    Object.entries(prices).forEach(([coinId, data]) => {
      result[coinId] = data[`${vs_currency}_24h_change`] || 0
    })
    
    return result
  }
}

// Export singleton instance
export const coinGeckoAPI = new CoinGeckoAPI()

// Export individual functions for convenience
export const {
  getSimplePrice,
  getCoinsMarkets,
  getCoinHistory,
  getCoinMarketChart,
  getExchangeRates,
  getGlobalData,
  search,
  getBitcoinPrice,
  getEthereumPrice,
  getTopCoins,
  getPriceChange24h
} = coinGeckoAPI
