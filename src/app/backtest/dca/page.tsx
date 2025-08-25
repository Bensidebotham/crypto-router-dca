import { EquityChart } from '@/components/EquityChart'

export default function DCABacktestPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-gray-900">DCA Strategy Backtester</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-900">Strategy Parameters</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                Investment Amount
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder="100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                Frequency (days)
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder="7"
              />
            </div>
            <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium">
              Run Backtest
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-900">Performance Metrics</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-700">Total Return:</span>
              <span className="font-semibold text-gray-900">--</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Sharpe Ratio:</span>
              <span className="font-semibold text-gray-900">--</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Max Drawdown:</span>
              <span className="font-semibold text-gray-900">--</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Volatility:</span>
              <span className="font-semibold text-gray-900">--</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-900">Comparison</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-700">DCA vs Buy & Hold:</span>
              <span className="font-semibold text-gray-900">--</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">DCA vs Lump Sum:</span>
              <span className="font-semibold text-gray-900">--</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Best Entry Points:</span>
              <span className="font-semibold text-gray-900">--</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">Equity Curve</h2>
        <EquityChart />
      </div>
    </div>
  )
}
