import { create } from 'zustand'
import type { SimulationMetrics } from '../simulation/types'

export type AppView = 'simulation' | 'training' | 'analytics' | 'lab'

interface AppState {
  activeView: AppView
  running: boolean
  speed: number
  selectedIntersectionId: string | null
  metrics: SimulationMetrics
  setActiveView: (view: AppView) => void
  toggleRunning: () => void
  setSpeed: (speed: number) => void
  setSelectedIntersectionId: (id: string | null) => void
  setMetrics: (metrics: SimulationMetrics) => void
}

const emptyMetrics: SimulationMetrics = {
  simTimeSec: 0,
  activeVehicles: 0,
  completedVehicles: 0,
  avgWaitSec: 0,
  throughputPerHour: 0,
}

export const useAppStore = create<AppState>((set) => ({
  activeView: 'simulation',
  running: true,
  speed: 1,
  selectedIntersectionId: 'I-1-1',
  metrics: emptyMetrics,
  setActiveView: (activeView) => set({ activeView }),
  toggleRunning: () => set((state) => ({ running: !state.running })),
  setSpeed: (speed) => set({ speed }),
  setSelectedIntersectionId: (selectedIntersectionId) => set({ selectedIntersectionId }),
  setMetrics: (metrics) => set({ metrics }),
}))
