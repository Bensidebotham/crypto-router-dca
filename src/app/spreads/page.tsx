import { SpreadHeatmap } from '@/components/SpreadHeatmap'

export default function SpreadsPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-gray-900">Exchange Spread Analysis</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">Real-time Spread Comparison</h2>
        <p className="text-gray-700 mb-6">
          Compare bid-ask spreads across different cryptocurrency exchanges to identify the best trading opportunities.
        </p>
        
        <SpreadHeatmap />
      </div>
    </div>
  )
}
