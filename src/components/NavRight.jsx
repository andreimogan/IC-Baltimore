import {
  Bell,
  Layers,
  ClipboardList,
} from 'lucide-react'
import { usePanelContext } from '../contexts/PanelContext'
import ActionTabsBar from './ActionTabsBar'

const sandLogo = '/sand-logo.png'

export default function NavRight() {
  const { 
    toggleCopilot, 
    toggleLayers, 
    layersVisible,
    currentView,
    setCurrentView,
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

  return (
    <div className="flex items-center gap-4 shrink-0">

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

      {/* Action Tabs: Alerts / Forecasting / Permits */}
      <ActionTabsBar />

      {/* Work Orders */}
      <button
        className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors rounded-[8px] text-sm h-9 px-3 border"
        style={{
          ...controlStyle,
          background: currentView === 'work-orders' ? 'rgba(59, 130, 246, 0.22)' : 'rgba(255,255,255,0.05)',
        }}
        title="Work Orders"
        onClick={() => setCurrentView('work-orders')}
        onMouseEnter={(e) => {
          if (currentView !== 'work-orders') e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = currentView === 'work-orders' ? 'rgba(59, 130, 246, 0.22)' : 'rgba(255,255,255,0.05)'
        }}
      >
        <ClipboardList className="w-4 h-4" aria-hidden="true" />
        Work Orders
      </button>

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
