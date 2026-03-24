import { useState, useEffect } from 'react'
import {
  GripVertical,
  RefreshCw,
  Settings,
  X,
  Search,
  ChevronRight,
  ChevronDown,
  Minus,
} from 'lucide-react'
import { usePanelContext } from '../../contexts/PanelContext'
import { useDraggable } from '../../hooks/useDraggable'
import { BUCKET_DEFINITIONS, groupTypesByBucket } from '../../utils/311TypeBuckets'
import { 
  OVERDOSE_FILTER_CATEGORIES, 
  NALOXONE_FILTER_CATEGORIES,
  initializeOverdoseFilters,
  initializeNaloxoneFilters,
  parseFilterKey,
  getFiltersByCategory,
} from '../../utils/healthDataCategories'

const stlCategories = [
  {
    id: 'boundaries',
    name: 'Boundaries & Risk',
    layers: [
      { id: 'neighborhoods-risk', name: 'Neighborhoods | Risk' },
      { id: 'city-blocks-risk', name: 'City Blocks | Risk' },
      { id: 'city-blocks-complaints', name: 'City Blocks | Complaint Counts' },
      { id: 'city-blocks-top', name: 'City Blocks | Top Complaints' },
    ],
  },
  { id: 'risk', name: 'Risk / Health', layers: [] },
]

const baltimoreCategories = [
  {
    id: 'requests',
    name: '311 Service Requests',
    layers: 'dynamic', // Will be populated from fetched data
  },
  {
    id: 'health',
    name: 'City Health',
    layers: 'health-dynamic', // Will be populated from health data
  },
]

