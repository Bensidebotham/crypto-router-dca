export interface DCAParameters {
  initialInvestment: number
  recurringAmount: number
  frequency: 'daily' | 'weekly' | 'monthly'
  startDate: Date
  endDate: Date
  asset: string
}

export interface DCAResult {
  totalInvested: number
  finalValue: number
  totalReturn: number
  totalReturnPercent: number
  averageCost: number
  shares: number
  transactions: DCATransaction[]
  performance: PerformanceMetrics
}

export interface DCATransaction {
  date: Date
  price: number
  amount: number
  shares: number
  cumulativeShares: number
  cumulativeInvestment: number
  portfolioValue: number
}

export interface PerformanceMetrics {
  sharpeRatio: number
  maxDrawdown: number
  volatility: number
  winRate: number
  bestMonth: { month: string; return: number }
  worstMonth: { month: string; return: number }
  monthlyReturns: Array<{ month: string; return: number }
}

export interface PriceData {
  date: Date
  price: number
}

export class DCABCA {
  private parameters: DCAParameters
  private priceData: PriceData[]

  constructor(parameters: DCAParameters, priceData: PriceData[]) {
    this.parameters = parameters
    this.priceData = priceData.sort((a, b) => a.date.getTime() - b.date.getTime())
  }

  calculate(): DCAResult {
    const transactions: DCATransaction[] = []
    let cumulativeShares = 0
    let cumulativeInvestment = 0
    let currentDate = new Date(this.parameters.startDate)

    // Initial investment
    if (this.parameters.initialInvestment > 0) {
      const initialPrice = this.getPriceAtDate(currentDate)
      const initialShares = this.parameters.initialInvestment / initialPrice
      cumulativeShares = initialShares
      cumulativeInvestment = this.parameters.initialInvestment

      transactions.push({
        date: currentDate,
        price: initialPrice,
        amount: this.parameters.initialInvestment,
        shares: initialShares,
        cumulativeShares,
        cumulativeInvestment,
        portfolioValue: cumulativeShares * initialPrice
      })
    }

    // Recurring investments
    while (currentDate <= this.parameters.endDate) {
      const price = this.getPriceAtDate(currentDate)
      if (price > 0) {
        const shares = this.parameters.recurringAmount / price
        cumulativeShares += shares
        cumulativeInvestment += this.parameters.recurringAmount

        transactions.push({
          date: currentDate,
          price,
          amount: this.parameters.recurringAmount,
          shares,
          cumulativeShares,
          cumulativeInvestment,
          portfolioValue: cumulativeShares * price
        })
      }

      // Move to next investment date
      currentDate = this.getNextInvestmentDate(currentDate)
    }

    const finalPrice = this.getPriceAtDate(this.parameters.endDate)
    const finalValue = cumulativeShares * finalPrice
    const totalReturn = finalValue - cumulativeInvestment
    const totalReturnPercent = (totalReturn / cumulativeInvestment) * 100
    const averageCost = cumulativeInvestment / cumulativeShares

    return {
      totalInvested: cumulativeInvestment,
      finalValue,
      totalReturn,
      totalReturnPercent,
      averageCost,
      shares: cumulativeShares,
      transactions,
      performance: this.calculatePerformanceMetrics(transactions)
    }
  }

  private getPriceAtDate(date: Date): number {
    // Find the closest price data point to the given date
    const targetTime = date.getTime()
    let closestPrice = 0
    let minDiff = Infinity

    for (const data of this.priceData) {
      const diff = Math.abs(data.date.getTime() - targetTime)
      if (diff < minDiff) {
        minDiff = diff
        closestPrice = data.price
      }
    }

    return closestPrice
  }

