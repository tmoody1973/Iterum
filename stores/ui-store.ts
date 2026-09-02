'use client'

import { create } from 'zustand'

export type RightTab = 'review' | 'capture' | 'library' | 'activity'
export type ActiveTool = 'select' | 'crop' | 'color' | 'type' | 'annotate'
export type WebMcpStatus = 'preview' | 'ready' | 'error'

export interface UiState {
  selectedBoardItemId: string | null
  activeRightTab: RightTab
  activeTool: ActiveTool
  webMcpStatus: WebMcpStatus
  isBriefDrawerOpen: boolean
  isReviewDrawerOpen: boolean
  selectBoardItem: (id: string | null) => void
  setActiveRightTab: (tab: RightTab) => void
  setActiveTool: (tool: ActiveTool) => void
  setWebMcpStatus: (status: WebMcpStatus) => void
  setBriefDrawerOpen: (open: boolean) => void
  setReviewDrawerOpen: (open: boolean) => void
}

/** Transient presentation state only; canonical workspace data stays in WorkspaceRuntime. */
export const useUiStore = create<UiState>()((set) => ({
  selectedBoardItemId: null,
  activeRightTab: 'review',
  activeTool: 'select',
  webMcpStatus: 'preview',
  isBriefDrawerOpen: false,
  isReviewDrawerOpen: false,
  selectBoardItem: (selectedBoardItemId) => set({ selectedBoardItemId }),
  setActiveRightTab: (activeRightTab) => set({ activeRightTab }),
  setActiveTool: (activeTool) => set({ activeTool }),
  setWebMcpStatus: (webMcpStatus) => set({ webMcpStatus }),
  setBriefDrawerOpen: (isBriefDrawerOpen) => set({ isBriefDrawerOpen }),
  setReviewDrawerOpen: (isReviewDrawerOpen) => set({ isReviewDrawerOpen }),
}))
