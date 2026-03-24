import TopNav from './components/TopNav'
import MapView from './components/MapView'
import SuccessNotifications from './components/notifications/SuccessNotifications'
import CityKPICards from './components/CityKPICards'
import LeftNav from './components/LeftNav'
import PerformancePage from './components/PerformancePage'
import {
  WaterOSCopilotPanel,
  ManageMapLayersPanel,
} from './components/panels'
import { PanelProvider, usePanelContext } from './contexts/PanelContext'
import { generatePerformanceModalData } from './utils/performanceAnalytics'

function AppContent() {
  const { currentView, selectedCity, baltimore311Data, selectedDate, healthOverdoseData } = usePanelContext()

  // Generate performance data when needed
  const performanceData = currentView === 'performance' && selectedCity === 'baltimore' && baltimore311Data
    ? generatePerformanceModalData(selectedDate, baltimore311Data, healthOverdoseData)
    : null

  return (
    <>
      <TopNav />
      <LeftNav />
      <main
        className="relative flex-1 min-h-[calc(100vh-var(--nav-height))] bg-[var(--content-bg)]"
        aria-label="Main content"
      >
        {/* Map View */}
        {currentView === 'map' && (
          <>
            <MapView />
            <CityKPICards />
          </>
        )}

        {/* Performance Page */}
        {currentView === 'performance' && (
          <PerformancePage data={performanceData} />
        )}

        {/* Common components */}
        <SuccessNotifications />
        <WaterOSCopilotPanel />
        <ManageMapLayersPanel />
      </main>
    </>
  )
}

function App() {
  return (
    <PanelProvider>
      <AppContent />
    </PanelProvider>
  )
}

export default App
