import { X, TrendingUp, TrendingDown } from 'lucide-react'
import { useEffect } from 'react'

export default function PerformanceDetailModal({ isOpen, onClose, data }) {
  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return
    
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose()
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen || !data) return null

  const formatNumber = (num) => {
    if (num >= 1000) return `~${(num / 1000).toFixed(0)}k`
    return `~${num}`
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed z-50 rounded-[14px] border shadow-2xl overflow-y-auto"
        style={{
          top: '50%',
          left: '80px',
          right: '16px',
          transform: 'translateY(-50%)',
          maxHeight: 'calc(100vh - 80px)',
          backgroundColor: 'var(--sand-surface)', // #1a1d22
          borderColor: 'var(--color-gray-700)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-4 p-6">
          {/* Header */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between w-full">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--color-gray-100)' }}>
                City Performance & Reliability
              </h2>
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border"
                  style={{
                    background: 'rgba(220, 38, 38, 0.15)',
                    borderColor: 'rgba(220, 38, 38, 0.35)',
                    color: '#fca5a5',
                  }}
                >
                  Intervention needed - High priority
                </span>
                <button
                  onClick={onClose}
                  className="p-1 rounded-md transition-colors"
                  style={{ color: 'var(--color-gray-400)' }}
                  onMouseEnter={(e) => { 
                    e.currentTarget.style.color = 'var(--color-gray-100)'
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)' 
                  }}
                  onMouseLeave={(e) => { 
                    e.currentTarget.style.color = 'var(--color-gray-400)'
                    e.currentTarget.style.background = 'transparent' 
                  }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="h-px w-full" style={{ background: 'var(--border-subtle)' }} />
          </div>

          {/* Main Metric */}
          <div className="flex items-center justify-center gap-3 py-2">
            <span className="text-4xl font-medium" style={{ color: 'var(--color-gray-100)' }}>
              {formatNumber(data.residentsImpacted)}
            </span>
            <span className="text-lg font-semibold" style={{ color: 'var(--color-gray-400)' }}>
              residents impacted
            </span>
            <div
              className="flex items-center justify-center w-8 h-8 rounded-full"
              style={{ backgroundColor: 'rgba(220, 38, 38, 0.15)' }}
            >
              {data.trendDirection === 'up' ? (
                <TrendingUp className="w-5 h-5" style={{ color: '#fca5a5' }} />
              ) : (
                <TrendingDown className="w-5 h-5" style={{ color: '#34d399' }} />
              )}
            </div>
          </div>

          {/* Sub-metrics Cards */}
          <div className="flex gap-4 py-2">
            <div
              className="flex-1 flex flex-col items-center gap-2 p-4 rounded-[14px] border"
              style={{
                backgroundColor: 'var(--sand-dark)', // #0f1216
                borderColor: 'var(--color-gray-700)',
              }}
            >
              <p className="text-base font-medium" style={{ color: 'var(--color-gray-300)' }}>Resolution Time</p>
              <p className="text-[15px] font-normal" style={{ color: 'var(--color-gray-100)' }}>{data.resolutionTimeSLA}</p>
            </div>
            <div
              className="flex-1 flex flex-col items-center gap-2 p-4 rounded-[14px] border"
              style={{
                backgroundColor: 'var(--sand-dark)', // #0f1216
                borderColor: 'var(--color-gray-700)',
              }}
            >
              <p className="text-base font-medium" style={{ color: 'var(--color-gray-300)' }}>311 calls</p>
              <div className="flex items-center gap-2">
                {data.trendDirection === 'up' ? (
                  <TrendingUp className="w-3.5 h-3.5 text-red-400" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-green-400 rotate-180" />
                )}
                <p className="text-[15px] font-normal" style={{ color: 'var(--color-gray-100)' }}>
                  {data.weekOverWeekPercent}% week-on-week
                </p>
              </div>
            </div>
          </div>

          {/* Alert Box - Situation Overview */}
          <div
            className="flex flex-col p-3 rounded-lg border"
            style={{
              backgroundColor: 'rgba(220, 38, 38, 0.15)',
              borderColor: 'rgba(220, 38, 38, 0.3)',
            }}
          >
            <div className="text-sm leading-relaxed" style={{ color: '#fca5a5' }}>
              <p className="font-bold mb-3">
                {formatNumber(data.currentImpact.count)} residents are currently impacted by {data.currentImpact.summary}
              </p>

              <p className="mb-3">
                <span className="font-bold">{formatNumber(data.riskForecast.count)}</span>
                <span className="font-normal"> residents will be exposed in the next 10 days {data.riskForecast.description}.</span>
              </p>

              <p className="font-bold mb-1">311 Signal</p>
              <p className="font-normal mb-1">
                ~{data.signal311.totalCalls} calls ({data.signal311.wowDirection === 'increase' ? '+' : ''}{data.signal311.wowPercent}% WoW);
              </p>
              <p className="font-normal mb-3">
                ~{data.signal311.criticalCount} critical; driven by {data.signal311.topTypes} in {data.signal311.topNeighborhoods}; resolution times {data.signal311.resolutionDelay}.
              </p>

              <p className="font-bold mb-1">Sentiment Signal</p>
              <p className="font-normal">{data.sentimentSignal.trend}</p>
            </div>
          </div>

          {/* Recommended Action */}
          <div className="flex flex-col gap-4 py-2">
            <div className="flex items-center justify-between w-full">
              <p className="text-base font-bold" style={{ color: 'var(--color-gray-100)' }}>
                Recommended Action: <span className="font-normal" style={{ color: 'var(--color-gray-300)' }}>(Critical priority)</span>
              </p>
              <button
                className="px-3 py-2 rounded-md border text-xs font-medium transition-colors"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderColor: 'var(--color-gray-700)',
                  color: 'var(--color-gray-200)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)' }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)' }}
              >
                See more priority items
              </button>
            </div>

            <div>
              <p className="text-lg font-medium mb-2" style={{ color: 'var(--color-gray-100)' }}>{data.recommendation.title}</p>
              <p className="text-sm font-normal leading-relaxed" style={{ color: 'var(--color-gray-400)' }}>
                {data.recommendation.description}
              </p>
            </div>
          </div>

          <div className="h-px w-full" style={{ background: 'var(--border-subtle)' }} />

          {/* Impact */}
          <div className="flex flex-col gap-4">
            <p className="text-base font-bold" style={{ color: 'var(--color-gray-100)' }}>Impact:</p>
            <p className="text-base font-bold" style={{ color: '#34d399' }}>
              {data.recommendation.impact}
            </p>
          </div>

          <div className="h-px w-full" style={{ background: 'var(--border-subtle)' }} />

          {/* Economic Payoff */}
          <div className="flex flex-col gap-4">
            <p className="text-base font-semibold" style={{ color: 'var(--color-gray-100)' }}>
              Overall Economic Payoff (Aggregate):
            </p>
            <p className="text-base leading-relaxed">
              <span className="font-bold" style={{ color: '#34d399' }}>
                {data.recommendation.economicPayoff.split(' ')[0]} 
              </span>
              <span className="font-normal" style={{ color: 'var(--color-gray-300)' }}>
                {' ' + data.recommendation.economicPayoff.split(' ').slice(1).join(' ')}
              </span>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-4 pt-2">
            <div className="flex gap-4">
              <button
                className="flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  color: 'var(--color-gray-200)',
                  border: '1px solid var(--color-gray-700)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)' }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)' }}
              >
                Authorize Intervention
              </button>
              <button
                className="flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  color: 'var(--color-gray-200)',
                  border: '1px solid var(--color-gray-700)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)' }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)' }}
              >
                Assign to Relevant Division
              </button>
            </div>
            <button
              className="w-full px-4 py-2 rounded-md text-sm font-medium transition-colors border"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--color-gray-200)',
                borderColor: 'var(--color-gray-700)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)' }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)' }}
            >
              View Affected Neighborhoods
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
