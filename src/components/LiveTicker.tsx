'use client'

import { useEffect, useRef, useState } from 'react'

interface PriceData {
  symbol: string
  price: string
  timestamp: number
  exchange: string
  previousPrice?: string
  priceChange?: number
  priceChangePercent?: number
}

const SYMBOLS = ['btcusdt', 'ethusdt', 'solusdt', 'adausdt'] // add more (lowercase) if you want
const CONNECTION_TIMEOUT = 10000 // 10 seconds

export function LiveTicker() {
  const [prices, setPrices] = useState<PriceData[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting')
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttempts = useRef(0)
  const shuttingDown = useRef(false)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const scheduleReconnect = () => {
      if (shuttingDown.current) return
      
      setIsConnected(false)
      setConnectionStatus('disconnected')
      
      const attempt = Math.min(reconnectAttempts.current + 1, 5)
      reconnectAttempts.current = attempt
      const delay = Math.min(500 * Math.pow(2, attempt), 30000) // Cap at 30 seconds
      
      console.log(`Reconnecting in ${delay}ms (attempt ${attempt})`)
      
      reconnectTimeoutRef.current = setTimeout(() => {
        if (!shuttingDown.current) {
          connect()
        }
      }, delay)
    }

    function connect() {
      if (shuttingDown.current) return
      
      setConnectionStatus('connecting')
      const streams = SYMBOLS.map((s) => `${s}@trade`).join('/')
      const url = `wss://stream.binance.com:9443/stream?streams=${streams}`
      
      try {
        const ws = new WebSocket(url)
        wsRef.current = ws

        // Set connection timeout
        connectionTimeoutRef.current = setTimeout(() => {
          if (ws.readyState === WebSocket.CONNECTING) {
            console.log('Connection timeout, closing and retrying...')
            ws.close()
            scheduleReconnect()
          }
        }, CONNECTION_TIMEOUT)

        ws.onopen = () => {
          // Clear connection timeout
          if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current)
            connectionTimeoutRef.current = null
          }
          
          setIsConnected(true)
          setConnectionStatus('connected')
          reconnectAttempts.current = 0
          console.log('Connected to Binance WebSocket')
        }

        ws.onmessage = (event) => {
          try {
            // Combined stream payload shape: { stream: 'btcusdt@trade', data: { s: 'BTCUSDT', p: '...', E: 1710000000000 } }
            const msg = JSON.parse(event.data)
            const d = msg?.data
            if (!d || !d.s || !d.p) return
            
            const currentPrice = Number(d.p).toFixed(2)
            const timestamp = d.E || Date.now()
            
            setPrices((prev) => {
              const existingPrice = prev.find((p) => p.symbol === d.s)
              const previousPrice = existingPrice?.price
              const priceChange = previousPrice ? Number(currentPrice) - Number(previousPrice) : 0
              const priceChangePercent = previousPrice ? (priceChange / Number(previousPrice)) * 100 : 0
              
              const price: PriceData = {
                symbol: d.s,
                price: currentPrice,
                timestamp,
                exchange: 'BINANCE',
                previousPrice,
                priceChange,
                priceChangePercent
              }
              
              const filtered = prev.filter((p) => p.symbol !== price.symbol)
              return [...filtered, price].sort((a, b) => a.symbol.localeCompare(b.symbol))
            })
          } catch (err) {
            console.error('WS parse error:', err)
          }
        }

        ws.onerror = (event) => {
          // WebSocket error events don't contain detailed error information
          console.log('WebSocket error occurred, attempting reconnection...')
          setConnectionStatus('error')
          // Don't call scheduleReconnect here, let onclose handle it
        }

        ws.onclose = (event) => {
          // Clear connection timeout
          if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current)
            connectionTimeoutRef.current = null
          }
          
          console.log(`WebSocket closed: code=${event.code}, reason=${event.reason || 'No reason'}`)
          
          // Only reconnect if it wasn't a clean close and we're not shutting down
          if (!event.wasClean && !shuttingDown.current) {
            scheduleReconnect()
          } else if (event.wasClean) {
            setConnectionStatus('disconnected')
            setIsConnected(false)
          }
        }
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error)
        setConnectionStatus('error')
        scheduleReconnect()
      }
    }

    connect()

    return () => {
      shuttingDown.current = true
      
      // Clear all timeouts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current)
      }
      
      try {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.close(1000, 'Component unmounting')
        }
      } catch {}
    }
  }, [])

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500'
      case 'connecting': return 'bg-yellow-500'
      case 'error': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Live (Binance)'
      case 'connecting': return 'Connecting...'
      case 'error': return 'Connection Error'
      default: return 'Disconnected'
    }
  }

  const formatPriceChange = (change: number, percent: number) => {
    const isPositive = change >= 0
    const sign = isPositive ? '+' : ''
    return (
      <div className={`text-right ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        <div className="font-mono text-sm">
          {sign}${change.toFixed(2)}
        </div>
        <div className="text-xs">
          {sign}{percent.toFixed(2)}%
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${getConnectionStatusColor()} animate-pulse`} />
        <span className="text-sm font-medium text-gray-800">{getConnectionStatusText()}</span>
        {connectionStatus === 'connected' && (
          <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full font-medium">
            {prices.length} symbols
          </span>
        )}
      </div>

      <div className="space-y-2">
        {prices.length > 0 ? (
          prices.map((price) => (
            <div key={price.symbol} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div>
                <span className="font-semibold text-gray-900">{price.symbol}</span>
                <span className="text-sm text-gray-600 ml-2">({price.exchange})</span>
              </div>
              <div className="flex items-center gap-4">
                {price.priceChange !== undefined && price.priceChangePercent !== undefined ? (
                  formatPriceChange(price.priceChange, price.priceChangePercent)
                ) : null}
                <div className="text-right">
                  <div className="font-mono text-lg text-gray-900">${price.price}</div>
                  <div className="text-xs text-gray-600">{new Date(price.timestamp).toLocaleTimeString()}</div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-700 py-8 font-medium">
            {connectionStatus === 'connecting' ? 'Connecting to Binance...' : 'Waiting for price data...'}
          </div>
        )}
      </div>
    </div>
  )
}
