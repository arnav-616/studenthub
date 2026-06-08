import { create } from 'zustand'
import { settingsApi } from '../api/client'

export const useSettingsStore = create((set, get) => ({
  settings: {
    accent_color: '#6366f1',
    daily_study_hours: '6',
    work_style: 'on_time',
    theme: 'dark',
    pomodoro_focus: '25',
    pomodoro_short_break: '5',
    pomodoro_long_break: '15',
  },
  loaded: false,

  loadSettings: async () => {
    try {
      const settings = await settingsApi.get()
      set({ settings, loaded: true })
    } catch (e) {
      set({ loaded: true })
    }
  },

  updateSettings: async (updates) => {
    const newSettings = { ...get().settings, ...updates }
    set({ settings: newSettings })
    try {
      await settingsApi.update(updates)
    } catch (e) {
      console.error('Settings update failed:', e)
    }
  },
}))
