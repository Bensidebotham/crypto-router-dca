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
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Portfolio Performance</h3>
        <div className="text-sm text-gray-600">
          {equityData.length > 0 && (
            <>
              Total Value: {formatCurrency(equityData[equityData.length - 1].value)} | 
              Total Investment: {formatCurrency(equityData[equityData.length - 1].investment)}
            </>
          )}
        </div>
      </div>
      
      <div className="relative h-80 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Background grid lines */}
          {[0, 20, 40, 60, 80, 100].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="100"
              y2={y}
              stroke="#e5e7eb"
              strokeWidth="0.5"
              opacity="0.6"
            />
          ))}
          
          {/* Vertical grid lines for time periods */}
          {[0, 25, 50, 75, 100].map((x) => (
            <line
              key={x}
              x1={x}
              y1="0"
              x2={x}
              y2="100"
              stroke="#e5e7eb"
              strokeWidth="0.5"
              opacity="0.4"
            />
          ))}
          
          {/* Equity curve with gradient fill */}
          <defs>
            <linearGradient id="equityGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8"/>
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1"/>
            </linearGradient>
          </defs>
          
          {/* Filled area under equity curve */}
          <path
            d={equityData.map((point, index) => {
              const x = (index / (equityData.length - 1)) * 100
              const y = 100 - ((point.value - minValue) / range) * 100
              return `${index === 0 ? 'M' : 'L'}${x},${y}`
            }).join(' ') + ' L100,100 L0,100 Z'}
            fill="url(#equityGradient)"
            opacity="0.3"
          />
          
          {/* Equity curve with consistent thickness */}
          <path
            d={equityData.map((point, index) => {
              const x = (index / (equityData.length - 1)) * 100
              const y = 100 - ((point.value - minValue) / range) * 100
              return `${index === 0 ? 'M' : 'L'}${x},${y}`
            }).join(' ')}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="0.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          
          {/* Investment line with consistent thickness */}
          <path
            d={equityData.map((point, index) => {
              const x = (index / (equityData.length - 1)) * 100
              const y = 100 - ((point.investment - minValue) / range) * 100
              return `${index === 0 ? 'M' : 'L'}${x},${y}`
            }).join(' ')}
            fill="none"
            stroke="#10b981"
            strokeWidth="0.5"
            strokeDasharray="2,2"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        
        {/* Y-axis labels with better formatting */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-600 font-medium">
          <span className="bg-white px-2 py-1 rounded shadow-sm">{formatCurrency(maxValue)}</span>
          <span className="bg-white px-2 py-1 rounded shadow-sm">{formatCurrency(minValue + range * 0.75)}</span>
          <span className="bg-white px-2 py-1 rounded shadow-sm">{formatCurrency(minValue + range * 0.5)}</span>
          <span className="bg-white px-2 py-1 rounded shadow-sm">{formatCurrency(minValue + range * 0.25)}</span>
          <span className="bg-white px-2 py-1 rounded shadow-sm">{formatCurrency(minValue)}</span>
        </div>
        
        {/* X-axis labels with better formatting */}
        <div className="absolute bottom-0 left-0 w-full flex justify-between text-xs text-gray-600 font-medium">
          {equityData.filter((_, i) => i % 13 === 0).map((point, index) => (
            <span key={index} className="bg-white px-2 py-1 rounded shadow-sm">
              {formatDate(point.date)}
            </span>
          ))}
        </div>
      </div>
      
      {/* Enhanced Legend */}
      <div className="flex items-center justify-center gap-8 text-sm">
        <div className="flex items-center gap-3">
          <div className="w-6 h-0.5 bg-blue-500 rounded-full"></div>
          <span className="text-gray-700 font-medium">Portfolio Value</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-6 h-0.5 bg-green-500 border-dashed border border-green-500 rounded-full"></div>
          <span className="text-gray-700 font-medium">Total Investment</span>
        </div>
      </div>
      
      {/* Enhanced Summary Stats */}
      {equityData.length > 0 && (
        <div className="grid grid-cols-3 gap-6 pt-6 border-t border-gray-200">
          <div className="text-center bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
            <div className="text-3xl font-bold text-blue-700 mb-1">
              {formatCurrency(equityData[equityData.length - 1].value)}
            </div>
            <div className="text-sm text-blue-600 font-medium">Current Value</div>
          </div>
          <div className="text-center bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
            <div className="text-3xl font-bold text-green-700 mb-1">
              {formatCurrency(equityData[equityData.length - 1].investment)}
            </div>
            <div className="text-sm text-green-600 font-medium">Total Invested</div>
          </div>
          <div className="text-center bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
            <div className={`text-3xl font-bold mb-1 ${equityData[equityData.length - 1].return >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {formatCurrency(equityData[equityData.length - 1].return)}
            </div>
            <div className={`text-sm font-medium ${equityData[equityData.length - 1].return >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              Total Return
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
