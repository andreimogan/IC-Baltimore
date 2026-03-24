import { MapPin, ChevronDown, Calendar } from 'lucide-react'
import { useState, useEffect } from 'react'
import { usePanelContext } from '../contexts/PanelContext'

const CITIES = [
  { 
    id: 'stl', 
    label: 'St. Louis, MO',
    title: 'St. Louis Intelligence Center',
    subtitle: "Mayor's Decision Cockpit",
    logo: '/city-logo.png',
  },
  { 
    id: 'baltimore', 
    label: 'Baltimore, MD',
    title: 'Baltimore City Intelligence Center',
    subtitle: "Mayor's Decision Cockpit",
    logo: '/baltimore-logo.svg',
  },
  { 
    id: 'howard', 
    label: 'Howard County, MD',
    title: 'Howard County Intelligence Center',
    subtitle: "County Executive's Dashboard",
    logo: '/howard-logo.svg',
  },
]

const YEARS = [2023, 2024, 2025]

export default function NavLeft() {
  const { selectedCity, setSelectedCity, selectedDate, setSelectedDate, selectedYear, setSelectedYear } = usePanelContext()
  const [cityOpen, setCityOpen] = useState(false)
  const [dateOpen, setDateOpen] = useState(false)
  const cityData = CITIES.find(c => c.id === selectedCity) || CITIES[0]

  // Sync selectedYear when selectedDate changes
  useEffect(() => {
    const year = selectedDate.getFullYear()
    if (year !== selectedYear) {
      setSelectedYear(year)
    }
  }, [selectedDate, selectedYear, setSelectedYear])

  const handleCitySelect = (cityId) => {
    setSelectedCity(cityId)
    setCityOpen(false)
  }

  const handleDateChange = (e) => {
    const newDate = new Date(e.target.value)
    setSelectedDate(newDate)
    setDateOpen(false)
  }

  const formatDisplayDate = (date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatInputDate = (date) => {
    return date.toISOString().split('T')[0]
  }

  const controlStyle = {
    color: 'rgba(255, 255, 255, 0.9)',
    background: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.15)',
  }

  return (
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div className="flex items-center gap-2 px-2 shrink-0">
        <div
          className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0"
          style={{ background: '#171717' }}
        >
          <img src={cityData.logo} alt={`${cityData.title} logo`} className="w-4 h-4 object-contain" />
        </div>
        <div className="leading-none">
          <p className="text-sm font-semibold text-white">{cityData.title}</p>
          <p className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
            {cityData.subtitle}
          </p>
        </div>
      </div>

      {/* City selector */}
      <div className="relative">
        <button
          className="flex items-center gap-2 h-9 px-3 rounded-[8px] text-sm transition-colors border"
          style={controlStyle}
          title="Location"
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
          onClick={() => { setCityOpen(!cityOpen); setDateOpen(false) }}
        >
          <MapPin className="w-4 h-4" aria-hidden="true" />
          <span className="font-normal">{cityData.label}</span>
          <ChevronDown
            className="w-4 h-4 transition-transform"
            style={{ transform: cityOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            aria-hidden="true"
          />
        </button>
        {cityOpen && (
          <div
            className="absolute mt-1 w-56 rounded-[8px] border shadow-lg z-50"
            style={{ borderColor: 'rgba(255,255,255,0.1)', background: '#171717' }}
          >
            {CITIES.map((city) => (
              <button
                key={city.id}
                className="w-full text-left px-3 py-2 text-sm flex items-center justify-between"
                style={{ color: 'rgba(255,255,255,0.9)' }}
                onClick={() => handleCitySelect(city.id)}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <span>{city.label}</span>
                {selectedCity === city.id && (
                  <span className="text-[10px] uppercase tracking-wide opacity-70">Active</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Date selector */}
      <div className="relative">
        <button
          className="flex items-center gap-2 h-9 px-3 rounded-[8px] text-sm transition-colors border"
          style={controlStyle}
          title="Select date"
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
          onClick={() => { setDateOpen(!dateOpen); setCityOpen(false) }}
        >
          <Calendar className="w-4 h-4" aria-hidden="true" />
          <span className="font-normal">{formatDisplayDate(selectedDate)}</span>
          <ChevronDown
            className="w-4 h-4 transition-transform"
            style={{ transform: dateOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            aria-hidden="true"
          />
        </button>
        {dateOpen && (
          <div
            className="absolute mt-1 rounded-[8px] border shadow-lg z-50 overflow-hidden p-3"
            style={{ borderColor: 'rgba(255,255,255,0.1)', background: '#171717' }}
          >
            <input
              type="date"
              min="2023-01-01"
              max="2025-12-31"
              value={formatInputDate(selectedDate)}
              onChange={handleDateChange}
              className="px-3 py-2 text-sm rounded-md border"
              style={{
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderColor: 'rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.9)',
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
