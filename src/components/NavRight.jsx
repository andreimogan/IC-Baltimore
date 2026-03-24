import { useState } from 'react'
import {
  ChevronDown,
  ListChecks,
  Search,
  Settings2,
  Download,
  Upload,
  Bell,
  Layers,
} from 'lucide-react'
import { usePanelContext } from '../contexts/PanelContext'

const sandLogo = '/sand-logo.png'

const PRIORITIES = [
  { id: 'critical', label: 'Critical' },
  { id: 'high', label: 'High Priority' },
  { id: 'medium', label: 'Medium Priority' },
  { id: 'low', label: 'Low Priority' },
]

export default function NavRight() {
  const [priorityOpen, setPriorityOpen] = useState(false)
  const [selectedPriority, setSelectedPriority] = useState(null)
  const [searchValue, setSearchValue] = useState('')
  const { 
    toggleCopilot, 
    toggleLayers, 
    layersVisible,
    mapEngine,
    setMapEngine,
    setBaltimoreNeighborhoodsAffected,
    setBaltimore311Visible
  } = usePanelContext()

  const controlStyle = {
    background: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.15)',
    color: 'rgba(255,255,255,0.9)',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  }

  const handleEngineSwitch = (engine) => {
    if (mapEngine === engine) return

    // Toggle layers off and back on when switching engines
    setBaltimoreNeighborhoodsAffected(false)
    setBaltimore311Visible(false)
    
    setMapEngine(engine)
    
    // Turn 311 back on first, then neighborhoods after another delay
    setTimeout(() => {
      setBaltimore311Visible(true)
      setTimeout(() => {
        setBaltimoreNeighborhoodsAffected(true)
      }, 500)
    }, 2000)
  }

  const priorityLabel = selectedPriority
    ? PRIORITIES.find((p) => p.id === selectedPriority)?.label
    : null

  return (
    <div className="flex items-center gap-4 shrink-0">

      {/* Select Priority */}
      <div className="relative">
        <button
          className="flex items-center gap-2 h-9 px-3 rounded-[8px] border text-sm transition-colors w-[200px]"
          style={controlStyle}
          onClick={() => setPriorityOpen(!priorityOpen)}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
        >
          <ListChecks className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span
            className="flex-1 text-left truncate text-sm"
            style={{ color: priorityLabel ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)' }}
          >
            {priorityLabel ?? 'Select Priority'}
          </span>
          <ChevronDown
            className="w-4 h-4 shrink-0 transition-transform"
            style={{ transform: priorityOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            aria-hidden="true"
          />
        </button>
        {priorityOpen && (
          <div
            className="absolute right-0 mt-1 w-full rounded-[8px] border shadow-lg z-50 overflow-hidden"
            style={{ borderColor: 'rgba(255,255,255,0.1)', background: '#171717' }}
          >
            {PRIORITIES.map((p) => (
              <button
                key={p.id}
                className="w-full text-left px-3 py-2 text-sm flex items-center justify-between"
                style={{ color: 'rgba(255,255,255,0.9)' }}
                onClick={() => { setSelectedPriority(p.id); setPriorityOpen(false) }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                {p.label}
                {selectedPriority === p.id && (
                  <span className="text-[10px] uppercase tracking-wide opacity-60">Active</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search */}
      <div
        className="flex items-center gap-2 h-9 px-3 rounded-[8px] border text-sm w-[200px]"
        style={controlStyle}
      >
        <Search
          className="w-4 h-4 shrink-0"
          style={{ color: 'rgba(255,255,255,0.4)' }}
          aria-hidden="true"
        />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Search"
          className="flex-1 bg-transparent outline-none text-sm min-w-0 placeholder:text-[rgba(255,255,255,0.4)]"
          style={{ color: 'rgba(255,255,255,0.9)', caretColor: 'white' }}
        />
        <Settings2
          className="w-4 h-4 shrink-0 cursor-pointer transition-opacity hover:opacity-80"
          style={{ color: 'rgba(255,255,255,0.4)' }}
          aria-hidden="true"
        />
      </div>

      {/* Button Group: MapLibre / Mapbox / Layers / Bell */}
      <div className="flex items-center h-9">
        <button
          className="flex items-center justify-center w-9 h-9 border transition-colors"
          style={{ 
            ...controlStyle, 
            borderTopLeftRadius: '8px', 
            borderBottomLeftRadius: '8px',
            background: mapEngine === 'maplibre' ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255,255,255,0.05)',
          }}
          title="MapLibre"
          onClick={() => handleEngineSwitch('maplibre')}
          onMouseEnter={(e) => { 
            if (mapEngine !== 'maplibre') e.currentTarget.style.background = 'rgba(255,255,255,0.1)' 
          }}
          onMouseLeave={(e) => { 
            e.currentTarget.style.background = mapEngine === 'maplibre' ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255,255,255,0.05)' 
          }}
        >
          <span className="text-[10px] font-semibold">ML</span>
        </button>
        <button
          className="flex items-center justify-center w-9 h-9 border transition-colors"
          style={{ 
            ...controlStyle, 
            borderLeftWidth: 0,
            background: mapEngine === 'mapbox' ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255,255,255,0.05)',
          }}
          title="Mapbox"
          onClick={() => handleEngineSwitch('mapbox')}
          onMouseEnter={(e) => { 
            if (mapEngine !== 'mapbox') e.currentTarget.style.background = 'rgba(255,255,255,0.1)' 
          }}
          onMouseLeave={(e) => { 
            e.currentTarget.style.background = mapEngine === 'mapbox' ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255,255,255,0.05)' 
          }}
        >
          <span className="text-[10px] font-semibold">MB</span>
        </button>
        <button
          className="flex items-center justify-center w-9 h-9 border transition-colors"
          style={{
            ...controlStyle,
            borderLeftWidth: 0,
            background: layersVisible ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
          }}
          title="Map Layers"
          onClick={toggleLayers}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = layersVisible ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)' }}
        >
          <Layers className="w-4 h-4" aria-hidden="true" />
        </button>
        <button
          className="flex items-center justify-center w-9 h-9 border transition-colors"
          style={{ ...controlStyle, borderLeftWidth: 0, borderTopRightRadius: '8px', borderBottomRightRadius: '8px' }}
          title="Notifications"
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
        >
          <Bell className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {/* Ask SIA */}
      <button
        className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors rounded-[8px] text-sm h-9 px-4"
        style={{
          background: '#e5e5e5',
          color: '#171717',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        }}
        title="Water OS Copilot"
        onClick={toggleCopilot}
        onMouseEnter={(e) => e.currentTarget.style.background = '#f0f0f0'}
        onMouseLeave={(e) => e.currentTarget.style.background = '#e5e5e5'}
      >
        <span className="w-4 h-4 block shrink-0 overflow-hidden" aria-hidden="true">
          <img
            src={sandLogo}
            alt=""
            className="w-full h-full object-contain"
          />
        </span>
        Ask SIA
      </button>

    </div>
  )
}