  private getNextInvestmentDate(currentDate: Date): Date {
    const nextDate = new Date(currentDate)
    
    switch (this.parameters.frequency) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + 1)
        break
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7)
        break
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1)
        break
    }
    
    return nextDate
  }

  private calculatePerformanceMetrics(transactions: DCATransaction[]): PerformanceMetrics {
    if (transactions.length < 2) {
      return {
        sharpeRatio: 0,
        maxDrawdown: 0,
        volatility: 0,
        winRate: 0,
        bestMonth: { month: '', return: 0 },
        worstMonth: { month: '', return: 0 },
        monthlyReturns: []
      }
    }

    // Calculate monthly returns
    const monthlyReturns = this.calculateMonthlyReturns(transactions)
    
    // Calculate Sharpe ratio (assuming risk-free rate of 0)
    const returns = monthlyReturns.map(r => r.return)
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    const volatility = Math.sqrt(variance)
    const sharpeRatio = volatility > 0 ? avgReturn / volatility : 0

    // Calculate max drawdown
    const maxDrawdown = this.calculateMaxDrawdown(transactions)

    // Calculate win rate
    const winCount = returns.filter(r => r > 0).length
    const winRate = (winCount / returns.length) * 100

    // Find best and worst months
    const bestMonth = monthlyReturns.reduce((best, current) => 
      current.return > best.return ? current : best
    )
    const worstMonth = monthlyReturns.reduce((worst, current) => 
      current.return < worst.return ? current : worst
    )

    return {
      sharpeRatio,
      maxDrawdown,
      volatility,
      winRate,
      bestMonth,
      worstMonth,
      monthlyReturns
    }
  }

  private calculateMonthlyReturns(transactions: DCATransaction[]): Array<{ month: string; return: number }> {
    const monthlyData = new Map<string, { startValue: number; endValue: number }>()
    
    transactions.forEach(transaction => {
      const monthKey = transaction.date.toISOString().slice(0, 7) // YYYY-MM format
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { startValue: transaction.portfolioValue, endValue: transaction.portfolioValue })
      } else {
        monthlyData.get(monthKey)!.endValue = transaction.portfolioValue
      }
    })

    return Array.from(monthlyData.entries()).map(([month, data]) => ({
      month,
      return: ((data.endValue - data.startValue) / data.startValue) * 100
    }))
  }

  private calculateMaxDrawdown(transactions: DCATransaction[]): number {
    let peak = -Infinity
    let maxDrawdown = 0

    transactions.forEach(transaction => {
      if (transaction.portfolioValue > peak) {
        peak = transaction.portfolioValue
      }
      
      const drawdown = (peak - transaction.portfolioValue) / peak
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown
      }
    })

    return maxDrawdown * 100 // Convert to percentage
  }

  // Comparison methods
  compareWithLumpSum(lumpSumAmount: number): {
    dcaReturn: number
    lumpSumReturn: number
    difference: number
    winner: 'DCA' | 'Lump Sum' | 'Tie'
  } {
    const dcaResult = this.calculate()
    const finalPrice = this.getPriceAtDate(this.parameters.endDate)
    const lumpSumShares = lumpSumAmount / this.getPriceAtDate(this.parameters.startDate)
    const lumpSumFinalValue = lumpSumShares * finalPrice
    const lumpSumReturn = lumpSumFinalValue - lumpSumAmount

    const difference = dcaResult.totalReturn - lumpSumReturn
    let winner: 'DCA' | 'Lump Sum' | 'Tie' = 'Tie'
    
    if (difference > 0) winner = 'DCA'
    else if (difference < 0) winner = 'Lump Sum'

    return {
      dcaReturn: dcaResult.totalReturn,
      lumpSumReturn,
      difference,
      winner
    }
  }

  compareWithBuyAndHold(initialAmount: number): {
    dcaReturn: number
    buyAndHoldReturn: number
    difference: number
    winner: 'DCA' | 'Buy & Hold' | 'Tie'
  } {
    const dcaResult = this.calculate()
    const startPrice = this.getPriceAtDate(this.parameters.startDate)
    const endPrice = this.getPriceAtDate(this.parameters.endDate)
    const buyAndHoldShares = initialAmount / startPrice
    const buyAndHoldFinalValue = buyAndHoldShares * endPrice
    const buyAndHoldReturn = buyAndHoldFinalValue - initialAmount

    const difference = dcaResult.totalReturn - buyAndHoldReturn
    let winner: 'DCA' | 'Buy & Hold' | 'Tie' = 'Tie'
    
    if (difference > 0) winner = 'DCA'
    else if (difference < 0) winner = 'Buy & Hold'

    return {
      dcaReturn: dcaResult.totalReturn,
      buyAndHoldReturn,
      difference,
      winner
    }
  }
}

// Utility functions
export function calculateOptimalFrequency(
  priceData: PriceData[],
  totalAmount: number,
  startDate: Date,
  endDate: Date
): 'daily' | 'weekly' | 'monthly' {
  const frequencies: Array<'daily' | 'weekly' | 'monthly'> = ['daily', 'weekly', 'monthly']
  let bestFrequency = 'monthly'
  let bestReturn = -Infinity

  frequencies.forEach(frequency => {
    const dca = new DCABCA({
      initialInvestment: 0,
      recurringAmount: totalAmount / 12, // Assume monthly for comparison
      frequency,
      startDate,
      endDate,
      asset: 'BTC'
    }, priceData)

    const result = dca.calculate()
    if (result.totalReturn > bestReturn) {
      bestReturn = result.totalReturn
      bestFrequency = frequency
    }
  })

  return bestFrequency
}

export function calculateOptimalAmount(
  priceData: PriceData[],
  frequency: 'daily' | 'weekly' | 'monthly',
  startDate: Date,
  endDate: Date,
  targetReturn: number
): number {
  // Binary search for optimal amount
  let low = 10
  let high = 10000
  let optimalAmount = 100

  while (high - low > 1) {
    const mid = (low + high) / 2
    
    const dca = new DCABCA({
      initialInvestment: 0,
      recurringAmount: mid,
      frequency,
      startDate,
      endDate,
      asset: 'BTC'
    }, priceData)

    const result = dca.calculate()
    const returnPercent = (result.totalReturn / result.totalInvested) * 100

    if (returnPercent >= targetReturn) {
      optimalAmount = mid
      high = mid
    } else {
      low = mid
    }
  }

  return Math.round(optimalAmount)
}
