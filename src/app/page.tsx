import { LiveTicker } from '@/components/LiveTicker'
import { SpreadHeatmap } from '@/components/SpreadHeatmap'
import { EquityChart } from '@/components/EquityChart'

export default function Dashboard() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-gray-900">Crypto Router DCA Dashboard</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Live Ticker</h2>
          <LiveTicker />
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Spread Heatmap</h2>
          <SpreadHeatmap />
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">Equity Chart</h2>
        <EquityChart />
      </div>
    </div>
  )
}
