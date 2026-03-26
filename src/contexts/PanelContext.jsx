import { createContext, useContext, useState } from 'react'
import { sendChatMessage } from '../services/openai-chat'

const PanelContext = createContext()

export const usePanelContext = () => {
  const context = useContext(PanelContext)
  if (!context) {
    throw new Error('usePanelContext must be used within PanelProvider')
  }
  return context
}

export const PanelProvider = ({ children }) => {
  // Panel visibility
  const [copilotVisible, setCopilotVisible] = useState(false)
  const [layersVisible, setLayersVisible] = useState(false)

  // Navigation state
  const [currentView, setCurrentView] = useState('map') // 'map' | 'performance' | 'work-orders' | 'risk' | 'economic' | 'capital'
  const [mapFocusRequest, setMapFocusRequest] = useState(null)
  const [mapPopupRequest, setMapPopupRequest] = useState(null)

  // Copilot / AI chat state
  const [activeTab, setActiveTab] = useState('chat')
  const [chatMessages, setChatMessages] = useState([])
  const [isAiResponding, setIsAiResponding] = useState(false)
  const [aiError, setAiError] = useState(null)

  // Success notifications
  const [successNotifications, setSuccessNotifications] = useState([])

  const addSuccessNotification = (message) => {
    const notification = { id: Date.now(), message, timestamp: new Date() }
    setSuccessNotifications(prev => [...prev, notification])
  }

  const removeSuccessNotification = (id) => {
    setSuccessNotifications(prev => prev.filter(n => n.id !== id))
  }

  // City selection ('stl' | 'baltimore' | 'howard')
  const [selectedCity, setSelectedCity] = useState('baltimore')

  // Map engine selection ('maplibre' | 'mapbox')
  const [mapEngine, setMapEngine] = useState('maplibre')

  // Map engine-specific color schemes for 311 layers
  const [mapLibreColors, setMapLibreColors] = useState({
    pointColor: '#f97316',           // Orange for individual points
    clusterSmall: '#f97316',         // Orange for clusters <50
    clusterMedium: '#ef4444',        // Red for clusters 50-200
    clusterLarge: '#b91c1c',         // Dark red for clusters >200
  })
  
  const [mapboxColors, setMapboxColors] = useState({
    pointColor: '#f97316',           // Orange for individual points
    clusterSmall: '#f97316',         // Orange for clusters <50
    clusterMedium: '#ef4444',        // Red for clusters 50-200
    clusterLarge: '#b91c1c',         // Dark red for clusters >200
  })

  // Date selection (full date for filtering 311 data and calculating 30-day metrics)
  const [selectedDate, setSelectedDate] = useState(new Date('2025-05-09')) // Default to May 9th, 2025
  const [selectedYear, setSelectedYear] = useState(2025) // Updated to match default date

  // Map layer visibility
  const [neighborhoodsRiskVisible, setNeighborhoodsRiskVisible] = useState(false)
  const [baltimoreNeighborhoodsData, setBaltimoreNeighborhoodsData] = useState(null) // Store fetched neighborhood GeoJSON
  const [baltimoreNeighborhoodsAffected, setBaltimoreNeighborhoodsAffected] = useState(true) // Show affected neighborhoods by default
  const [baltimoreNeighborhoodsAll, setBaltimoreNeighborhoodsAll] = useState(false) // Show all neighborhoods
  const [baltimore311Visible, setBaltimore311Visible] = useState(true) // Auto-show 311 data by default
  const [baltimore311Style, setBaltimore311Style] = useState('default') // 'default' | 'cluster' | 'heatmap'
  const [baltimore311Clustered, setBaltimore311Clustered] = useState(false)
  const [baltimore311HideClosed, setBaltimore311HideClosed] = useState(true) // Hide closed requests by default
  const [baltimore311Types, setBaltimore311Types] = useState({}) // { 'Potholes': true, 'Graffiti': false, ... }
  const [baltimore311Data, setBaltimore311Data] = useState(null) // Full GeoJSON for the selected year
  const [baltimore311DataYear, setBaltimore311DataYear] = useState(null) // Track which year this data represents
  
  // Health data (overdose & naloxone)
  const [healthOverdoseVisible, setHealthOverdoseVisible] = useState(false)
  const [healthNaloxoneVisible, setHealthNaloxoneVisible] = useState(false)
  const [healthOverdoseData, setHealthOverdoseData] = useState(null) // GeoJSON for selected year
  const [healthNaloxoneData, setHealthNaloxoneData] = useState(null) // GeoJSON for selected year
  const [healthOverdoseFilters, setHealthOverdoseFilters] = useState({}) // { 'substance:Fentanyl': true, ... }
  const [healthNaloxoneFilters, setHealthNaloxoneFilters] = useState({}) // { 'locationType:Pharmacy': true, ... }
  const [healthDataYear, setHealthDataYear] = useState(null) // Track which year this data represents
  
  // Heatmap configuration
  const [heatmapConfig, setHeatmapConfig] = useState({
    weight: 1,
    intensityMin: 1,
    intensityMax: 3,
    radiusMin: 2,
    radiusMax: 20,
    opacity: 1,
  })

  // Intelligence tab
  const [intelligenceItems, setIntelligenceItems] = useState([])
  const [hasUnreadIntelligence, setHasUnreadIntelligence] = useState(false)

  // Action panel (Alerts, Forecasting, Permits)
  const [activeActionTab, setActiveActionTab] = useState(null) // 'alerts' | 'forecasting' | 'permits' | null
  const [actionTabAnchor, setActionTabAnchor] = useState(null) // viewport rect for active action button
  const [neighborhoodAlerts, setNeighborhoodAlerts] = useState(null) // Alert data grouped by severity
  
  // Forecasting data
  const [potholeForecasts, setPotholeForecasts] = useState(null) // Pothole forecast data

  // Work orders (imported/adapted from leakage prototype patterns)
  const [workOrders, setWorkOrders] = useState([])

  const addIntelligenceItem = (item) => {
    setIntelligenceItems(prev => [...prev, { ...item, id: Date.now(), timestamp: new Date() }])
    setHasUnreadIntelligence(true)
  }

  const clearIntelligenceNotification = () => setHasUnreadIntelligence(false)

  const createWorkOrder = (workOrderData) => {
    const uniqueSuffix = Math.random().toString(36).slice(2, 7).toUpperCase()
    const newWorkOrder = {
      id: `WO-${Date.now()}-${uniqueSuffix}`,
      status: 'New',
      priority: 'Medium',
      createdAt: new Date().toISOString(),
      ...workOrderData,
    }
    setWorkOrders((prev) => [newWorkOrder, ...prev])
    return newWorkOrder
  }

  const requestMapFocus = ({ lng, lat, zoom = 15 }) => {
    if (typeof lng !== 'number' || typeof lat !== 'number') return
    setMapFocusRequest({ lng, lat, zoom, timestamp: Date.now() })
  }

  const requestMapPopup = ({ lng, lat, properties }) => {
    if (typeof lng !== 'number' || typeof lat !== 'number') return
    setMapPopupRequest({ lng, lat, properties: properties || {}, timestamp: Date.now() })
  }

  // Panel toggles
  const toggleCopilot = () => setCopilotVisible(prev => !prev)
  const toggleLayers = () => setLayersVisible(prev => !prev)

  // AI chat actions
  const clearChat = () => setChatMessages([])

  const deleteMessage = (messageId) => {
    setChatMessages(prev => prev.filter(msg => msg.id !== messageId))
  }

  const sendUserMessage = async (messageText) => {
    if (!messageText.trim()) return

    setAiError(null)

    const userMessage = {
      id: Date.now(),
      type: 'user-message',
      message: messageText.trim(),
      timestamp: new Date(),
    }
    setChatMessages(prev => [...prev, userMessage])
    setIsAiResponding(true)

    try {
      const allMessages = [...chatMessages, userMessage]
      const aiResponse = await sendChatMessage(allMessages, {})

      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai-message',
        message: aiResponse,
        timestamp: new Date(),
      }
      setChatMessages(prev => [...prev, aiMessage])
    } catch (error) {
      console.error('AI Chat Error:', error)
      setAiError(error.message || 'Failed to get AI response. Please try again.')
    } finally {
      setIsAiResponding(false)
    }
  }

  const value = {
    // Panel visibility
    copilotVisible,
    setCopilotVisible,
    toggleCopilot,
    layersVisible,
    setLayersVisible,
    toggleLayers,
    // Navigation
    currentView,
    setCurrentView,
    mapFocusRequest,
    setMapFocusRequest,
    requestMapFocus,
    mapPopupRequest,
    setMapPopupRequest,
    requestMapPopup,

    // City
    selectedCity,
    setSelectedCity,

    // Map engine
    mapEngine,
    setMapEngine,

    // Date & Year
    selectedDate,
    setSelectedDate,
    selectedYear,
    setSelectedYear,

    // Map layers
    neighborhoodsRiskVisible,
    setNeighborhoodsRiskVisible,
    baltimoreNeighborhoodsData,
    setBaltimoreNeighborhoodsData,
    baltimoreNeighborhoodsAffected,
    setBaltimoreNeighborhoodsAffected,
    baltimoreNeighborhoodsAll,
    setBaltimoreNeighborhoodsAll,
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
    setBaltimore311Data,
    baltimore311DataYear,
    setBaltimore311DataYear,
    
    // Map engine colors
    mapLibreColors,
    setMapLibreColors,
    mapboxColors,
    setMapboxColors,
    
    // Health data
    healthOverdoseVisible,
    setHealthOverdoseVisible,
    healthNaloxoneVisible,
    setHealthNaloxoneVisible,
    healthOverdoseData,
    setHealthOverdoseData,
    healthNaloxoneData,
    setHealthNaloxoneData,
    healthOverdoseFilters,
    setHealthOverdoseFilters,
    healthNaloxoneFilters,
    setHealthNaloxoneFilters,
    healthDataYear,
    setHealthDataYear,
    
    heatmapConfig,
    setHeatmapConfig,

    // AI chat
    activeTab,
    setActiveTab,
    chatMessages,
    setChatMessages,
    clearChat,
    deleteMessage,
    sendUserMessage,
    isAiResponding,
    setIsAiResponding,
    aiError,
    setAiError,

    // Intelligence
    intelligenceItems,
    addIntelligenceItem,
    hasUnreadIntelligence,
    clearIntelligenceNotification,

    // Action panel
    activeActionTab,
    setActiveActionTab,
    actionTabAnchor,
    setActionTabAnchor,
    neighborhoodAlerts,
    setNeighborhoodAlerts,
    
    // Forecasting
    potholeForecasts,
    setPotholeForecasts,

    // Work orders
    workOrders,
    setWorkOrders,
    createWorkOrder,

    // Notifications
    successNotifications,
    addSuccessNotification,
    removeSuccessNotification,
  }

  return <PanelContext.Provider value={value}>{children}</PanelContext.Provider>
}