export default function ManageMapLayersPanel() {
  const {
    layersVisible,
    toggleLayers,
    neighborhoodsRiskVisible,
    setNeighborhoodsRiskVisible,
    baltimoreNeighborhoodsData,
    setBaltimoreNeighborhoodsData,
    baltimoreNeighborhoodsAffected,
    setBaltimoreNeighborhoodsAffected,
    baltimoreNeighborhoodsAll,
    setBaltimoreNeighborhoodsAll,
    selectedCity,
    selectedYear,
    selectedDate,
    mapEngine,
    setMapEngine,
    mapLibreColors,
    setMapLibreColors,
    mapboxColors,
    setMapboxColors,
    baltimore311Visible,
    setBaltimore311Visible,
    baltimore311Style,
    setBaltimore311Style,
    baltimore311Clustered,
    setBaltimore311Clustered,
    baltimore311HideClosed,
    setBaltimore311HideClosed,
    baltimore311Types,
    setBaltimore311Types,
    baltimore311Data,
    baltimore311DataYear,
    healthOverdoseVisible,
    setHealthOverdoseVisible,
    healthNaloxoneVisible,
    setHealthNaloxoneVisible,
    healthOverdoseData,
    healthNaloxoneData,
    healthOverdoseFilters,
    setHealthOverdoseFilters,
    healthNaloxoneFilters,
    setHealthNaloxoneFilters,
    healthDataYear,
  } = usePanelContext()

  const PANEL_WIDTH = 320
  const RIGHT_MARGIN = 24
  const TOP_OFFSET = 80

  const getRightAlignedPosition = () => ({
    x: typeof window !== 'undefined' ? window.innerWidth - PANEL_WIDTH - RIGHT_MARGIN : 0,
    y: TOP_OFFSET,
  })

  const { position, setPosition, isDragging, dragRef, handleMouseDown } = useDraggable(getRightAlignedPosition())

  useEffect(() => {
    if (layersVisible) {
      setPosition({ x: window.innerWidth - PANEL_WIDTH - RIGHT_MARGIN, y: TOP_OFFSET })
    }
  }, [layersVisible, setPosition])

  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategories, setExpandedCategories] = useState({ boundaries: true, requests: true, health: true })
  const [expandedBuckets, setExpandedBuckets] = useState({}) // Track which 311 buckets are expanded
  const [expandedHealthCategories, setExpandedHealthCategories] = useState({}) // Track which health filter categories are expanded
  const [basemapStyleOpen, setBasemapStyleOpen] = useState(false)
  const [layerStates, setLayerStates] = useState({
    'neighborhoods-risk': neighborhoodsRiskVisible,
    'city-blocks-risk': false,
    'city-blocks-complaints': false,
    'city-blocks-top': false,
    'baltimore-311-cluster': baltimore311Clustered,
  })

  // Extract unique 311 types from fetched data and initialize their states
  useEffect(() => {
    if (!baltimore311Data || selectedCity !== 'baltimore') return
    // Data is already filtered by date from the API, no need to re-filter
    const uniqueTypes = [...new Set(
      baltimore311Data.features
        .filter((f) => {
          const srType = f?.properties?.SRType
          const hasValidPoint =
            f?.geometry?.type === 'Point' &&
            Array.isArray(f?.geometry?.coordinates) &&
            f.geometry.coordinates.length >= 2
          
          return srType && hasValidPoint
        })
        .map(f => f.properties.SRType)
    )].sort()
    
    // Initialize all types to true (all enabled by default)
    const typesObj = {}
    uniqueTypes.forEach(t => { typesObj[t] = true })
    setBaltimore311Types(typesObj)

    // Auto-expand first bucket
    const grouped = groupTypesByBucket(uniqueTypes)
    const firstBucket = Object.keys(grouped)[0]
    if (firstBucket) setExpandedBuckets({ [firstBucket]: true })
  }, [baltimore311Data, selectedCity, selectedDate, setBaltimore311Types])

  // Initialize health data filters when health data loads
  useEffect(() => {
    if (selectedCity !== 'baltimore' || !healthOverdoseData) return
    
    // Initialize overdose filters if empty
    if (Object.keys(healthOverdoseFilters).length === 0) {
      setHealthOverdoseFilters(initializeOverdoseFilters())
    }
  }, [healthOverdoseData, selectedCity, healthOverdoseFilters, setHealthOverdoseFilters])

  useEffect(() => {
    if (selectedCity !== 'baltimore' || !healthNaloxoneData) return
    
    // Initialize naloxone filters if empty
    if (Object.keys(healthNaloxoneFilters).length === 0) {
      setHealthNaloxoneFilters(initializeNaloxoneFilters())
    }
  }, [healthNaloxoneData, selectedCity, healthNaloxoneFilters, setHealthNaloxoneFilters])

  if (!layersVisible) return null

  const toggleCategory = (id) => {
    setExpandedCategories(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleBucket = (bucketId) => {
    setExpandedBuckets(prev => ({ ...prev, [bucketId]: !prev[bucketId] }))
  }

  const toggleBucketTypes = (bucketId, types) => {
    const allOn = types.every(t => baltimore311Types[t])
    const newState = !allOn // If all on, turn all off; otherwise turn all on
    const updates = {}
    types.forEach(t => { updates[t] = newState })
    setBaltimore311Types(prev => ({ ...prev, ...updates }))
  }

  const toggleAll311Types = () => {
    const allTypes = Object.keys(baltimore311Types)
    const allOn = allTypes.every(t => baltimore311Types[t])
    const newState = !allOn // If all on, turn all off; otherwise turn all on
    const updates = {}
    allTypes.forEach(t => { updates[t] = newState })
    setBaltimore311Types(prev => ({ ...prev, ...updates }))
  }

  const getGlobalToggleState = () => {
    const allTypes = Object.keys(baltimore311Types)
    if (allTypes.length === 0) return 'off'
    const onCount = allTypes.filter(t => baltimore311Types[t]).length
    if (onCount === 0) return 'off'
    if (onCount === allTypes.length) return 'on'
    return 'mixed'
  }

  // Health data helpers
  const toggleHealthFilter = (filterKey) => {
    const { category } = parseFilterKey(filterKey)
    if (category === 'locationType') {
      setHealthNaloxoneFilters(prev => ({ ...prev, [filterKey]: !prev[filterKey] }))
    } else {
      setHealthOverdoseFilters(prev => ({ ...prev, [filterKey]: !prev[filterKey] }))
    }
  }

  const toggleHealthCategory = (categoryId) => {
    setExpandedHealthCategories(prev => ({ ...prev, [categoryId]: !prev[categoryId] }))
  }

  const getHealthCategoryCount = (categoryId, isOverdose) => {
    const data = isOverdose ? healthOverdoseData : healthNaloxoneData
    if (!data) return 0
    
    const asOfDate = new Date(selectedDate)
    asOfDate.setHours(23, 59, 59, 999)
    const asOfTime = asOfDate.getTime()
    
    const dateField = isOverdose ? 'incidentDate' : 'distributionDate'
    
    return data.features.filter(f => f.properties[dateField] <= asOfTime).length
  }

  const getBucketToggleState = (types) => {
    const onCount = types.filter(t => baltimore311Types[t]).length
    if (onCount === 0) return 'off'
    if (onCount === types.length) return 'on'
    return 'mixed'
  }

  // Check if at least one 311 type is enabled
  const hasAny311TypeEnabled = Object.values(baltimore311Types).some(v => v === true)

  const getBucketRequestCount = (types) => {
    if (!baltimore311Data) return 0
    // Data is already filtered by date from the API, no need to re-filter
    return baltimore311Data.features.filter((f) => {
      const srType = f?.properties?.SRType
      const isEnabledType = types.includes(srType)
      const hasValidPoint =
        f?.geometry?.type === 'Point' &&
        Array.isArray(f?.geometry?.coordinates) &&
        f.geometry.coordinates.length >= 2
      
      return isEnabledType && hasValidPoint
    }).length
  }

  const toggleLayer = (layerId) => {
    const newState = !layerStates[layerId]
    setLayerStates(prev => ({ ...prev, [layerId]: newState }))
    if (layerId === 'neighborhoods-risk') setNeighborhoodsRiskVisible(newState)
  }

  const handleBasemapStyleSelect = (style) => {
    setBaltimore311Style(style)
    // Update old baltimore311Clustered for backward compatibility
    setBaltimore311Clustered(style === 'cluster')
    setLayerStates(prev => ({ ...prev, 'baltimore-311-cluster': style === 'cluster' }))
    setBasemapStyleOpen(false)
  }

  const toggle311Type = (typeName) => {
    setBaltimore311Types(prev => ({ ...prev, [typeName]: !prev[typeName] }))
  }

  // Build dynamic Baltimore 311 layers from data (grouped by bucket)
  const baltimoreCategoriesWithBuckets = baltimoreCategories.map(cat => {
    if (cat.layers === 'dynamic') {
      const types = Object.keys(baltimore311Types).sort()
      const bucketGroups = groupTypesByBucket(types)
      
      const bucketLayers = Object.entries(bucketGroups).map(([bucketId, bucketTypes]) => {
        const bucketDef = BUCKET_DEFINITIONS[bucketId] || { id: bucketId, name: bucketId === 'other' ? 'Other / Unknown' : bucketId }
        return {
          id: `bucket-${bucketId}`,
          name: bucketDef.name,
          isBucket: true,
          bucketId,
          types: bucketTypes,
        }
      })
      
      return { ...cat, layers: bucketLayers }
    }
    
    if (cat.layers === 'health-dynamic') {
      // Build health data layers
      const healthLayers = [
        {
          id: 'health-overdose',
          name: 'Overdose Incidents',
          isHealthLayer: true,
          healthType: 'overdose',
          filterCategories: OVERDOSE_FILTER_CATEGORIES,
        },
        {
          id: 'health-naloxone',
          name: 'Naloxone Distribution',
          isHealthLayer: true,
          healthType: 'naloxone',
          filterCategories: NALOXONE_FILTER_CATEGORIES,
        },
      ]
      
      return { ...cat, layers: healthLayers }
    }
    
    return cat
  })

  const activeCategories = selectedCity === 'baltimore' ? baltimoreCategoriesWithBuckets : stlCategories

  // Enhanced search: search in bucket names AND individual type names
  const filteredCategories = activeCategories.map(cat => {
    if (!searchQuery) {
      return { ...cat, layers: cat.layers }
    }
    
    const query = searchQuery.toLowerCase()
    
    return {
      ...cat,
      layers: cat.layers
        .map(layer => {
          // For health layers, search in layer name and filter categories
          if (layer.isHealthLayer) {
            const layerNameMatches = layer.name.toLowerCase().includes(query)
            if (layerNameMatches) return layer
            
            // Check if any filter options match
            const hasMatchingFilters = Object.values(layer.filterCategories).some(category =>
              category.options.some(opt => opt.toLowerCase().includes(query))
            )
            if (hasMatchingFilters) return { ...layer, isFiltered: true }
            
            return null
          }
          
          // For buckets, check if bucket name matches OR any of its types match
          if (layer.isBucket) {
            const bucketNameMatches = layer.name.toLowerCase().includes(query)
            const matchingTypes = layer.types.filter(t => t.toLowerCase().includes(query))
            
            // If bucket name matches, include all types
            if (bucketNameMatches) {
              return layer
            }
            
            // If any types match, return bucket with only matching types
            if (matchingTypes.length > 0) {
              return {
                ...layer,
                types: matchingTypes,
                isFiltered: true // Mark as filtered so we can auto-expand it
              }
            }
            
            // No match
            return null
          }
          
          // For regular layers, simple name match
          return layer.name.toLowerCase().includes(query) ? layer : null
        })
        .filter(Boolean) // Remove nulls
    }
  })

  return (
    <div
      className="rounded-xl border fixed shadow-xl overflow-hidden flex flex-col z-30"
      role="region"
      aria-label="Map Layers"
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`,
        width: '320px',
        maxHeight: 'calc(100vh - 5rem)',
        backgroundColor: 'var(--sand-surface)',
        borderColor: 'var(--color-gray-700)',
        color: 'var(--color-gray-100)',
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div
        ref={dragRef}
        className="p-3 flex items-center justify-between select-none border-b shrink-0"
        style={{
          borderColor: 'var(--color-gray-700)',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <GripVertical className="w-4 h-4 shrink-0" style={{ color: 'var(--color-gray-400)' }} aria-hidden="true" />
          <span className="shrink-0">
            <svg className="w-4 h-4" style={{ color: 'var(--color-gray-500)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
            </svg>
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold leading-tight truncate" style={{ color: 'var(--color-gray-100)' }}>
              Manage Map Layers
            </h2>
            <p className="text-xs opacity-70" style={{ color: 'var(--color-gray-400)' }}>
              Click categories to expand
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-7 w-7"
            style={{ color: 'var(--color-gray-300)' }}
            title="Reload layer settings"
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-gray-100)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-gray-300)'}
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
          </button>
          <div className="relative">
            <button
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-7 w-7"
              style={{ color: basemapStyleOpen ? 'var(--color-gray-100)' : 'var(--color-gray-300)' }}
              title="Basemap settings"
              onClick={() => setBasemapStyleOpen(!basemapStyleOpen)}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-gray-100)'}
              onMouseLeave={(e) => !basemapStyleOpen && (e.currentTarget.style.color = 'var(--color-gray-300)')}
            >
              <Settings className="w-4 h-4" aria-hidden="true" />
            </button>
            {basemapStyleOpen && (
              <div
                className="absolute right-0 mt-1 w-48 rounded-[8px] border shadow-lg z-50 overflow-hidden"
                style={{ borderColor: 'var(--color-gray-700)', background: 'var(--sand-surface)' }}
              >
                <div className="p-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wide px-2 py-1.5" style={{ color: 'var(--color-gray-400)' }}>
                    Basemap Style
                  </div>
                  <button
                    className="w-full text-left px-2.5 py-2 text-sm rounded-md flex items-center justify-between transition-colors"
                    style={{
                      color: 'var(--color-gray-200)',
                      backgroundColor: baltimore311Style === 'default' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                    }}
                    onClick={() => handleBasemapStyleSelect('default')}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = baltimore311Style === 'default' ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255,255,255,0.05)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = baltimore311Style === 'default' ? 'rgba(59, 130, 246, 0.15)' : 'transparent' }}
                  >
                    <span>Default View</span>
                    {baltimore311Style === 'default' && (
                      <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--color-blue-400)' }}>Active</span>
                    )}
                  </button>
                  <button
                    className="w-full text-left px-2.5 py-2 text-sm rounded-md flex items-center justify-between transition-colors"
                    style={{
                      color: 'var(--color-gray-200)',
                      backgroundColor: baltimore311Style === 'cluster' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                    }}
                    onClick={() => handleBasemapStyleSelect('cluster')}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = baltimore311Style === 'cluster' ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255,255,255,0.05)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = baltimore311Style === 'cluster' ? 'rgba(59, 130, 246, 0.15)' : 'transparent' }}
                  >
                    <span>Cluster View</span>
                    {baltimore311Style === 'cluster' && (
                      <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--color-blue-400)' }}>Active</span>
                    )}
                  </button>
                  <button
                    className="w-full text-left px-2.5 py-2 text-sm rounded-md flex items-center justify-between transition-colors"
                    style={{
                      color: 'var(--color-gray-200)',
                      backgroundColor: baltimore311Style === 'heatmap' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                    }}
                    onClick={() => handleBasemapStyleSelect('heatmap')}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = baltimore311Style === 'heatmap' ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255,255,255,0.05)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = baltimore311Style === 'heatmap' ? 'rgba(59, 130, 246, 0.15)' : 'transparent' }}
                  >
                    <span>Heatmap</span>
                    {baltimore311Style === 'heatmap' && (
                      <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--color-blue-400)' }}>Active</span>
                    )}
                  </button>

                </div>
              </div>
            )}
          </div>
          <button
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-7 w-7"
            style={{ color: 'var(--color-gray-300)' }}
            title="Close"
            onClick={toggleLayers}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-gray-100)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-gray-300)'}
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col p-4 gap-3 overflow-hidden">

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4" style={{ color: 'var(--color-gray-400)' }} aria-hidden="true" />
          <input
            className="flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors pl-8 focus-visible:outline-none focus-visible:ring-1"
            style={{
              backgroundColor: 'var(--sand-surface)',
              borderColor: 'var(--color-gray-700)',
              color: 'var(--color-gray-100)',
            }}
            placeholder="Search layers"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Date notice (Baltimore only) */}
        {selectedCity === 'baltimore' && (
          <div
            className="text-xs px-2 py-1.5 rounded-md"
            style={{ background: 'rgba(249,115,22,0.1)', color: 'rgba(249,115,22,0.9)', border: '1px solid rgba(249,115,22,0.2)' }}
          >
            {baltimore311DataYear === selectedYear ? (
              <>
                Showing data as of <strong>{selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                {Object.keys(baltimore311Types).length > 0 && ` · ${Object.keys(baltimore311Types).length} types available`}
                {Object.keys(baltimore311Types).length === 0 && ' · No data available'}
              </>
            ) : (
              <>Loading data for {selectedYear}...</>
            )}
          </div>
        )}

        {/* Categories */}
        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
          {filteredCategories.map((category) => (
            <div key={category.id}>
              <div
                className="flex items-center justify-between py-1.5 px-2.5 rounded-lg border min-h-[36px] sticky top-0 z-10"
                style={{
                  borderColor: 'var(--color-gray-600)',
                  backgroundColor: 'rgba(31, 41, 55, 0.95)',
                  backdropFilter: 'saturate(180%) blur(4px)',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-gray-700)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(31, 41, 55, 0.95)'}
              >
                {/* Left: expand/collapse */}
                <div
                  role="button"
                  tabIndex={0}
                  className="flex items-center gap-1.5 flex-1 min-w-0 cursor-pointer"
                  onClick={() => toggleCategory(category.id)}
                >
                  <div className="w-4 h-4 flex items-center justify-center shrink-0" style={{ color: 'var(--color-gray-400)' }}>
                    {expandedCategories[category.id]
                      ? <ChevronDown className="w-3 h-3" aria-hidden="true" />
                      : <ChevronRight className="w-3 h-3" aria-hidden="true" />}
                  </div>
                  <span className="text-[13px] font-medium leading-tight truncate" style={{ color: 'var(--color-gray-200)' }}>
                    {category.name}
                  </span>
                </div>
                
                {/* Right: Hide Closed toggle (only for 311 Service Requests) */}
                {category.id === 'requests' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] opacity-50">Hide Closed</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={baltimore311HideClosed}
                      onClick={(e) => {
                        e.stopPropagation()
                        setBaltimore311HideClosed(!baltimore311HideClosed)
                      }}
                      className="relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                      style={{
                        backgroundColor: baltimore311HideClosed ? '#fb923c' : 'rgba(255,255,255,0.1)',
                      }}
                    >
                      <span
                        className="pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out"
                        style={{
                          transform: baltimore311HideClosed ? 'translateX(12px)' : 'translateX(0)',
                        }}
                      />
                    </button>
                  </div>
                )}
              </div>

              {expandedCategories[category.id] && category.layers.length > 0 && (
                <div className="space-y-1.5 mt-2 ml-4">
                  {/* Global 311 toggle (only for Baltimore 311 Service Requests) */}
                  {category.id === 'requests' && selectedCity === 'baltimore' && Object.keys(baltimore311Types).length > 0 && (
                    <div
                      className="rounded-lg border px-2.5 py-2 flex items-center justify-between gap-2 transition-colors mb-3"
                      style={{
                        borderColor: 'rgba(249,115,22,0.5)',
                        backgroundColor: 'rgba(249,115,22,0.12)',
                      }}
                    >
                      <span className="text-[13px] font-semibold leading-tight" style={{ color: 'var(--color-gray-100)' }}>
                        Show All 311 Requests
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={getGlobalToggleState() !== 'off'}
                        aria-label="Toggle all 311 requests"
                        className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors"
                        style={{ backgroundColor: getGlobalToggleState() === 'off' ? 'var(--color-gray-300)' : '#f97316' }}
                        onClick={toggleAll311Types}
                      >
                        {getGlobalToggleState() === 'mixed' ? (
                          <Minus className="w-3 h-3 text-white absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
                        ) : (
                          <span
                            className="pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
                            style={{ transform: getGlobalToggleState() === 'on' ? 'translateX(16px)' : 'translateX(0)' }}
                          />
                        )}
                      </button>
                    </div>
                  )}

                  {category.layers.map((layer) => {
                    // Bucket rendering (nested accordion with toggle-all)
                    if (layer.isBucket) {
                      const bucketState = getBucketToggleState(layer.types)
                      const requestCount = getBucketRequestCount(layer.types)
                      // Auto-expand bucket if it's filtered (search resulted in type matches)
                      const isExpanded = expandedBuckets[layer.bucketId] || layer.isFiltered
                      
                      return (
                        <div key={layer.id} className="space-y-1">
                          {/* Bucket header */}
                          <div
                            className="rounded-lg border px-2.5 py-1.5 flex items-center justify-between gap-2 transition-colors"
                            style={{
                              borderColor: bucketState === 'off' ? 'var(--color-gray-600)' : 'rgba(249,115,22,0.35)',
                              backgroundColor: bucketState === 'off' ? 'rgba(26, 29, 34, 0.15)' : 'rgba(249,115,22,0.08)',
                            }}
                          >
                            {/* Left: expand/collapse */}
                            <div
                              className="flex items-center gap-1.5 flex-1 min-w-0 cursor-pointer"
                              onClick={() => toggleBucket(layer.bucketId)}
                            >
                              <div className="w-3 h-3 flex items-center justify-center shrink-0" style={{ color: 'var(--color-gray-400)' }}>
                                {isExpanded ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
                              </div>
                              <span className="text-[12px] font-medium leading-tight truncate" style={{ color: 'var(--color-gray-200)' }}>
                                {layer.name}
                              </span>
                              <span className="text-[10px] opacity-50">({requestCount})</span>
                            </div>
                            
                            {/* Right: toggle all in bucket */}
                            <button
                              type="button"
                              role="switch"
                              aria-checked={bucketState === 'on'}
                              aria-label={`Toggle all ${layer.name}`}
                              className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors scale-85"
                              style={{ backgroundColor: bucketState === 'off' ? 'var(--color-gray-300)' : '#f97316' }}
                              onClick={(e) => { e.stopPropagation(); toggleBucketTypes(layer.bucketId, layer.types) }}
                            >
                              {bucketState === 'mixed' ? (
                                <Minus className="w-3 h-3 text-white absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
                              ) : (
                                <span
                                  className="pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
                                  style={{ transform: bucketState === 'on' ? 'translateX(16px)' : 'translateX(0)' }}
                                />
                              )}
                            </button>
                          </div>

                          {/* Bucket types (nested) */}
                          {isExpanded && (
                            <div className="space-y-1 ml-3">
                              {layer.types.map((typeName) => {
                                const isOn = baltimore311Types[typeName]
                                return (
                                  <div
                                    key={typeName}
                                    className="rounded-md border transition-colors px-2 py-1.5 flex items-center justify-between gap-2"
                                    style={{
                                      borderColor: isOn ? 'rgba(249,115,22,0.3)' : 'var(--color-gray-700)',
                                      backgroundColor: isOn ? 'rgba(249,115,22,0.06)' : 'transparent',
                                    }}
                                  >
                                    <span className="text-[11px] font-medium leading-tight truncate" style={{ color: 'var(--color-gray-200)' }}>
                                      {typeName}
                                    </span>
                                    <button
                                      type="button"
                                      role="switch"
                                      aria-checked={isOn}
                                      aria-label={`Toggle ${typeName}`}
                                      className="relative inline-flex h-4 w-8 shrink-0 cursor-pointer items-center rounded-full transition-colors"
                                      style={{ backgroundColor: isOn ? '#f97316' : 'var(--color-gray-400)' }}
                                      onClick={() => toggle311Type(typeName)}
                                    >
                                      <span
                                        className="pointer-events-none absolute left-0.5 top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform"
                                        style={{ transform: isOn ? 'translateX(14px)' : 'translateX(0)' }}
                                      />
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    }

                    // Health layer rendering (Overdose & Naloxone)
                    if (layer.isHealthLayer) {
                      const isOverdose = layer.healthType === 'overdose'
                      const isVisible = isOverdose ? healthOverdoseVisible : healthNaloxoneVisible
                      const count = getHealthCategoryCount(layer.id, isOverdose)
                      const filters = isOverdose ? healthOverdoseFilters : healthNaloxoneFilters
                      const isExpanded = expandedHealthCategories[layer.id] || layer.isFiltered
                      
                      return (
                        <div key={layer.id} className="space-y-1">
                          {/* Health layer header */}
                          <div
                            className="rounded-lg border px-2.5 py-2 flex items-center justify-between gap-2 transition-colors"
                            style={{
                              borderColor: isVisible ? (isOverdose ? 'rgba(220,38,38,0.35)' : 'rgba(16,185,129,0.35)') : 'var(--color-gray-600)',
                              backgroundColor: isVisible ? (isOverdose ? 'rgba(220,38,38,0.08)' : 'rgba(16,185,129,0.08)') : 'rgba(26, 29, 34, 0.15)',
                            }}
                          >
                            {/* Left: expand/collapse */}
                            <div
                              className="flex items-center gap-1.5 flex-1 min-w-0 cursor-pointer"
                              onClick={() => toggleHealthCategory(layer.id)}
                            >
                              <div className="w-3 h-3 flex items-center justify-center shrink-0" style={{ color: 'var(--color-gray-400)' }}>
                                {isExpanded ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
                              </div>
                              <span className="text-[12px] font-medium leading-tight truncate" style={{ color: 'var(--color-gray-200)' }}>
                                {layer.name}
                              </span>
                              <span className="text-[10px] opacity-50">({count})</span>
                            </div>
                            
                            {/* Right: master toggle for this layer */}
                            <button
                              type="button"
                              role="switch"
                              aria-checked={isVisible}
                              aria-label={`Toggle ${layer.name}`}
                              className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors scale-85"
                              style={{ backgroundColor: isVisible ? (isOverdose ? '#dc2626' : '#10b981') : 'var(--color-gray-300)' }}
                              onClick={(e) => { 
                                e.stopPropagation()
                                if (isOverdose) setHealthOverdoseVisible(!isVisible)
                                else setHealthNaloxoneVisible(!isVisible)
                              }}
                            >
                              <span
                                className="pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
                                style={{ transform: isVisible ? 'translateX(16px)' : 'translateX(0)' }}
                              />
                            </button>
                          </div>

                          {/* Filter categories (nested) */}
                          {isExpanded && (
                            <div className="space-y-2 ml-3">
                              {Object.entries(layer.filterCategories).map(([catId, category]) => {
                                const categoryFilters = getFiltersByCategory(filters, { [catId]: category })[catId]
                                const isExpanded = expandedHealthCategories[`${layer.id}-${catId}`]
                                
                                return (
                                  <div key={catId} className="space-y-1">
                                    {/* Filter category header */}
                                    <div
                                      className="rounded-md border px-2 py-1.5 flex items-center gap-1.5 cursor-pointer transition-colors"
                                      style={{
                                        borderColor: 'var(--color-gray-700)',
                                        backgroundColor: 'rgba(26, 29, 34, 0.2)',
                                      }}
                                      onClick={() => toggleHealthCategory(`${layer.id}-${catId}`)}
                                    >
                                      <div className="w-3 h-3 flex items-center justify-center shrink-0" style={{ color: 'var(--color-gray-400)' }}>
                                        {isExpanded ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
                                      </div>
                                      <span className="text-[11px] font-medium leading-tight" style={{ color: 'var(--color-gray-300)' }}>
                                        {category.name}
                                      </span>
                                    </div>
                                    
                                    {/* Filter options */}
                                    {isExpanded && (
                                      <div className="space-y-1 ml-3">
                                        {categoryFilters.options.map(option => (
                                          <div
                                            key={option.key}
                                            className="rounded-md border transition-colors px-2 py-1 flex items-center justify-between gap-2"
                                            style={{
                                              borderColor: option.enabled ? (isOverdose ? 'rgba(220,38,38,0.25)' : 'rgba(16,185,129,0.25)') : 'var(--color-gray-700)',
                                              backgroundColor: option.enabled ? (isOverdose ? 'rgba(220,38,38,0.05)' : 'rgba(16,185,129,0.05)') : 'transparent',
                                            }}
                                          >
                                            <span className="text-[10px] font-medium leading-tight truncate" style={{ color: 'var(--color-gray-200)' }}>
                                              {option.label}
                                            </span>
                                            <button
                                              type="button"
                                              role="switch"
                                              aria-checked={option.enabled}
                                              aria-label={`Toggle ${option.label}`}
                                              className="relative inline-flex h-3.5 w-7 shrink-0 cursor-pointer items-center rounded-full transition-colors"
                                              style={{ backgroundColor: option.enabled ? (isOverdose ? '#dc2626' : '#10b981') : 'var(--color-gray-400)' }}
                                              onClick={() => toggleHealthFilter(option.key)}
                                            >
                                              <span
                                                className="pointer-events-none absolute left-0.5 top-0.5 h-2.5 w-2.5 rounded-full bg-white shadow transition-transform"
                                                style={{ transform: option.enabled ? 'translateX(12px)' : 'translateX(0)' }}
                                              />
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    }

                    // Regular layer rendering (STL layers)
                    return (
                      <div
                        key={layer.id}
                        className="rounded-lg border transition-colors px-2.5 py-2 flex items-center justify-between gap-2"
                        style={{
                          borderColor: layerStates[layer.id] ? 'var(--color-blue-500)' : 'var(--color-gray-600)',
                          backgroundColor: layerStates[layer.id] ? 'rgba(59, 130, 246, 0.35)' : 'rgba(26, 29, 34, 0.15)',
                        }}
                      >
                        <span className="text-[13px] font-medium leading-tight truncate" style={{ color: 'var(--color-gray-100)' }}>
                          {layer.name}
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={layerStates[layer.id] || false}
                          aria-label={`Toggle ${layer.name}`}
                          className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors scale-85"
                          style={{ backgroundColor: layerStates[layer.id] ? 'var(--color-blue-600)' : 'var(--color-gray-300)' }}
                          onClick={() => toggleLayer(layer.id)}
                        >
                          <span
                            className="pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
                            style={{ transform: layerStates[layer.id] ? 'translateX(16px)' : 'translateX(0)' }}
                          />
                        </button>
                      </div>
                    )
                  })}

                  {/* Neighborhood Boundaries (only for Baltimore 311 Service Requests, after all buckets) */}
                  {category.id === 'requests' && selectedCity === 'baltimore' && Object.keys(baltimore311Types).length > 0 && (
                    <>
                      <div className="mt-4 pt-3 border-t" style={{ borderColor: 'var(--color-gray-700)' }}>
                        <div className="text-[11px] font-semibold mb-2 opacity-60" style={{ color: 'var(--color-gray-300)' }}>
                          NEIGHBORHOOD BOUNDARIES
                        </div>

                        {/* Show Affected Neighborhoods */}
                        <div
                          className="rounded-lg border px-2.5 py-2 flex items-center justify-between gap-2 transition-colors mb-2"
                          style={{
                            borderColor: baltimoreNeighborhoodsAffected ? 'rgba(59,130,246,0.5)' : 'var(--color-gray-600)',
                            backgroundColor: baltimoreNeighborhoodsAffected ? 'rgba(59,130,246,0.12)' : 'transparent',
                            opacity: hasAny311TypeEnabled ? 1 : 0.4,
                            cursor: hasAny311TypeEnabled ? 'pointer' : 'not-allowed',
                          }}
                          onClick={() => {
                            if (hasAny311TypeEnabled) {
                              setBaltimoreNeighborhoodsAffected(!baltimoreNeighborhoodsAffected)
                              if (!baltimoreNeighborhoodsAffected && baltimoreNeighborhoodsAll) {
                                setBaltimoreNeighborhoodsAll(false)
                              }
                            }
                          }}
                        >
                          <span className="text-[12px] font-medium leading-tight" style={{ color: 'var(--color-gray-200)' }}>
                            Show Affected Neighborhoods
                          </span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={baltimoreNeighborhoodsAffected}
                            aria-label="Show neighborhoods with open 311 requests"
                            disabled={!hasAny311TypeEnabled}
                            className="relative inline-flex h-4 w-8 shrink-0 cursor-pointer items-center rounded-full transition-colors"
                            style={{ backgroundColor: baltimoreNeighborhoodsAffected ? '#3b82f6' : 'var(--color-gray-400)' }}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (hasAny311TypeEnabled) {
                                setBaltimoreNeighborhoodsAffected(!baltimoreNeighborhoodsAffected)
                                if (!baltimoreNeighborhoodsAffected && baltimoreNeighborhoodsAll) {
                                  setBaltimoreNeighborhoodsAll(false)
                                }
                              }
                            }}
                          >
                            <span
                              className="pointer-events-none absolute left-0.5 top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform"
                              style={{ transform: baltimoreNeighborhoodsAffected ? 'translateX(14px)' : 'translateX(0)' }}
                            />
                          </button>
                        </div>

                        {/* Show All Neighborhoods */}
                        <div
                          className="rounded-lg border px-2.5 py-2 flex items-center justify-between gap-2 transition-colors mb-2"
                          style={{
                            borderColor: baltimoreNeighborhoodsAll ? 'rgba(59,130,246,0.5)' : 'var(--color-gray-600)',
                            backgroundColor: baltimoreNeighborhoodsAll ? 'rgba(59,130,246,0.12)' : 'transparent',
                            opacity: hasAny311TypeEnabled ? 1 : 0.4,
                            cursor: hasAny311TypeEnabled ? 'pointer' : 'not-allowed',
                          }}
                          onClick={() => {
                            if (hasAny311TypeEnabled) {
                              setBaltimoreNeighborhoodsAll(!baltimoreNeighborhoodsAll)
                              if (!baltimoreNeighborhoodsAll && baltimoreNeighborhoodsAffected) {
                                setBaltimoreNeighborhoodsAffected(false)
                              }
                            }
                          }}
                        >
                          <span className="text-[12px] font-medium leading-tight" style={{ color: 'var(--color-gray-200)' }}>
                            Show All Neighborhoods
                          </span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={baltimoreNeighborhoodsAll}
                            aria-label="Show all neighborhoods"
                            disabled={!hasAny311TypeEnabled}
                            className="relative inline-flex h-4 w-8 shrink-0 cursor-pointer items-center rounded-full transition-colors"
                            style={{ backgroundColor: baltimoreNeighborhoodsAll ? '#3b82f6' : 'var(--color-gray-400)' }}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (hasAny311TypeEnabled) {
                                setBaltimoreNeighborhoodsAll(!baltimoreNeighborhoodsAll)
                                if (!baltimoreNeighborhoodsAll && baltimoreNeighborhoodsAffected) {
                                  setBaltimoreNeighborhoodsAffected(false)
                                }
                              }
                            }}
                          >
                            <span
                              className="pointer-events-none absolute left-0.5 top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform"
                              style={{ transform: baltimoreNeighborhoodsAll ? 'translateX(14px)' : 'translateX(0)' }}
                            />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {expandedCategories[category.id] && category.layers.length === 0 && (
                <p className="text-xs px-4 py-2 ml-4" style={{ color: 'var(--color-gray-500)' }}>
                  No layers available yet.
                </p>
              )}
            </div>
          ))}

          {/* Color Configuration Accordions */}
          {selectedCity === 'baltimore' && (
            <div className="space-y-2 mt-4 pt-4 border-t" style={{ borderColor: 'var(--color-gray-700)' }}>
              {/* MapLibre Colors */}
              <div>
                <div
                  className="flex items-center justify-between py-1.5 px-2.5 rounded-lg border min-h-[36px] cursor-pointer"
                  style={{
                    borderColor: 'var(--color-gray-600)',
                    backgroundColor: 'rgba(31, 41, 55, 0.95)',
                  }}
                  onClick={() => setExpandedCategories(prev => ({ ...prev, maplibreColors: !prev.maplibreColors }))}
                >
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <div className="w-4 h-4 flex items-center justify-center shrink-0" style={{ color: 'var(--color-gray-400)' }}>
                      {expandedCategories.maplibreColors ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </div>
                    <span className="text-[13px] font-medium leading-tight truncate" style={{ color: 'var(--color-gray-200)' }}>
                      MapLibre Colors
                    </span>
                  </div>
                </div>
                
                {expandedCategories.maplibreColors && (
                  <div className="space-y-2 mt-2 ml-4">
                    <div className="flex items-center justify-between py-1.5 px-2 rounded-md" style={{ backgroundColor: 'rgba(26, 29, 34, 0.15)' }}>
                      <span className="text-[11px]" style={{ color: 'var(--color-gray-400)' }}>Point Color</span>
                      <input
                        type="color"
                        value={mapLibreColors.pointColor}
                        onChange={(e) => setMapLibreColors({ ...mapLibreColors, pointColor: e.target.value })}
                        className="w-8 h-6 rounded cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center justify-between py-1.5 px-2 rounded-md" style={{ backgroundColor: 'rgba(26, 29, 34, 0.15)' }}>
                      <span className="text-[11px]" style={{ color: 'var(--color-gray-400)' }}>Cluster Small (&lt;50)</span>
                      <input
                        type="color"
                        value={mapLibreColors.clusterSmall}
                        onChange={(e) => setMapLibreColors({ ...mapLibreColors, clusterSmall: e.target.value })}
                        className="w-8 h-6 rounded cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center justify-between py-1.5 px-2 rounded-md" style={{ backgroundColor: 'rgba(26, 29, 34, 0.15)' }}>
                      <span className="text-[11px]" style={{ color: 'var(--color-gray-400)' }}>Cluster Medium (50-200)</span>
                      <input
                        type="color"
                        value={mapLibreColors.clusterMedium}
                        onChange={(e) => setMapLibreColors({ ...mapLibreColors, clusterMedium: e.target.value })}
                        className="w-8 h-6 rounded cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center justify-between py-1.5 px-2 rounded-md" style={{ backgroundColor: 'rgba(26, 29, 34, 0.15)' }}>
                      <span className="text-[11px]" style={{ color: 'var(--color-gray-400)' }}>Cluster Large (&gt;200)</span>
                      <input
                        type="color"
                        value={mapLibreColors.clusterLarge}
                        onChange={(e) => setMapLibreColors({ ...mapLibreColors, clusterLarge: e.target.value })}
                        className="w-8 h-6 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Mapbox Colors */}
              <div>
                <div
                  className="flex items-center justify-between py-1.5 px-2.5 rounded-lg border min-h-[36px] cursor-pointer"
                  style={{
                    borderColor: 'var(--color-gray-600)',
                    backgroundColor: 'rgba(31, 41, 55, 0.95)',
                  }}
                  onClick={() => setExpandedCategories(prev => ({ ...prev, mapboxColors: !prev.mapboxColors }))}
                >
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <div className="w-4 h-4 flex items-center justify-center shrink-0" style={{ color: 'var(--color-gray-400)' }}>
                      {expandedCategories.mapboxColors ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </div>
                    <span className="text-[13px] font-medium leading-tight truncate" style={{ color: 'var(--color-gray-200)' }}>
                      Mapbox Colors
                    </span>
                  </div>
                </div>
                
                {expandedCategories.mapboxColors && (
                  <div className="space-y-2 mt-2 ml-4">
                    <div className="flex items-center justify-between py-1.5 px-2 rounded-md" style={{ backgroundColor: 'rgba(26, 29, 34, 0.15)' }}>
                      <span className="text-[11px]" style={{ color: 'var(--color-gray-400)' }}>Point Color</span>
                      <input
                        type="color"
                        value={mapboxColors.pointColor}
                        onChange={(e) => setMapboxColors({ ...mapboxColors, pointColor: e.target.value })}
                        className="w-8 h-6 rounded cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center justify-between py-1.5 px-2 rounded-md" style={{ backgroundColor: 'rgba(26, 29, 34, 0.15)' }}>
                      <span className="text-[11px]" style={{ color: 'var(--color-gray-400)' }}>Cluster Small (&lt;50)</span>
                      <input
                        type="color"
                        value={mapboxColors.clusterSmall}
                        onChange={(e) => setMapboxColors({ ...mapboxColors, clusterSmall: e.target.value })}
                        className="w-8 h-6 rounded cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center justify-between py-1.5 px-2 rounded-md" style={{ backgroundColor: 'rgba(26, 29, 34, 0.15)' }}>
                      <span className="text-[11px]" style={{ color: 'var(--color-gray-400)' }}>Cluster Medium (50-200)</span>
                      <input
                        type="color"
                        value={mapboxColors.clusterMedium}
                        onChange={(e) => setMapboxColors({ ...mapboxColors, clusterMedium: e.target.value })}
                        className="w-8 h-6 rounded cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center justify-between py-1.5 px-2 rounded-md" style={{ backgroundColor: 'rgba(26, 29, 34, 0.15)' }}>
                      <span className="text-[11px]" style={{ color: 'var(--color-gray-400)' }}>Cluster Large (&gt;200)</span>
                      <input
                        type="color"
                        value={mapboxColors.clusterLarge}
                        onChange={(e) => setMapboxColors({ ...mapboxColors, clusterLarge: e.target.value })}
                        className="w-8 h-6 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
