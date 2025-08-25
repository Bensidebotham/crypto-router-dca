'use client'

import { useState, useEffect } from 'react'

interface EquityPoint {
  date: string
  value: number
  investment: number
  return: number
}

export function EquityChart() {
  const [equityData, setEquityData] = useState<EquityPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate generating equity curve data
    const generateEquityData = () => {
      setLoading(true)
      
      const data: EquityPoint[] = []
      let currentValue = 10000 // Starting value
      let totalInvestment = 0
      
      // Generate 52 weeks of data (1 year)
      for (let i = 0; i < 52; i++) {
        const date = new Date(2024, 0, 1 + i * 7)
        const weeklyInvestment = 100 // Weekly DCA amount
        
        // Simulate price volatility
        const volatility = 0.02 // 2% weekly volatility
        const randomChange = (Math.random() - 0.5) * 2 * volatility
        currentValue = currentValue * (1 + randomChange)
        
        totalInvestment += weeklyInvestment
        const returnValue = currentValue - totalInvestment
        
        data.push({
          date: date.toISOString().split('T')[0],
          value: currentValue,
          investment: totalInvestment,
          return: returnValue
        })
      }
      
      setEquityData(data)
      setLoading(false)
    }
    
    generateEquityData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const maxValue = Math.max(...equityData.map(d => d.value))
  const minValue = Math.min(...equityData.map(d => d.value))
  const range = maxValue - minValue

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Portfolio Performance</h3>
        <div className="text-sm text-gray-500">
          {equityData.length > 0 && (
            <>
              Total Value: {formatCurrency(equityData[equityData[equityData.length - 1].value])} | 
              Total Investment: {formatCurrency(equityData[equityData.length - 1].investment)}
            </>
          )}
        </div>
      </div>
      
      <div className="relative h-64 bg-gray-50 rounded-lg p-4">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="100"
              y2={y}
              stroke="#e5e7eb"
              strokeWidth="0.5"
            />
          ))}
          
          {/* Equity curve */}
          <polyline
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            points={equityData.map((point, index) => {
              const x = (index / (equityData.length - 1)) * 100
              const y = 100 - ((point.value - minValue) / range) * 100
              return `${x},${y}`
            }).join(' ')}
          />
          
          {/* Investment line */}
          <polyline
            fill="none"
            stroke="#10b981"
            strokeWidth="1"
            strokeDasharray="2,2"
            points={equityData.map((point, index) => {
              const x = (index / (equityData.length - 1)) * 100
              const y = 100 - ((point.investment - minValue) / range) * 100
              return `${x},${y}`
            }).join(' ')}
          />
        </svg>
        
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500">
          <span>{formatCurrency(maxValue)}</span>
          <span>{formatCurrency(minValue + range * 0.75)}</span>
          <span>{formatCurrency(minValue + range * 0.5)}</span>
          <span>{formatCurrency(minValue + range * 0.25)}</span>
          <span>{formatCurrency(minValue)}</span>
        </div>
        
        {/* X-axis labels */}
        <div className="absolute bottom-0 left-0 w-full flex justify-between text-xs text-gray-500">
          {equityData.filter((_, i) => i % 13 === 0).map((point, index) => (
            <span key={index}>{formatDate(point.date)}</span>
          ))}
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-blue-500"></div>
          <span>Portfolio Value</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-green-500 border-dashed border border-green-500"></div>
          <span>Total Investment</span>
        </div>
      </div>
      
      {/* Summary stats */}
      {equityData.length > 0 && (
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(equityData[equityData.length - 1].value)}
            </div>
            <div className="text-sm text-gray-500">Current Value</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(equityData[equityData.length - 1].investment)}
            </div>
            <div className="text-sm text-gray-500">Total Invested</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${equityData[equityData.length - 1].return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(equityData[equityData.length - 1].return)}
            </div>
            <div className="text-sm text-gray-500">Total Return</div>
          </div>
        </div>
      )}
    </div>
  )
}
