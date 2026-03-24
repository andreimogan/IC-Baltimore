import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { getNeighborhoodRiskData } from '../data/neighborhoodRiskData'
import { usePanelContext } from '../contexts/PanelContext'
import HeatmapLegend from './HeatmapLegend'
import overdoseData from '../data/baltimoreOverdoseData'
import naloxoneData from '../data/baltimoreNaloxoneData'
import { calculateNeighborhood311Density, getNeighborhoodColorExpression, getNeighborhoodBorderExpression } from '../utils/neighborhoodDensity'
import { getViewPreset } from '../config/viewPresets'
import { getTopNeighborhoods } from '../utils/neighborhoodStats'
import NeighborhoodStatsCard from './NeighborhoodStatsCard'
import NeighborhoodPin from './NeighborhoodPin'

const MAPTILER_API_KEY = 'X1kjwlVN29N1UZItdixx'
const MAPBOX_TOKEN = 'pk.eyJ1IjoiYW5kcmVpbW9nYW4iLCJhIjoiY21uNDdoanI4MTgxcjJycGR4a2xxc3RyNSJ9.atvOuDPanicP6gd21D9ExQ'
const MAPBOX_STYLE = 'mapbox://styles/andreimogan/cmn47nl5v004t01r4db5b1npe?fresh=true'

// ArcGIS Feature Service URL pattern for Baltimore 311 by year
// Now accepts an optional endDate parameter to filter on the server side
const get311ServiceUrl = (year, endDate = null) => {
  let whereClause = '1%3D1' // Default: where 1=1 (all records)
  
  if (endDate) {
    // Filter on server side using ArcGIS DATE syntax
    // This ensures we only fetch relevant records instead of filtering client-side
    const endOfDay = new Date(endDate)
    endOfDay.setHours(23, 59, 59, 999)
    
    // Format: DATE 'YYYY-MM-DD HH:MM:SS'
    const yyyy = endOfDay.getFullYear()
    const mm = String(endOfDay.getMonth() + 1).padStart(2, '0')
    const dd = String(endOfDay.getDate()).padStart(2, '0')
    const dateStr = `${yyyy}-${mm}-${dd} 23:59:59`
    
    // URL encode: CreatedDate <= DATE 'YYYY-MM-DD 23:59:59'
    whereClause = `CreatedDate+%3C%3D+DATE+'${dateStr}'`
  }
  
  return `https://services1.arcgis.com/UWYHeuuJISiGmgXx/arcgis/rest/services/311_Customer_Service_Requests_${year}/FeatureServer/0/query` +
    `?where=${whereClause}&outFields=SRType,Agency,SRStatus,CreatedDate,CloseDate,Address,Neighborhood` +
    `&f=geojson&resultRecordCount=15000`
}

