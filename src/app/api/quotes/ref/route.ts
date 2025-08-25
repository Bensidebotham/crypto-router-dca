import { NextRequest, NextResponse } from 'next/server'

const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const ids = searchParams.get('ids') || 'bitcoin,ethereum'
  const vs_currencies = searchParams.get('vs_currencies') || 'usd'
  
  try {
    const response = await fetch(
      `${COINGECKO_API_BASE}/simple/price?ids=${ids}&vs_currencies=${vs_currencies}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Crypto-Router-DCA/1.0'
        }
      }
    )
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    return NextResponse.json({
      success: true,
      data,
      timestamp: Date.now(),
      source: 'coingecko'
    })
  } catch (error) {
    console.error('CoinGecko API error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch price data',
      timestamp: Date.now()
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ids, vs_currencies, include_market_cap, include_24hr_vol, include_24hr_change } = body
    
    const params = new URLSearchParams()
    if (ids) params.append('ids', ids)
    if (vs_currencies) params.append('vs_currencies', vs_currencies)
    if (include_market_cap) params.append('include_market_cap', include_market_cap.toString())
    if (include_24hr_vol) params.append('include_24hr_vol', include_24hr_vol.toString())
    if (include_24hr_change) params.append('include_24hr_change', include_24hr_change.toString())
    
    const response = await fetch(
      `${COINGECKO_API_BASE}/simple/price?${params.toString()}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Crypto-Router-DCA/1.0'
        }
      }
    )
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    return NextResponse.json({
      success: true,
      data,
      timestamp: Date.now(),
      source: 'coingecko'
    })
  } catch (error) {
    console.error('CoinGecko API error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch price data',
      timestamp: Date.now()
    }, { status: 500 })
  }
}
