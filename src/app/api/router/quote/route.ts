import { NextRequest, NextResponse } from 'next/server'
import { SUPPORTED_SYMBOLS } from '@/lib/router-service'
import { getSymbolSnapshots, simulateRoute } from '@/lib/router-service'
import type { SupportedSymbol } from '@/config/markets'

function parseSymbols(param: string | null): SupportedSymbol[] {
  if (!param) return SUPPORTED_SYMBOLS
  const requested = param
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter((s): s is SupportedSymbol => SUPPORTED_SYMBOLS.includes(s as SupportedSymbol))
  return requested.length > 0 ? requested : SUPPORTED_SYMBOLS
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbols = parseSymbols(searchParams.get('symbols'))

  const snapshots = await getSymbolSnapshots(symbols)

  return NextResponse.json({
    success: true,
    timestamp: Date.now(),
    symbols: snapshots
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const symbol = (body.symbol as string | undefined)?.toUpperCase() as SupportedSymbol | undefined
    const side = body.side as 'buy' | 'sell'
    const size = Number(body.size)
    const reference = body.referenceVenue as string | undefined

    if (!symbol || !SUPPORTED_SYMBOLS.includes(symbol)) {
      return NextResponse.json({ success: false, error: 'Unsupported symbol' }, { status: 400 })
    }

    if (!['buy', 'sell'].includes(side)) {
      return NextResponse.json({ success: false, error: 'Side must be "buy" or "sell"' }, { status: 400 })
    }

    if (!Number.isFinite(size) || size <= 0) {
      return NextResponse.json({ success: false, error: 'Size must be a positive number' }, { status: 400 })
    }

    const result = await simulateRoute({
      symbol,
      side,
      size,
      referenceVenue: reference
    })

    return NextResponse.json({
      success: true,
      result
    })
  } catch (error) {
    console.error('Router simulation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to simulate route'
    }, { status: 500 })
  }
}
