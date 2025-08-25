export interface SSEOptions {
  url: string
  headers?: Record<string, string>
  timeout?: number
  retryAttempts?: number
  retryDelay?: number
  onOpen?: (event: Event) => void
  onMessage?: (event: MessageEvent) => void
  onError?: (event: Event) => void
  onClose?: (event: Event) => void
}

export interface SSEMessage {
  data: string
  event?: string
  id?: string
  retry?: number
}

export class SSEConnection {
  private eventSource: EventSource | null = null
  private options: SSEOptions
  private retryCount: number = 0
  private isConnecting: boolean = false
  private reconnectTimer: NodeJS.Timeout | null = null

  constructor(options: SSEOptions) {
    this.options = {
      timeout: 30000,
      retryAttempts: 5,
      retryDelay: 1000,
      ...options
    }
  }

  connect(): void {
    if (this.isConnecting || this.eventSource) {
      return
    }

    this.isConnecting = true
    this.createConnection()
  }

  private createConnection(): void {
    try {
      this.eventSource = new EventSource(this.options.url, {
        withCredentials: false
      })

      this.setupEventHandlers()
      this.setupTimeout()
    } catch (error) {
      console.error('Failed to create SSE connection:', error)
      this.handleConnectionError()
    }
  }

  private setupEventHandlers(): void {
    if (!this.eventSource) return

    this.eventSource.onopen = (event) => {
      this.isConnecting = false
      this.retryCount = 0
      this.options.onOpen?.(event)
    }

    this.eventSource.onmessage = (event) => {
      this.options.onMessage?.(event)
    }

    this.eventSource.onerror = (event) => {
      this.options.onError?.(event)
      this.handleConnectionError()
    }
  }

  private setupTimeout(): void {
    if (this.options.timeout && this.options.timeout > 0) {
      setTimeout(() => {
        if (this.eventSource && this.eventSource.readyState === EventSource.CONNECTING) {
          this.eventSource.close()
          this.handleConnectionError()
        }
      }, this.options.timeout)
    }
  }

  private handleConnectionError(): void {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }

    if (this.retryCount < this.options.retryAttempts!) {
      this.retryCount++
      this.scheduleReconnect()
    } else {
      this.options.onClose?.(new Event('max_retries_exceeded'))
    }
  }

  private scheduleReconnect(): void {
    const delay = this.options.retryDelay! * Math.pow(2, this.retryCount - 1)
    
    this.reconnectTimer = setTimeout(() => {
      this.isConnecting = false
      this.connect()
    }, delay)
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }

    this.isConnecting = false
    this.retryCount = 0
  }

  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN
  }

  getReadyState(): number {
    return this.eventSource?.readyState || EventSource.CLOSED
  }
}

// Utility functions for parsing SSE messages
export function parseSSEMessage(rawMessage: string): SSEMessage {
  const lines = rawMessage.split('\n')
  const message: SSEMessage = { data: '' }

  lines.forEach(line => {
    if (line.startsWith('data:')) {
      message.data = line.slice(5).trim()
    } else if (line.startsWith('event:')) {
      message.event = line.slice(6).trim()
    } else if (line.startsWith('id:')) {
      message.id = line.slice(3).trim()
    } else if (line.startsWith('retry:')) {
      const retry = parseInt(line.slice(6).trim())
      if (!isNaN(retry)) {
        message.retry = retry
      }
    }
  })

  return message
}

export function createSSEConnection(options: SSEOptions): SSEConnection {
  return new SSEConnection(options)
}

// Hook for React components
export function useSSE(options: SSEOptions) {
  const [connection, setConnection] = useState<SSEConnection | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const sseConnection = new SSEConnection({
      ...options,
      onOpen: (event) => {
        setIsConnected(true)
        options.onOpen?.(event)
      },
      onClose: (event) => {
        setIsConnected(false)
        options.onClose?.(event)
      }
    })

    setConnection(sseConnection)
    sseConnection.connect()

    return () => {
      sseConnection.disconnect()
    }
  }, [options.url])

  return { connection, isConnected }
}

// Import useState and useEffect for the hook
import { useState, useEffect } from 'react'
