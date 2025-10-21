import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol')
  
  if (!symbol) {
    return NextResponse.json({ error: 'Symbol parameter is required' }, { status: 400 })
  }

  try {
    // Try Binance API first
    const binanceUrl = `https://api.binance.com/api/v3/ticker/bookTicker?symbol=${symbol}`
    const response = await fetch(binanceUrl, {
      headers: {
        'User-Agent': 'Crypto-Router-DCA/1.0'
      }
    })

    if (response.ok) {
      const data = await response.json()
      return NextResponse.json({
        success: true,
        source: 'binance',
        data: {
          bid: data.bidPrice,
          ask: data.askPrice
        }
      })
    }

    // If Binance fails, try alternative endpoints
    if (response.status === 451) {
      // Geographic restriction - try alternative data sources
      console.log(`Binance blocked for ${symbol}, trying alternatives...`)
      
      // Try CoinGecko as fallback
      try {
        const coinGeckoUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${getCoinGeckoId(symbol)}&vs_currencies=usd&include_24hr_change=true`
        const cgResponse = await fetch(coinGeckoUrl)
        
        if (cgResponse.ok) {
          const cgData = await cgResponse.json()
          const price = cgData[getCoinGeckoId(symbol)]?.usd
          
          if (price) {
            // Estimate spread as 0.1% (typical for major exchanges)
            const spread = price * 0.001
            const bid = price - spread / 2
            const ask = price + spread / 2
            
            return NextResponse.json({
              success: true,
              source: 'coingecko_fallback',
              data: { bid, ask }
            })
          }
        }
      } catch (cgError) {
        console.warn('CoinGecko fallback also failed:', cgError)
      }
      
      // If CoinGecko also fails, return a graceful fallback with 200 status
      // This prevents client-side fetch errors and allows price cache to work
      return NextResponse.json({
        success: false,
        error: 'Geographic restriction - Binance blocked in your region',
        status: 451,
        fallback: 'coingecko_failed',
        data: null
      }, { status: 200 }) // Always return 200 to prevent fetch errors
    }

    // Other HTTP errors
    return NextResponse.json({
      success: false,
      error: `Binance API error: ${response.status}`,
      status: response.status
    }, { status: response.status })

  } catch (error) {
    console.error('Binance proxy error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      status: 500
    }, { status: 500 })
  }
}

function getCoinGeckoId(symbol: string): string {
  const symbolMap: Record<string, string> = {
    'BTCUSDT': 'bitcoin',
    'ETHUSDT': 'ethereum',
    'SOLUSDT': 'solana',
    'ADAUSDT': 'cardano'
  }
  return symbolMap[symbol] || 'bitcoin'
}
