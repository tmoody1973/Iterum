import type { TypefaceCandidate, TypefaceCategory } from '../domain/types'

export interface TypefaceSearchResponse {
  query: string
  category: TypefaceCategory | 'all'
  includeCommercial: boolean
  googleFontsConfigured: boolean
  results: TypefaceCandidate[]
  note?: string
}
