import type { CropRect, RightsStatus } from '../domain/types'

export interface CapturedReference {
  title: string
  description: string
  imageUrl?: string
  sourceUrl: string
  attribution: string
  rightsStatus: RightsStatus
  provider: 'microlink'
  previewKind: 'screenshot' | 'image' | 'none'
  crop: CropRect
}

export interface ReferenceSearchResult {
  id: string
  title: string
  imageUrl: string
  thumbnailUrl: string
  sourceUrl: string
  attribution: string
  rightsStatus: RightsStatus
  provider: 'pexels'
  width: number
  height: number
  crop: CropRect
}

export interface ReferenceSearchResponse {
  provider: 'pexels'
  configured: boolean
  results: ReferenceSearchResult[]
  note?: string
}
