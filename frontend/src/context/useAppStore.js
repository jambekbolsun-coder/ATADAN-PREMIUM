import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAppStore = create(persist((set,get)=>({
  compare: [],
  favorites: [],
  addCompare: (slug) => set({compare: get().compare.includes(slug) ? get().compare : [...get().compare, slug].slice(-4)}),
  removeCompare: (slug) => set({compare: get().compare.filter(x=>x!==slug)}),
  toggleCompare: (slug) => get().compare.includes(slug) ? get().removeCompare(slug) : get().addCompare(slug),
  toggleFavorite: (slug) => set({favorites: get().favorites.includes(slug) ? get().favorites.filter(x=>x!==slug) : [...get().favorites, slug]}),
  clearCompare: () => set({compare:[]})
}), {name:'atadan-preferences'}))
