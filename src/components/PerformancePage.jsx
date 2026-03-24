import { TrendingUp, TrendingDown, AlertTriangle, Users, Clock, Phone } from 'lucide-react'
import { usePanelContext } from '../contexts/PanelContext'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from 'recharts'

export default function PerformancePage({ data }) {
  const { setCurrentView } = usePanelContext()

  const formatNumber = (num) => {
    if (num >= 1000) return `~${(num / 1000).toFixed(0)}k`
    return `~${num}`
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: 'var(--color-gray-400)' }}>
        <p>No performance data available</p>
      </div>
    )
  }

  // Prepare chart data from the performance data
  const topTypesChartData = data._debug?.topTypes?.map(type => ({
    name: type.name.length > 30 ? type.name.substring(0, 27) + '...' : type.name,
    count: type.count,
    fullName: type.name
  })) || []

  const neighborhoodChartData = data._debug?.topNeighborhoods?.map(neighborhood => ({
    name: neighborhood.name,
    count: neighborhood.count
  })) || []

  // Generate mock trend data for call volume over time (last 14 days)
  const callVolumeTrendData = Array.from({ length: 14 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (13 - i))
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      calls: Math.floor(Math.random() * 50) + 20,
      critical: Math.floor(Math.random() * 15) + 5
    }
  })

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null
    
    return (
      <div
        className="rounded-lg border px-3 py-2 shadow-xl"
        style={{
          background: 'rgba(26, 29, 34, 0.98)',
          backdropFilter: 'blur(12px)',
          borderColor: 'var(--color-gray-700)',
        }}
      >
        <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-gray-300)' }}>
          {label}
        </p>
        {payload.map((entry, index) => (
          <p key={index} className="text-xs" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    )
  }

  return (
    <div 
      className="overflow-y-auto"
      style={{ 
        backgroundColor: 'var(--content-bg)',
        marginLeft: '80px',
        marginTop: 'calc(var(--nav-height) + 16px)',
        height: 'calc(100vh - var(--nav-height) - 16px)',
      }}
    >
      <div className="w-full px-8 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-gray-100)' }}>
              City Performance & Reliability
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-gray-400)' }}>
              Real-time monitoring and intervention dashboard
            </p>
          </div>
          <span
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border"
            style={{
              background: 'rgba(220, 38, 38, 0.15)',
              borderColor: 'rgba(220, 38, 38, 0.35)',
              color: '#fca5a5',
            }}
          >
            <AlertTriangle className="w-4 h-4" />
            High Priority Intervention Needed
          </span>
        </div>

        {/* Hero Metrics Grid */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          {/* Residents Impacted - Featured */}
          <div
            className="col-span-1 p-6 rounded-[14px] border"
            style={{
              backgroundColor: 'var(--sand-surface)',
              borderColor: 'var(--color-gray-700)',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5" style={{ color: 'var(--color-gray-400)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--color-gray-400)' }}>
                Residents Impacted
              </p>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-5xl font-bold" style={{ color: 'var(--color-gray-100)' }}>
                {formatNumber(data.residentsImpacted)}
              </span>
              <div
                className="flex items-center justify-center w-10 h-10 rounded-full mb-1"
                style={{ backgroundColor: 'rgba(220, 38, 38, 0.15)' }}
              >
                {data.trendDirection === 'up' ? (
                  <TrendingUp className="w-6 h-6" style={{ color: '#fca5a5' }} />
                ) : (
                  <TrendingDown className="w-6 h-6" style={{ color: '#34d399' }} />
                )}
              </div>
            </div>
          </div>

          {/* Resolution Time */}
          <div
            className="p-6 rounded-[14px] border"
            style={{
              backgroundColor: 'var(--sand-surface)',
              borderColor: 'var(--color-gray-700)',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5" style={{ color: 'var(--color-gray-400)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--color-gray-400)' }}>
                Resolution Time
              </p>
            </div>
            <p className="text-3xl font-bold" style={{ color: '#fca5a5' }}>
              {data.resolutionTimeSLA}
            </p>
            <p className="text-xs mt-2" style={{ color: 'var(--color-gray-500)' }}>
              Above service level agreement
            </p>
          </div>

          {/* 311 Calls */}
          <div
            className="p-6 rounded-[14px] border"
            style={{
              backgroundColor: 'var(--sand-surface)',
              borderColor: 'var(--color-gray-700)',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Phone className="w-5 h-5" style={{ color: 'var(--color-gray-400)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--color-gray-400)' }}>
                311 Calls
              </p>
            </div>
            <div className="flex items-center gap-2">
              {data.trendDirection === 'up' ? (
                <TrendingUp className="w-5 h-5 text-red-400" />
              ) : (
                <TrendingDown className="w-5 h-5 text-green-400" />
              )}
              <p className="text-3xl font-bold" style={{ color: 'var(--color-gray-100)' }}>
                {data.weekOverWeekPercent}%
              </p>
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--color-gray-500)' }}>
              Week-over-week change
            </p>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-3 gap-6">
          {/* Left Column - Detailed Information */}
          <div className="col-span-2 flex flex-col gap-6">
            {/* Current Impact Alert */}
            <div
              className="p-6 rounded-[14px] border"
              style={{
                backgroundColor: 'rgba(220, 38, 38, 0.12)',
                borderColor: 'rgba(220, 38, 38, 0.3)',
              }}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 flex-shrink-0 mt-1" style={{ color: '#fca5a5' }} />
                <div>
                  <h3 className="text-lg font-bold mb-3" style={{ color: '#fca5a5' }}>
                    Current Situation
                  </h3>
                  <div className="text-sm leading-relaxed" style={{ color: '#fca5a5' }}>
                    <p className="font-medium mb-3">
                      {formatNumber(data.currentImpact.count)} residents are currently impacted by {data.currentImpact.summary}
                    </p>
                    <p className="font-medium">
                      <span className="font-bold">{formatNumber(data.riskForecast.count)}</span>
                      <span> residents will be exposed in the next 10 days {data.riskForecast.description}.</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Service Requests by Type - Horizontal Progress Bars */}
            {topTypesChartData.length > 0 && (
              <div
                className="p-6 rounded-[14px] border"
                style={{
                  backgroundColor: 'var(--sand-surface)',
                  borderColor: 'var(--color-gray-700)',
                }}
              >
                <h3 className="text-lg font-semibold mb-5" style={{ color: 'var(--color-gray-100)' }}>
                  Service Requests by Type
                </h3>
                <div className="flex flex-col gap-3">
                  {topTypesChartData.map((type, index) => {
                    const colors = ['#64748b', '#60a5fa', '#fbbf24', '#a78bfa', '#fca5a5']
                    const color = colors[index % colors.length]
                    const maxCount = Math.max(...topTypesChartData.map(t => t.count))
                    const percentage = (type.count / maxCount) * 100
                    
                    return (
                      <div key={type.name} className="flex items-center gap-3">
                        <div className="flex-1 flex items-center gap-3">
                          <div className="flex items-center gap-2 w-56 flex-shrink-0">
                            <span className="text-sm" style={{ color: 'var(--color-gray-400)' }}>
                              {type.name}
                            </span>
                          </div>
                          <div className="flex-1 h-7 rounded-full overflow-hidden relative" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: color,
                              }}
                            />
                          </div>
                          <span className="text-sm font-semibold w-14 text-right" style={{ color: 'var(--color-gray-100)' }}>
                            {type.count}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Total 311 Calls Trend - Area Chart */}
            <div
              className="p-6 rounded-[14px] border"
              style={{
                backgroundColor: 'var(--sand-surface)',
                borderColor: 'var(--color-gray-700)',
              }}
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--color-gray-400)' }}>
                    Total 311 Calls
                  </h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold" style={{ color: 'var(--color-gray-100)' }}>
                      {data.signal311.totalCalls.toLocaleString()}
                    </span>
                    <span className="text-sm" style={{ color: 'var(--color-gray-500)' }}>
                      in the last 7 days
                    </span>
                  </div>
                </div>
                <div
                  className="px-3 py-1.5 rounded-md flex items-center gap-1.5"
                  style={{
                    backgroundColor: data.signal311.wowDirection === 'increase' 
                      ? 'rgba(220, 38, 38, 0.15)' 
                      : 'rgba(34, 197, 94, 0.15)',
                    color: data.signal311.wowDirection === 'increase' ? '#fca5a5' : '#86efac',
                  }}
                >
                  {data.signal311.wowDirection === 'increase' ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span className="text-sm font-semibold">
                    {data.signal311.wowPercent}% (+{Math.floor(data.signal311.totalCalls * data.signal311.wowPercent / 100)})
                  </span>
                </div>
              </div>
              
              <div className="mb-4">
                <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-gray-100)' }}>
                  Total 311 Calls Trend
                </p>
                <div style={{ width: '100%', height: '280px' }}>
                  <ResponsiveContainer>
                    <AreaChart data={callVolumeTrendData} margin={{ top: 10, right: 10, bottom: 20, left: -20 }}>
                      <defs>
                        <linearGradient id="callsAreaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        stroke="var(--color-gray-600)"
                        style={{ fontSize: '11px' }}
                        tick={{ fill: 'var(--color-gray-500)' }}
                        axisLine={{ stroke: 'var(--color-gray-700)' }}
                      />
                      <YAxis 
                        stroke="var(--color-gray-600)"
                        style={{ fontSize: '11px' }}
                        tick={{ fill: 'var(--color-gray-500)' }}
                        axisLine={{ stroke: 'var(--color-gray-700)' }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend 
                        wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }}
                        iconType="line"
                      />
                      <Area
                        type="monotone"
                        dataKey="calls"
                        stroke="#fbbf24"
                        strokeWidth={2.5}
                        fill="url(#callsAreaGradient)"
                        name="311 Calls"
                      />
                      <Line
                        type="monotone"
                        dataKey="critical"
                        stroke="#60a5fa"
                        strokeWidth={2}
                        dot={{ r: 3, fill: '#60a5fa', strokeWidth: 0 }}
                        name="Solved Cases"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bottom stat cards - Top 3 categories */}
              {topTypesChartData.length >= 3 && (
                <div className="grid grid-cols-3 gap-4 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  {topTypesChartData.slice(0, 3).map((type, index) => (
                    <div key={type.name} className="flex flex-col">
                      <span className="text-2xl font-bold mb-1" style={{ color: 'var(--color-gray-100)' }}>
                        {type.count.toLocaleString()}
                      </span>
                      <span className="text-xs leading-tight" style={{ color: 'var(--color-gray-400)' }}>
                        {type.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Neighborhood Impact - Kept as is */}
            {neighborhoodChartData.length > 0 && (
              <div
                className="p-6 rounded-[14px] border"
                style={{
                  backgroundColor: 'var(--sand-surface)',
                  borderColor: 'var(--color-gray-700)',
                }}
              >
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-gray-100)' }}>
                  Most Affected Neighborhoods
                </h3>
                <div style={{ width: '100%', height: '240px' }}>
                  <ResponsiveContainer>
                    <BarChart data={neighborhoodChartData} layout="vertical" margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                      <XAxis 
                        type="number"
                        stroke="var(--color-gray-500)"
                        style={{ fontSize: '11px', fill: 'var(--color-gray-500)' }}
                        tick={{ fill: 'var(--color-gray-500)' }}
                      />
                      <YAxis 
                        type="category"
                        dataKey="name"
                        stroke="var(--color-gray-500)"
                        style={{ fontSize: '11px', fill: 'var(--color-gray-500)' }}
                        tick={{ fill: 'var(--color-gray-500)' }}
                        width={120}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar 
                        dataKey="count" 
                        fill="#fca5a5" 
                        radius={[0, 6, 6, 0]}
                        name="Open Cases"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Actions & Impact */}
          <div className="col-span-1 flex flex-col gap-6">
            {/* Recommended Action & Impact Combined */}
            <div
              className="p-6 rounded-[14px] border"
              style={{
                backgroundColor: 'var(--sand-surface)',
                borderColor: 'var(--color-gray-700)',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold" style={{ color: 'var(--color-gray-100)' }}>
                  Recommended Action
                </h3>
                <span
                  className="text-xs px-2 py-1 rounded"
                  style={{
                    backgroundColor: 'rgba(220, 38, 38, 0.15)',
                    color: '#fca5a5',
                  }}
                >
                  Critical
                </span>
              </div>

              <div className="mb-6">
                <p className="text-base font-semibold mb-3" style={{ color: 'var(--color-gray-100)' }}>
                  {data.recommendation.title}
                </p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-gray-400)' }}>
                  {data.recommendation.description}
                </p>
              </div>

              {/* Expected Impact section within same card */}
              <div className="mb-6 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <h4 className="text-sm font-bold mb-3" style={{ color: 'var(--color-gray-100)' }}>
                  Expected Impact
                </h4>
                <p className="text-sm leading-relaxed font-medium mb-4" style={{ color: '#34d399' }}>
                  {data.recommendation.impact}
                </p>

                <div className="pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-gray-400)' }}>
                    Economic Payoff
                  </p>
                  <p className="text-sm leading-relaxed">
                    <span className="font-bold" style={{ color: '#34d399' }}>
                      {data.recommendation.economicPayoff.split(' ')[0]} 
                    </span>
                    <span className="font-normal" style={{ color: 'var(--color-gray-300)' }}>
                      {' ' + data.recommendation.economicPayoff.split(' ').slice(1).join(' ')}
                    </span>
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  className="w-full px-4 py-3 rounded-md text-sm font-semibold transition-all"
                  style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                    color: '#60a5fa',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.25)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.15)'
                  }}
                >
                  Authorize Intervention
                </button>
                <button
                  className="w-full px-4 py-2.5 rounded-md text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--color-gray-200)',
                    border: '1px solid var(--color-gray-700)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'
                  }}
                >
                  Assign to Division
                </button>
                <button
                  className="w-full px-4 py-2.5 rounded-md text-sm font-medium transition-colors border"
                  style={{
                    backgroundColor: 'transparent',
                    color: 'var(--color-gray-300)',
                    borderColor: 'var(--color-gray-700)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  See More Priority Items
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
