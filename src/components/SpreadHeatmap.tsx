'use client'

import { useState, useEffect } from 'react'

interface SpreadData {
  exchange: string
  symbol: string
  bid: number
  ask: number
  spread: number
  spreadPercent: number
}

export function SpreadHeatmap() {
  const [spreads, setSpreads] = useState<SpreadData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate fetching spread data
    const fetchSpreads = async () => {
      setLoading(true)
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const mockData: SpreadData[] = [
        { exchange: 'Binance', symbol: 'BTC/USDT', bid: 50000, ask: 50010, spread: 10, spreadPercent: 0.02 },
        { exchange: 'Coinbase', symbol: 'BTC/USDT', bid: 50005, ask: 50015, spread: 10, spreadPercent: 0.02 },
        { exchange: 'Kraken', symbol: 'BTC/USDT', bid: 50002, ask: 50012, spread: 10, spreadPercent: 0.02 },
        { exchange: 'Binance', symbol: 'ETH/USDT', bid: 3000, ask: 3002, spread: 2, spreadPercent: 0.067 },
        { exchange: 'Coinbase', symbol: 'ETH/USDT', bid: 3001, ask: 3003, spread: 2, spreadPercent: 0.067 },
        { exchange: 'Kraken', symbol: 'ETH/USDT', bid: 3000.5, ask: 3002.5, spread: 2, spreadPercent: 0.067 },
      ]
      
      setSpreads(mockData)
      setLoading(false)
    }
    
    fetchSpreads()
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchSpreads, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const getSpreadColor = (spreadPercent: number) => {
    if (spreadPercent < 0.05) return 'bg-green-100 text-green-800'
    if (spreadPercent < 0.1) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Exchange Spreads</h3>
        <div className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Exchange
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Symbol
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Bid
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ask
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Spread
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Spread %
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {spreads.map((spread, index) => (
              <tr key={`${spread.exchange}-${spread.symbol}-${index}`} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {spread.exchange}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {spread.symbol}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-mono">
                  ${spread.bid.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-mono">
                  ${spread.ask.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-mono">
                  ${spread.spread.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSpreadColor(spread.spreadPercent)}`}>
                    {spread.spreadPercent.toFixed(3)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