// Neighborhood boundary data: © City of St. Louis, provided by SLU OpenGIS (CC-BY-4.0)
// https://github.com/slu-openGIS/STL_BOUNDARY_Nhood
export default function MapView() {
  const { 
    selectedCity,
    mapEngine,
    mapLibreColors,
    mapboxColors,
    neighborhoodsRiskVisible, 
    baltimoreNeighborhoodsData,
    setBaltimoreNeighborhoodsData,
    baltimoreNeighborhoodsAffected,
    baltimoreNeighborhoodsAll,
    baltimore311Visible, 
    baltimore311Style, 
    baltimore311Clustered, 
    baltimore311HideClosed,
    baltimore311Types, 
    selectedYear, 
    selectedDate, 
    setBaltimore311Data, 
    setBaltimore311DataYear, 
    heatmapConfig,
    healthOverdoseVisible,
    healthNaloxoneVisible,
    healthOverdoseFilters,
    healthNaloxoneFilters,
    setHealthOverdoseData,
    setHealthNaloxoneData,
    setHealthDataYear,
  } = usePanelContext()
  const mapContainer = useRef(null)
  const map = useRef(null)
  const mapLib = useRef(null) // Store reference to the map library (maplibregl or mapboxgl)
  const neighborhoodMarkers = useRef([]) // Store { pin: Marker, card: Marker, name: string }
  const [mapLoaded, setMapLoaded] = useState(false)
  const [minimizedCards, setMinimizedCards] = useState({}) // Track which cards are minimized by neighborhood name
  const [currentEngine, setCurrentEngine] = useState(null) // Track which engine is currently loaded
  // Cache fetched 311 GeoJSON per year+date combination to avoid redundant requests
  // Key format: "YYYY-MM-DD" for specific dates, or "YYYY" for year-end
  const baltimore311Cache = useRef({})

  const cityConfig = {
    stl: { center: [-90.1994, 38.6270], zoom: 11 },
    baltimore: { center: [-76.6122, 39.2904], zoom: 11 },
    howard: { center: [-76.8758, 39.2037], zoom: 11 }, // Howard County, MD
  }

  // Get active color scheme based on current engine
  const getActiveColors = () => {
    return mapEngine === 'mapbox' ? mapboxColors : mapLibreColors
  }

  // Get map style URL based on engine
  const getMapStyle = (engine) => {
    if (engine === 'mapbox') {
      return MAPBOX_STYLE
    }
    return `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${MAPTILER_API_KEY}`
  }

  // Initialize/reinitialize map when engine changes
  useEffect(() => {
    const initMap = async () => {
      // Save current map state if switching engines
      let savedState = null
      if (map.current && currentEngine !== mapEngine) {
        savedState = {
          center: map.current.getCenter(),
          zoom: map.current.getZoom(),
        }
        map.current.remove()
        map.current = null
        setMapLoaded(false)
      }

      // Skip if map already exists with correct engine
      if (map.current && currentEngine === mapEngine) return

      // Get view preset for this city and engine
      const preset = getViewPreset(selectedCity, mapEngine)
      const cfg = cityConfig[selectedCity] || cityConfig.stl
      
      console.log('🎯 Map init - getting preset:', { selectedCity, mapEngine, preset, cfg })

      // Dynamic import based on engine
      let mapgl
      if (mapEngine === 'mapbox') {
        const mapboxModule = await import('mapbox-gl')
        await import('mapbox-gl/dist/mapbox-gl.css')
        mapgl = mapboxModule.default
        mapgl.accessToken = MAPBOX_TOKEN
      } else {
        mapgl = maplibregl
      }

      // Store library reference for popup creation
      mapLib.current = mapgl

      // Determine camera position:
      // - If we have a preset for this city+engine, use it (ignores saved state)
      // - Otherwise use saved state from engine switch
      // - Finally fall back to basic config
      const center = preset?.center || savedState?.center || cfg.center
      const zoom = preset?.zoom || savedState?.zoom || cfg.zoom
      const pitch = preset?.pitch ?? 0
      const bearing = preset?.bearing ?? 0

      console.log('🗺️ Initializing map:', { selectedCity, mapEngine, usingPreset: !!preset, center, zoom, pitch, bearing })

      map.current = new mapgl.Map({
        container: mapContainer.current,
        style: getMapStyle(mapEngine),
        center,
        zoom,
        pitch,
        bearing,
        minZoom: 8,
        maxZoom: 18,
        attributionControl: true,
        customAttribution: 'Neighborhood boundaries © City of St. Louis / SLU OpenGIS',
      })

      map.current.addControl(
        new mapgl.NavigationControl({ showCompass: false, showZoom: true, visualizePitch: false }),
        'top-right'
      )

      map.current.on('load', () => {
      // Find first symbol layer in the style (for proper layer ordering)
      const layers = map.current.getStyle().layers
      let firstSymbolId
      for (const layer of layers) {
        if (layer.type === 'symbol') {
          firstSymbolId = layer.id
          break
        }
      }

      // Helper function to force paint properties (override Mapbox style defaults)
      const forcePaintProperty = (layerId, property, value) => {
        if (map.current.getLayer(layerId)) {
          map.current.setPaintProperty(layerId, property, value)
        }
      }

      // Neighborhood risk polygons source + layers
      map.current.addSource('neighborhood-risk', {
        type: 'geojson',
        data: getNeighborhoodRiskData(),
      })

      map.current.addLayer({
        id: 'neighborhood-risk-fill',
        type: 'fill',
        source: 'neighborhood-risk',
        paint: {
          'fill-color': [
            'match', ['get', 'riskLevel'],
            'high',   'rgba(212, 51, 59, 0.4)',
            'medium', 'rgba(241, 167, 40, 0.4)',
            'low',    'rgba(127, 190, 72, 0.4)',
                      'rgba(158, 158, 158, 0.2)',
          ],
          'fill-opacity': 0.6,
        },
        layout: { visibility: 'none' },
      }, firstSymbolId)

      map.current.addLayer({
        id: 'neighborhood-risk-border',
        type: 'line',
        source: 'neighborhood-risk',
        paint: {
          'line-color': [
            'match', ['get', 'riskLevel'],
            'high',   'rgb(212, 51, 59)',
            'medium', 'rgb(241, 167, 40)',
            'low',    'rgb(127, 190, 72)',
                      'rgb(158, 158, 158)',
          ],
          'line-width': 2,
          'line-opacity': 0.8,
        },
        layout: { visibility: 'none' },
      }, firstSymbolId)

      // Baltimore neighborhood boundaries (loaded from server - no optimization)
      map.current.addSource('baltimore-neighborhoods', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      map.current.addLayer({
        id: 'baltimore-neighborhoods-fill',
        type: 'fill',
        source: 'baltimore-neighborhoods',
        paint: {
          'fill-color': 'rgba(59, 130, 246, 0.12)',
          'fill-opacity': 0.6,
        },
        layout: { visibility: 'none' },
      }, firstSymbolId)

      map.current.addLayer({
        id: 'baltimore-neighborhoods-border',
        type: 'line',
        source: 'baltimore-neighborhoods',
        paint: {
          'line-color': 'rgb(59, 130, 246)',
          'line-width': 1.5,
          'line-opacity': 0.9,
        },
        layout: { visibility: 'none' },
      }, firstSymbolId)

      map.current.addLayer({
        id: 'baltimore-neighborhoods-labels',
        type: 'symbol',
        source: 'baltimore-neighborhoods',
        layout: {
          'text-field': ['get', 'Name'],
          'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
          'text-size': 11,
          'text-max-width': 8,
          'visibility': 'none',
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(0,0,0,0.85)',
          'text-halo-width': 2.5,
          'text-opacity': 0.95,
        },
      }, firstSymbolId)

      // Baltimore 311 — source A: clustered
      map.current.addSource('baltimore-311-clustered', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      })

      // Baltimore 311 — source B: flat (all individual points)
      map.current.addSource('baltimore-311-flat', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      // Cluster circles
      const colors = getActiveColors()
      map.current.addLayer({
        id: 'baltimore-311-clusters',
        type: 'circle',
        source: 'baltimore-311-clustered',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step', ['get', 'point_count'],
            colors.clusterSmall, 50, colors.clusterMedium, 200, colors.clusterLarge,
          ],
          'circle-radius': [
            'step', ['get', 'point_count'],
            18, 50, 26, 200, 34,
          ],
          'circle-opacity': 0.85,
          'circle-stroke-width': 2,
          'circle-stroke-color': 'rgba(255,255,255,0.25)',
          'circle-stroke-opacity': 1,
          'circle-pitch-alignment': 'viewport',
          'circle-pitch-scale': 'viewport',
        },
        layout: { visibility: 'none' },
      }, firstSymbolId)

      // Cluster count labels
      map.current.addLayer({
        id: 'baltimore-311-cluster-count',
        type: 'symbol',
        source: 'baltimore-311-clustered',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 12,
          'visibility': 'none',
        },
        paint: { 
          'text-color': '#ffffff',
          'text-opacity': 1,
        },
      }, firstSymbolId)

      // Unclustered points (from clustered source — points outside any cluster)
      map.current.addLayer({
        id: 'baltimore-311-unclustered',
        type: 'circle',
        source: 'baltimore-311-clustered',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': 5,
          'circle-color': colors.pointColor,
          'circle-opacity': 0.9,
          'circle-stroke-width': 1,
          'circle-stroke-color': 'rgba(255,255,255,0.4)',
          'circle-stroke-opacity': 1,
          'circle-pitch-alignment': 'viewport',
          'circle-pitch-scale': 'viewport',
        },
        layout: { visibility: 'none' },
      }, firstSymbolId)

      // Flat points (from non-clustered source — all points individually)
      map.current.addLayer({
        id: 'baltimore-311-points',
        type: 'circle',
        source: 'baltimore-311-flat',
        paint: {
          'circle-radius': 4,
          'circle-color': colors.pointColor,
          'circle-opacity': 0.8,
          'circle-stroke-width': 1,
          'circle-stroke-color': 'rgba(255,255,255,0.25)',
          'circle-stroke-opacity': 1,
          'circle-pitch-alignment': 'viewport',
          'circle-pitch-scale': 'viewport',
        },
        layout: { visibility: 'none' },
      }, firstSymbolId)

      // Heatmap layer (density visualization)
      map.current.addLayer({
        id: 'baltimore-311-heatmap',
        type: 'heatmap',
        source: 'baltimore-311-flat',
        maxzoom: 15,
        paint: {
          'heatmap-weight': heatmapConfig.weight,
          'heatmap-intensity': [
            'interpolate', ['linear'], ['zoom'],
            0, heatmapConfig.intensityMin,
            15, heatmapConfig.intensityMax,
          ],
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0, 'rgba(255,255,255,0)',
            0.2, 'rgba(150,100,180,0.6)',
            0.4, 'rgba(180,80,140,0.7)',
            0.6, 'rgba(220,50,80,0.8)',
            0.8, 'rgba(240,100,50,0.9)',
            1, 'rgba(255,220,50,1)',
          ],
          'heatmap-radius': [
            'interpolate', ['linear'], ['zoom'],
            0, heatmapConfig.radiusMin,
            15, heatmapConfig.radiusMax,
          ],
          'heatmap-opacity': [
            'interpolate', ['linear'], ['zoom'],
            14, heatmapConfig.opacity,
            15, 0,
          ],
        },
        layout: { visibility: 'none' },
      }, firstSymbolId)

      // Heatmap circle layer (shows individual points at high zoom)
      map.current.addLayer({
        id: 'baltimore-311-heatmap-points',
        type: 'circle',
        source: 'baltimore-311-flat',
        minzoom: 14,
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            14, 2,
            16, 4,
          ],
          'circle-color': colors.pointColor,
          'circle-opacity': [
            'interpolate', ['linear'], ['zoom'],
            14, 0,
            15, 0.8,
          ],
          'circle-stroke-width': 1,
          'circle-stroke-color': 'rgba(255,255,255,0.25)',
          'circle-stroke-opacity': 1,
          'circle-pitch-alignment': 'viewport',
          'circle-pitch-scale': 'viewport',
        },
        layout: { visibility: 'none' },
      }, firstSymbolId)

      // Click cluster → zoom to expand
      map.current.on('click', 'baltimore-311-clusters', async (e) => {
        const features = map.current.queryRenderedFeatures(e.point, { layers: ['baltimore-311-clusters'] })
        if (!features.length) return
        const clusterId = features[0].properties.cluster_id
        const zoom = await map.current.getSource('baltimore-311-clustered').getClusterExpansionZoom(clusterId)
        map.current.easeTo({ center: features[0].geometry.coordinates, zoom })
      })

      // Shared popup for unclustered + flat point clicks
      const showPointPopup = (e) => {
        const feature = e.features[0]
        const coords = feature.geometry.coordinates.slice()
        const { SRType, Address, SRStatus, CreatedDate, CloseDate, Agency, Neighborhood } = feature.properties
        
        // Calculate historical status based on selectedDate
        const asOfDate = new Date(selectedDate)
        asOfDate.setHours(23, 59, 59, 999)
        const asOfTime = asOfDate.getTime()
        
        let historicalStatus = 'Open' // Default
        if (CloseDate && CloseDate <= asOfTime) {
          historicalStatus = 'Closed'
        }
        
        while (Math.abs(e.lngLat.lng - coords[0]) > 180) {
          coords[0] += e.lngLat.lng > coords[0] ? 360 : -360
        }
        new mapLib.current.Popup({ closeButton: true, maxWidth: '280px', className: 'popup-311' })
          .setLngLat(coords)
          .setHTML(`
            <div style="font-size:13px;line-height:1.5;color:rgba(255,255,255,0.9);min-width:200px">
              <div style="font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:6px">311 Service Request</div>
              <div style="font-weight:600;font-size:14px;color:#fff;margin-bottom:6px;line-height:1.3">${SRType || 'Service Request'}</div>
              ${Address ? `
                <div style="color:rgba(255,255,255,0.6);font-size:12px;margin-bottom:2px">${Address}${Neighborhood ? `<span style="color:rgba(255,255,255,0.35)"> · ${Neighborhood}</span>` : ''}</div>
              ` : ''}
              ${Agency ? `
                <div style="color:rgba(255,255,255,0.4);font-size:12px;margin-bottom:6px">${Agency}</div>
              ` : ''}
              <div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.08)">
                <span style="
                  display:inline-flex;align-items:center;gap:4px;
                  padding:2px 8px;border-radius:5px;font-size:11px;font-weight:500;
                  background:${historicalStatus === 'Open' ? 'rgba(249,115,22,0.15)' : 'rgba(127,190,72,0.15)'};
                  color:${historicalStatus === 'Open' ? '#fb923c' : '#86efac'};
                  border:1px solid ${historicalStatus === 'Open' ? 'rgba(249,115,22,0.35)' : 'rgba(127,190,72,0.35)'};
                ">
                  <span style="width:5px;height:5px;border-radius:50%;background:currentColor;display:inline-block"></span>
                  ${historicalStatus}
                </span>
              </div>
            </div>
          `)
          .addTo(map.current)
      }
      map.current.on('click', 'baltimore-311-unclustered', showPointPopup)
      map.current.on('click', 'baltimore-311-points', showPointPopup)
      map.current.on('click', 'baltimore-311-heatmap-points', showPointPopup)

      // Pointer cursor on hover
      ;['baltimore-311-clusters', 'baltimore-311-unclustered', 'baltimore-311-points', 'baltimore-311-heatmap-points'].forEach((id) => {
        map.current.on('mouseenter', id, () => { map.current.getCanvas().style.cursor = 'pointer' })
        map.current.on('mouseleave', id, () => { map.current.getCanvas().style.cursor = '' })
      })

      // ========== HEALTH DATA LAYERS ==========
      
      // Overdose incidents source
      map.current.addSource('health-overdose', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      // Overdose incidents layer (color-coded by outcome)
      map.current.addLayer({
        id: 'health-overdose-points',
        type: 'circle',
        source: 'health-overdose',
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            10, 3,
            14, 6,
            16, 9,
          ],
          'circle-color': [
            'match', ['get', 'outcome'],
            'Fatal', '#dc2626',
            'Hospitalized', '#f97316',
            'Survived', '#fbbf24',
            '#9ca3af',
          ],
          'circle-opacity': 0.85,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': 'rgba(255,255,255,0.4)',
          'circle-stroke-opacity': 1,
        },
        layout: { visibility: 'none' },
      }, firstSymbolId)

      // Naloxone distribution source
      map.current.addSource('health-naloxone', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      // Naloxone distribution layer (sized by kits distributed)
      map.current.addLayer({
        id: 'health-naloxone-points',
        type: 'circle',
        source: 'health-naloxone',
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['get', 'kitsDistributed'],
            0, 5,
            100, 8,
            300, 12,
            500, 16,
          ],
          'circle-color': '#10b981',
          'circle-opacity': 0.75,
          'circle-stroke-width': 2,
          'circle-stroke-color': 'rgba(255,255,255,0.5)',
          'circle-stroke-opacity': 1,
        },
        layout: { visibility: 'none' },
      }, firstSymbolId)

      // Overdose popup
      const showOverdosePopup = (e) => {
        const feature = e.features[0]
        const coords = feature.geometry.coordinates.slice()
        const { incidentDate, substance, outcome, ageGroup, race, sex, naloxoneAdministered, responseTime, neighborhood } = feature.properties
        
        const date = new Date(incidentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        
        while (Math.abs(e.lngLat.lng - coords[0]) > 180) {
          coords[0] += e.lngLat.lng > coords[0] ? 360 : -360
        }
        
        new mapLib.current.Popup({ closeButton: true, maxWidth: '280px', className: 'popup-health' })
          .setLngLat(coords)
          .setHTML(`
            <div style="font-size:13px;line-height:1.5;color:rgba(255,255,255,0.9);min-width:220px">
              <div style="font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:6px">Overdose Incident</div>
              <div style="font-weight:600;font-size:14px;color:#fff;margin-bottom:6px;line-height:1.3">${substance}</div>
              <div style="color:rgba(255,255,255,0.6);font-size:12px;margin-bottom:4px">${date}${neighborhood ? ` · ${neighborhood}` : ''}</div>
              
              <div style="margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px">
                <div>
                  <div style="color:rgba(255,255,255,0.4);margin-bottom:2px">Demographics</div>
                  <div style="color:rgba(255,255,255,0.8)">${sex}, ${ageGroup}</div>
                  <div style="color:rgba(255,255,255,0.6);font-size:10px">${race}</div>
                </div>
                <div>
                  <div style="color:rgba(255,255,255,0.4);margin-bottom:2px">Response</div>
                  <div style="color:rgba(255,255,255,0.8)">${responseTime}</div>
                  <div style="color:rgba(255,255,255,0.6);font-size:10px">${naloxoneAdministered ? 'Naloxone given' : 'No naloxone'}</div>
                </div>
              </div>
              
              <div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.08)">
                <span style="
                  display:inline-flex;align-items:center;gap:4px;
                  padding:2px 8px;border-radius:5px;font-size:11px;font-weight:500;
                  background:${outcome === 'Fatal' ? 'rgba(220,38,38,0.15)' : outcome === 'Hospitalized' ? 'rgba(249,115,22,0.15)' : 'rgba(251,191,36,0.15)'};
                  color:${outcome === 'Fatal' ? '#fca5a5' : outcome === 'Hospitalized' ? '#fb923c' : '#fde047'};
                  border:1px solid ${outcome === 'Fatal' ? 'rgba(220,38,38,0.35)' : outcome === 'Hospitalized' ? 'rgba(249,115,22,0.35)' : 'rgba(251,191,36,0.35)'};
                ">
                  <span style="width:5px;height:5px;border-radius:50%;background:currentColor;display:inline-block"></span>
                  ${outcome}
                </span>
              </div>
            </div>
          `)
          .addTo(map.current)
      }
      map.current.on('click', 'health-overdose-points', showOverdosePopup)

      // Naloxone popup
      const showNaloxonePopup = (e) => {
        const feature = e.features[0]
        const coords = feature.geometry.coordinates.slice()
        const { distributionDate, locationType, locationName, kitsDistributed, organizationName, recurring, neighborhood } = feature.properties
        
        const date = new Date(distributionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        
        while (Math.abs(e.lngLat.lng - coords[0]) > 180) {
          coords[0] += e.lngLat.lng > coords[0] ? 360 : -360
        }
        
        new mapLib.current.Popup({ closeButton: true, maxWidth: '280px', className: 'popup-health' })
          .setLngLat(coords)
          .setHTML(`
            <div style="font-size:13px;line-height:1.5;color:rgba(255,255,255,0.9);min-width:220px">
              <div style="font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:6px">Naloxone Distribution</div>
              <div style="font-weight:600;font-size:14px;color:#fff;margin-bottom:6px;line-height:1.3">${locationName}</div>
              <div style="color:rgba(255,255,255,0.6);font-size:12px;margin-bottom:4px">${date}${neighborhood ? ` · ${neighborhood}` : ''}</div>
              
              <div style="margin-top:8px;font-size:11px">
                <div style="margin-bottom:6px">
                  <span style="color:rgba(255,255,255,0.4)">Organization: </span>
                  <span style="color:rgba(255,255,255,0.8)">${organizationName}</span>
                </div>
                <div style="margin-bottom:6px">
                  <span style="color:rgba(255,255,255,0.4)">Location Type: </span>
                  <span style="color:rgba(255,255,255,0.8)">${locationType}</span>
                </div>
                <div>
                  <span style="color:rgba(255,255,255,0.4)">Kits Distributed: </span>
                  <span style="color:#10b981;font-weight:600">${kitsDistributed}</span>
                </div>
              </div>
              
              ${recurring ? `
                <div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.08)">
                  <span style="
                    display:inline-flex;align-items:center;gap:4px;
                    padding:2px 8px;border-radius:5px;font-size:11px;font-weight:500;
                    background:rgba(16,185,129,0.15);
                    color:#34d399;
                    border:1px solid rgba(16,185,129,0.35);
                  ">
                    <span style="width:5px;height:5px;border-radius:50%;background:currentColor;display:inline-block"></span>
                    Recurring Site
                  </span>
                </div>
              ` : ''}
            </div>
          `)
          .addTo(map.current)
      }
      map.current.on('click', 'health-naloxone-points', showNaloxonePopup)

      // Pointer cursor for health layers
      ;['health-overdose-points', 'health-naloxone-points'].forEach((id) => {
        map.current.on('mouseenter', id, () => { map.current.getCanvas().style.cursor = 'pointer' })
        map.current.on('mouseleave', id, () => { map.current.getCanvas().style.cursor = '' })
      })

      // FORCE PAINT PROPERTIES (override any Mapbox style defaults)
      // This ensures our custom colors are preserved regardless of the basemap style
      setTimeout(() => {
        const colors = getActiveColors()
        
        // 311 Clusters
        forcePaintProperty('baltimore-311-clusters', 'circle-color', [
          'step', ['get', 'point_count'],
          colors.clusterSmall, 50, colors.clusterMedium, 200, colors.clusterLarge,
        ])
        forcePaintProperty('baltimore-311-clusters', 'circle-stroke-color', 'rgba(255,255,255,0.25)')
        forcePaintProperty('baltimore-311-clusters', 'circle-opacity', 0.85)
        
        // 311 Unclustered points
        forcePaintProperty('baltimore-311-unclustered', 'circle-color', colors.pointColor)
        forcePaintProperty('baltimore-311-unclustered', 'circle-stroke-color', 'rgba(255,255,255,0.4)')
        forcePaintProperty('baltimore-311-unclustered', 'circle-opacity', 0.9)
        
        // 311 Flat points
        forcePaintProperty('baltimore-311-points', 'circle-color', colors.pointColor)
        forcePaintProperty('baltimore-311-points', 'circle-stroke-color', 'rgba(255,255,255,0.25)')
        forcePaintProperty('baltimore-311-points', 'circle-opacity', 0.8)
        
        // 311 Heatmap points
        forcePaintProperty('baltimore-311-heatmap-points', 'circle-color', colors.pointColor)
        forcePaintProperty('baltimore-311-heatmap-points', 'circle-stroke-color', 'rgba(255,255,255,0.25)')
        
        // Cluster labels
        forcePaintProperty('baltimore-311-cluster-count', 'text-color', '#ffffff')
        
        // Health - Overdose (preserve outcome-based colors)
        forcePaintProperty('health-overdose-points', 'circle-color', [
          'match', ['get', 'outcome'],
          'Fatal', '#dc2626',
          'Hospitalized', '#f97316',
          'Survived', '#fbbf24',
          '#9ca3af',
        ])
        forcePaintProperty('health-overdose-points', 'circle-stroke-color', 'rgba(255,255,255,0.4)')
        forcePaintProperty('health-overdose-points', 'circle-opacity', 0.85)
        
        // Health - Naloxone
        forcePaintProperty('health-naloxone-points', 'circle-color', '#10b981')
        forcePaintProperty('health-naloxone-points', 'circle-stroke-color', 'rgba(255,255,255,0.5)')
        forcePaintProperty('health-naloxone-points', 'circle-opacity', 0.75)
      }, 100)

      setMapLoaded(true)
      setCurrentEngine(mapEngine) // Track current engine
    })
  }

  initMap()

  return () => {
    if (map.current) {
      map.current.remove()
      map.current = null
    }
  }
}, [mapEngine]) // Re-run when engine changes (not city - city changes are handled by camera preset effect)

  // Apply view preset when city or engine changes (after map is loaded)
  useEffect(() => {
    console.log('📸 Camera preset effect triggered:', { selectedCity, mapEngine, mapLoaded })
    
    if (!map.current || !mapLoaded) return
    
    const preset = getViewPreset(selectedCity, mapEngine)
    console.log('🎬 Applying camera preset:', preset)
    if (!preset) return

    // Smoothly fly to the preset view
    map.current.flyTo({
      center: preset.center,
      zoom: preset.zoom,
      pitch: preset.pitch,
      bearing: preset.bearing,
      duration: 1500, // 1.5 second animation
      essential: true
    })
  }, [selectedCity, mapEngine, mapLoaded])

  // Update 311 layer colors in real-time when color settings change
  useEffect(() => {
    if (!map.current || !mapLoaded) return
    
    const colors = getActiveColors()
    
    // Update cluster colors
    if (map.current.getLayer('baltimore-311-clusters')) {
      map.current.setPaintProperty('baltimore-311-clusters', 'circle-color', [
        'step', ['get', 'point_count'],
        colors.clusterSmall, 50, colors.clusterMedium, 200, colors.clusterLarge,
      ])
    }
    
    // Update unclustered point colors
    if (map.current.getLayer('baltimore-311-unclustered')) {
      map.current.setPaintProperty('baltimore-311-unclustered', 'circle-color', colors.pointColor)
    }
    
    // Update flat point colors
    if (map.current.getLayer('baltimore-311-points')) {
      map.current.setPaintProperty('baltimore-311-points', 'circle-color', colors.pointColor)
    }
    
    // Update heatmap point colors
    if (map.current.getLayer('baltimore-311-heatmap-points')) {
      map.current.setPaintProperty('baltimore-311-heatmap-points', 'circle-color', colors.pointColor)
    }
  }, [mapLibreColors, mapboxColors, mapEngine, mapLoaded]) // Re-run when colors change

  // Neighborhood risk layer visibility (St. Louis only)
  useEffect(() => {
    if (!map.current || !mapLoaded) return
    if (!map.current.getLayer('neighborhood-risk-fill')) return
    const visibility = selectedCity === 'stl' && neighborhoodsRiskVisible ? 'visible' : 'none'
    map.current.setLayoutProperty('neighborhood-risk-fill', 'visibility', visibility)
    map.current.setLayoutProperty('neighborhood-risk-border', 'visibility', visibility)
  }, [neighborhoodsRiskVisible, selectedCity, mapLoaded])

  // Baltimore neighborhoods - fetch full data from ArcGIS server (no optimization)
  useEffect(() => {
    if (!map.current || !mapLoaded) return
    if (!map.current.getSource('baltimore-neighborhoods')) return
    
    const isBaltimore = selectedCity === 'baltimore'
    
    if (!isBaltimore) {
      // Hide when not in Baltimore
      map.current.setLayoutProperty('baltimore-neighborhoods-fill', 'visibility', 'none')
      map.current.setLayoutProperty('baltimore-neighborhoods-border', 'visibility', 'none')
      map.current.setLayoutProperty('baltimore-neighborhoods-labels', 'visibility', 'none')
      setBaltimoreNeighborhoodsData(null)
      return
    }

    // Fetch full, unoptimized neighborhood data from ArcGIS
    const neighborhoodsUrl = 'https://services1.arcgis.com/mVFRs7NF4iFitgbY/arcgis/rest/services/GP_Boundaries/FeatureServer/1/query?where=1%3D1&outFields=Name&f=geojson'
    
    fetch(neighborhoodsUrl)
      .then(r => r.json())
      .then(geojson => {
        if (map.current && map.current.getSource('baltimore-neighborhoods')) {
          // Store in context for panel to build individual toggles
          setBaltimoreNeighborhoodsData(geojson)
          
          // Set the full data initially (filtering will happen in separate effect)
          map.current.getSource('baltimore-neighborhoods').setData(geojson)
        }
      })
      .catch(err => {
        console.warn('Baltimore neighborhoods fetch failed:', err)
      })
  }, [selectedCity, mapLoaded, setBaltimoreNeighborhoodsData])

  // Baltimore neighborhoods - filter and color-code by 311 density
  useEffect(() => {
    if (!map.current || !mapLoaded) return
    if (!map.current.getLayer('baltimore-neighborhoods-fill')) return
    if (selectedCity !== 'baltimore') return
    if (!baltimoreNeighborhoodsData) return
    
    const baltimore311Data = map.current.getSource('baltimore-311-flat')?._data
    
    // Calculate density of open 311 requests per neighborhood
    let densityMap = {}
    if (baltimore311Data && baltimore311Data.features) {
      const enabledTypes = Object.keys(baltimore311Types).filter(t => baltimore311Types[t])
      const filtered311Data = {
        type: 'FeatureCollection',
        features: baltimore311Data.features.filter(f => {
          const srType = f?.properties?.SRType
          return srType && enabledTypes.includes(srType)
        })
      }
      densityMap = calculateNeighborhood311Density(baltimoreNeighborhoodsData, filtered311Data, baltimore311HideClosed)
    }
    
    // Determine which neighborhoods to show
    let filteredData = { type: 'FeatureCollection', features: [] }
    
    if (baltimoreNeighborhoodsAffected) {
      // Show only neighborhoods with open 311 requests
      filteredData.features = baltimoreNeighborhoodsData.features.filter(f => {
        const name = f.properties.Name
        if (!name) return false
        const count = densityMap[name] || 0
        return count > 0
      })
    } else if (baltimoreNeighborhoodsAll) {
      // Show all neighborhoods
      filteredData.features = baltimoreNeighborhoodsData.features
    }
    
    map.current.getSource('baltimore-neighborhoods').setData(filteredData)
    
    // Apply color expressions based on 311 density
    map.current.setPaintProperty('baltimore-neighborhoods-fill', 'fill-color', getNeighborhoodColorExpression(densityMap))
    map.current.setPaintProperty('baltimore-neighborhoods-border', 'line-color', getNeighborhoodBorderExpression(densityMap))
    
    // Show layers if either toggle is enabled
    const shouldShow = baltimoreNeighborhoodsAffected || baltimoreNeighborhoodsAll
    const visibility = shouldShow ? 'visible' : 'none'
    map.current.setLayoutProperty('baltimore-neighborhoods-fill', 'visibility', visibility)
    map.current.setLayoutProperty('baltimore-neighborhoods-border', 'visibility', visibility)
    map.current.setLayoutProperty('baltimore-neighborhoods-labels', 'visibility', visibility)
  }, [baltimoreNeighborhoodsAffected, baltimoreNeighborhoodsAll, baltimoreNeighborhoodsData, selectedCity, mapLoaded, baltimore311Types, baltimore311HideClosed, selectedYear, selectedDate])

  // Baltimore neighborhoods - floating stats cards for top 4 affected
  useEffect(() => {
    if (!map.current || !mapLoaded || !mapLib.current) return
    if (selectedCity !== 'baltimore') {
      // Clear markers when not in Baltimore
      neighborhoodMarkers.current.forEach(({ pin, card }) => {
        pin?.remove()
        card?.remove()
      })
      neighborhoodMarkers.current = []
      setMinimizedCards({})
      return
    }
    if (!baltimoreNeighborhoodsAffected) {
      // Only show cards when "Show Affected Neighborhoods" is enabled
      neighborhoodMarkers.current.forEach(({ pin, card }) => {
        pin?.remove()
        card?.remove()
      })
      neighborhoodMarkers.current = []
      setMinimizedCards({})
      return
    }
    if (!baltimoreNeighborhoodsData) return

    // Get full 311 data from source
    const baltimore311Data = map.current.getSource('baltimore-311-flat')?._data
    if (!baltimore311Data || !baltimore311Data.features) return

    // Calculate density with current filters
    const enabledTypes = Object.keys(baltimore311Types).filter(t => baltimore311Types[t])
    const filtered311Data = {
      type: 'FeatureCollection',
      features: baltimore311Data.features.filter(f => {
        const srType = f?.properties?.SRType
        return srType && enabledTypes.includes(srType)
      })
    }
    const densityMap = calculateNeighborhood311Density(baltimoreNeighborhoodsData, filtered311Data, baltimore311HideClosed)

    // Get top 4 neighborhoods with detailed stats
    const topNeighborhoods = getTopNeighborhoods(densityMap, baltimoreNeighborhoodsData, baltimore311Data, {
      hideClosed: baltimore311HideClosed,
      topN: 4
    })

    // Clear existing markers
    neighborhoodMarkers.current.forEach(({ pin, card }) => {
      pin?.remove()
      card?.remove()
    })
    neighborhoodMarkers.current = []

    // Create new pin + card markers for top neighborhoods
    topNeighborhoods.forEach(neighborhood => {
      if (!neighborhood.centroid) return

      const neighborhoodName = neighborhood.name

      // Create PIN marker
      const pinDiv = document.createElement('div')
      const pinRoot = createRoot(pinDiv)
      pinRoot.render(
        <NeighborhoodPin 
          color={neighborhood.color} 
          onClick={() => {
            // When pin is clicked, show the card (un-minimize)
            setMinimizedCards(prev => ({
              ...prev,
              [neighborhoodName]: false
            }))
          }}
        />
      )

      const pinMarker = new mapLib.current.Marker({
        element: pinDiv,
        anchor: 'bottom',
        offset: [0, 0]
      })
        .setLngLat(neighborhood.centroid)
        .addTo(map.current)

      // Create CARD marker
      const cardDiv = document.createElement('div')
      const cardRoot = createRoot(cardDiv)
      
      // Function to re-render the card with updated minimize state
      const renderCard = (isMinimized) => {
        cardRoot.render(
          <NeighborhoodStatsCard 
            neighborhood={neighborhood} 
            isMinimized={isMinimized}
            onMinimize={() => {
              // When card minimize is clicked, hide the card
              setMinimizedCards(prev => ({
                ...prev,
                [neighborhoodName]: true
              }))
            }}
          />
        )
      }

      // Initial render (check if this card was previously minimized)
      const isInitiallyMinimized = minimizedCards[neighborhoodName] || false
      renderCard(isInitiallyMinimized)

      const cardMarker = new mapLib.current.Marker({
        element: cardDiv,
        anchor: 'bottom',
        offset: [0, -40] // Position above the pin
      })
        .setLngLat(neighborhood.centroid)
        .addTo(map.current)

      // Store both markers
      neighborhoodMarkers.current.push({
        pin: pinMarker,
        card: cardMarker,
        name: neighborhoodName,
        renderCard // Store render function to update later
      })
    })

    // Cleanup on unmount
    return () => {
      neighborhoodMarkers.current.forEach(({ pin, card }) => {
        pin?.remove()
        card?.remove()
      })
      neighborhoodMarkers.current = []
    }
  }, [
    mapLoaded, 
    selectedCity, 
    baltimoreNeighborhoodsAffected,
    baltimoreNeighborhoodsData,
    baltimore311Types,
    baltimore311HideClosed,
    selectedYear,
    selectedDate
  ])

  // Re-render cards when minimizedCards state changes
  useEffect(() => {
    neighborhoodMarkers.current.forEach(({ name, renderCard }) => {
      if (renderCard) {
        const isMinimized = minimizedCards[name] || false
        renderCard(isMinimized)
      }
    })
  }, [minimizedCards])

  // Baltimore 311 — auto-load when city is Baltimore, switch between styles
  useEffect(() => {
    console.log('🚀 311 effect triggered:', { 
      hasMap: !!map.current, 
      mapLoaded, 
      selectedCity,
      hasClusterLayer: map.current?.getLayer('baltimore-311-clusters') ? 'yes' : 'no'
    })
    
    if (!map.current || !mapLoaded) {
      console.log('⏸️ 311 effect: map not ready yet')
      return
    }
    if (!map.current.getLayer('baltimore-311-clusters')) {
      console.log('⏸️ 311 effect: cluster layer not found yet')
      return
    }

    const CLUSTER_LAYERS = ['baltimore-311-clusters', 'baltimore-311-cluster-count', 'baltimore-311-unclustered']
    const FLAT_LAYERS = ['baltimore-311-points']
    const HEATMAP_LAYERS = ['baltimore-311-heatmap', 'baltimore-311-heatmap-points']
    const ALL_311_LAYERS = [...CLUSTER_LAYERS, ...FLAT_LAYERS, ...HEATMAP_LAYERS]
    const isBaltimore = selectedCity === 'baltimore'

    if (!isBaltimore) {
      ALL_311_LAYERS.forEach(id =>
        map.current.setLayoutProperty(id, 'visibility', 'none')
      )
      return
    }

    const applyVisibility = () => {
      // Hide all layers first
      ALL_311_LAYERS.forEach(id =>
        map.current.setLayoutProperty(id, 'visibility', 'none')
      )
      
      console.log('🔍 applyVisibility called:', { 
        baltimore311Visible, 
        baltimore311Style, 
        typesCount: Object.keys(baltimore311Types).length 
      })
      
      // Only show layers if baltimore311Visible is true
      if (!baltimore311Visible) {
        console.log('❌ baltimore311Visible is false, not showing layers')
        return
      }
      
      // Show appropriate layers based on style
      if (baltimore311Style === 'cluster') {
        console.log('✅ Showing CLUSTER_LAYERS')
        CLUSTER_LAYERS.forEach(id =>
          map.current.setLayoutProperty(id, 'visibility', 'visible')
        )
      } else if (baltimore311Style === 'heatmap') {
        console.log('✅ Showing HEATMAP_LAYERS')
        HEATMAP_LAYERS.forEach(id =>
          map.current.setLayoutProperty(id, 'visibility', 'visible')
        )
      } else {
        // default
        console.log('✅ Showing FLAT_LAYERS (default style)')
        FLAT_LAYERS.forEach(id =>
          map.current.setLayoutProperty(id, 'visibility', 'visible')
        )
      }
    }

    const filterByTypes = (geojson) => {
      const enabledTypes = Object.keys(baltimore311Types).filter(t => baltimore311Types[t])
      // If no types have been initialized yet, don't filter by type (show all)
      if (Object.keys(baltimore311Types).length === 0) {
        return geojson
      }
      // If types are initialized but all disabled, return empty
      if (enabledTypes.length === 0) {
        return { type: 'FeatureCollection', features: [] }
      }
      return {
        ...geojson,
        features: geojson.features.filter(f => enabledTypes.includes(f.properties.SRType)),
      }
    }

    const filterByClosed = (geojson) => {
      // If hide closed is enabled, filter out requests with a CloseDate
      if (!baltimore311HideClosed) return geojson
      
      const asOfDate = new Date(selectedDate)
      asOfDate.setHours(23, 59, 59, 999)
      const asOfTime = asOfDate.getTime()
      
      return {
        ...geojson,
        features: geojson.features.filter(f => {
          // Keep requests that are still open (no CloseDate)
          // OR were closed after the selected date
          const closeTime = f.properties?.CloseDate
          return !closeTime || closeTime > asOfTime
        }),
      }
    }

    // Generate cache key from selected date (YYYY-MM-DD format)
    const getCacheKey = () => {
      if (!selectedDate) return selectedYear.toString()
      const d = new Date(selectedDate)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }

    const applyAllFilters = (geojson) => {
      // Apply filters in order: types -> closed status
      const typeFiltered = filterByTypes(geojson)
      return filterByClosed(typeFiltered)
    }

    const cacheKey = getCacheKey()
    
    // Use cached data for this date
    if (baltimore311Cache.current[cacheKey]) {
      const fullData = baltimore311Cache.current[cacheKey]
      setBaltimore311Data(fullData)
      setBaltimore311DataYear(selectedYear)
      const filteredData = applyAllFilters(fullData)
      map.current.getSource('baltimore-311-clustered').setData(filteredData)
      map.current.getSource('baltimore-311-flat').setData(filteredData)
      applyVisibility()
      return
    }

    // Fetch for this date (with server-side date filtering)
    console.log('🌐 Fetching 311 data for', selectedYear, selectedDate, 'cache key:', cacheKey)
    fetch(get311ServiceUrl(selectedYear, selectedDate))
      .then((r) => {
        console.log('📡 311 fetch response received')
        return r.json()
      })
      .then((geojson) => {
        console.log('✅ 311 data parsed:', geojson.features?.length, 'features')
        baltimore311Cache.current[cacheKey] = geojson
        setBaltimore311Data(geojson)
        setBaltimore311DataYear(selectedYear)
        const filteredData = applyAllFilters(geojson)
        console.log('📊 Filtered data:', filteredData.features?.length, 'features after filters')
        if (map.current) {
          map.current.getSource('baltimore-311-clustered').setData(filteredData)
          map.current.getSource('baltimore-311-flat').setData(filteredData)
          applyVisibility()
        }
      })
      .catch((err) => {
        console.error('❌ 311 fetch failed:', err)
        ;[...CLUSTER_LAYERS, ...FLAT_LAYERS].forEach(id =>
          map.current?.setLayoutProperty(id, 'visibility', 'none')
        )
      })
  }, [selectedCity, selectedYear, selectedDate, baltimore311Style, baltimore311Visible, baltimore311HideClosed, baltimore311Types, mapLoaded, setBaltimore311Data, setBaltimore311DataYear]) // eslint-disable-line react-hooks/exhaustive-deps

  // Update heatmap properties in real-time when config changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return
    if (!map.current.getLayer('baltimore-311-heatmap')) return

    // Update heatmap layer properties
    map.current.setPaintProperty('baltimore-311-heatmap', 'heatmap-weight', heatmapConfig.weight)
    map.current.setPaintProperty('baltimore-311-heatmap', 'heatmap-intensity', [
      'interpolate', ['linear'], ['zoom'],
      0, heatmapConfig.intensityMin,
      15, heatmapConfig.intensityMax,
    ])
    map.current.setPaintProperty('baltimore-311-heatmap', 'heatmap-radius', [
      'interpolate', ['linear'], ['zoom'],
      0, heatmapConfig.radiusMin,
      15, heatmapConfig.radiusMax,
    ])
    map.current.setPaintProperty('baltimore-311-heatmap', 'heatmap-opacity', [
      'interpolate', ['linear'], ['zoom'],
      14, heatmapConfig.opacity,
      15, 0,
    ])
  }, [heatmapConfig, mapLoaded])

  // ========== HEALTH DATA LOADING ==========
  // Load overdose and naloxone data when Baltimore is selected
  useEffect(() => {
    if (!map.current || !mapLoaded) return
    if (!map.current.getSource('health-overdose')) return
    
    const isBaltimore = selectedCity === 'baltimore'
    
    if (!isBaltimore) {
      // Hide health layers when not in Baltimore
      map.current.setLayoutProperty('health-overdose-points', 'visibility', 'none')
      map.current.setLayoutProperty('health-naloxone-points', 'visibility', 'none')
      return
    }
    
    // Filter overdose data by date and filters
    const filterOverdoseData = (data) => {
      const asOfDate = new Date(selectedDate)
      asOfDate.setHours(23, 59, 59, 999)
      const asOfTime = asOfDate.getTime()
      
      return {
        ...data,
        features: data.features.filter(f => {
          // Filter by date (show incidents up to selected date)
          if (f.properties.incidentDate > asOfTime) return false
          
          // Filter by enabled filters
          if (Object.keys(healthOverdoseFilters).length > 0) {
            // Check substance filter
            const substanceKey = `substance:${f.properties.substance}`
            if (healthOverdoseFilters[substanceKey] === false) return false
            
            // Check outcome filter
            const outcomeKey = `outcome:${f.properties.outcome}`
            if (healthOverdoseFilters[outcomeKey] === false) return false
            
            // Check age group filter
            const ageKey = `ageGroup:${f.properties.ageGroup}`
            if (healthOverdoseFilters[ageKey] === false) return false
            
            // Check race filter
            const raceKey = `race:${f.properties.race}`
            if (healthOverdoseFilters[raceKey] === false) return false
            
            // Check sex filter
            const sexKey = `sex:${f.properties.sex}`
            if (healthOverdoseFilters[sexKey] === false) return false
          }
          
          return true
        })
      }
    }
    
    // Filter naloxone data by date and filters
    const filterNaloxoneData = (data) => {
      const asOfDate = new Date(selectedDate)
      asOfDate.setHours(23, 59, 59, 999)
      const asOfTime = asOfDate.getTime()
      
      return {
        ...data,
        features: data.features.filter(f => {
          // Filter by date
          if (f.properties.distributionDate > asOfTime) return false
          
          // Filter by location type
          if (Object.keys(healthNaloxoneFilters).length > 0) {
            const typeKey = `locationType:${f.properties.locationType}`
            if (healthNaloxoneFilters[typeKey] === false) return false
          }
          
          return true
        })
      }
    }
    
    // Load data for selected year
    const yearData = {
      overdose: overdoseData[selectedYear] || { type: 'FeatureCollection', features: [] },
      naloxone: naloxoneData[selectedYear] || { type: 'FeatureCollection', features: [] },
    }
    
    const filteredOverdose = filterOverdoseData(yearData.overdose)
    const filteredNaloxone = filterNaloxoneData(yearData.naloxone)
    
    // Update context
    setHealthOverdoseData(yearData.overdose)
    setHealthNaloxoneData(yearData.naloxone)
    setHealthDataYear(selectedYear)
    
    // Update map sources
    map.current.getSource('health-overdose').setData(filteredOverdose)
    map.current.getSource('health-naloxone').setData(filteredNaloxone)
    
    // Update visibility
    map.current.setLayoutProperty('health-overdose-points', 'visibility', healthOverdoseVisible ? 'visible' : 'none')
    map.current.setLayoutProperty('health-naloxone-points', 'visibility', healthNaloxoneVisible ? 'visible' : 'none')
    
  }, [
    selectedCity, 
    selectedYear, 
    selectedDate, 
    healthOverdoseVisible, 
    healthNaloxoneVisible, 
    healthOverdoseFilters, 
    healthNaloxoneFilters, 
    mapLoaded,
    setHealthOverdoseData,
    setHealthNaloxoneData,
    setHealthDataYear,
  ]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div
        ref={mapContainer}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}
      />
      {selectedCity === 'baltimore' && baltimore311Style === 'heatmap' && <HeatmapLegend />}
    </>
  )
}
