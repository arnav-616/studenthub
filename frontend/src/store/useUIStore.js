import { create } from 'zustand'

export const useUIStore = create((set, get) => ({
  newAssignmentOpen: false,
  commandPaletteOpen: false,
  sidebarCollapsed: JSON.parse(localStorage.getItem('sh_sidebar_collapsed') || 'false'),

  openNewAssignment: () => set({ newAssignmentOpen: true }),
  closeNewAssignment: () => set({ newAssignmentOpen: false }),

  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),

  toggleSidebar: () => set(s => {
    const next = !s.sidebarCollapsed
    localStorage.setItem('sh_sidebar_collapsed', JSON.stringify(next))
    return { sidebarCollapsed: next }
  }),
}))
