'use client'

import { create } from 'zustand'

import type { BoardViewport, ViewportSize } from '../lib/board/viewport'

export type RightTab = 'review' | 'capture' | 'library' | 'activity'
export type ActiveTool = 'select' | 'crop' | 'color' | 'type' | 'annotate'
export type WebMcpStatus = 'preview' | 'ready' | 'error'

export interface UiState {
  selectedBoardItemId: string | null
  activeRightTab: RightTab
  activeTool: ActiveTool
  webMcpStatus: WebMcpStatus
  webClipMessage: string | null
  boardViewport: BoardViewport
  boardViewportSize: ViewportSize
  boardViewportMode: 'fit' | 'custom'
  isBoardViewportReady: boolean
  isBriefDrawerOpen: boolean
  isReviewDrawerOpen: boolean
  selectBoardItem: (id: string | null) => void
  setActiveRightTab: (tab: RightTab) => void
  setActiveTool: (tool: ActiveTool) => void
  setWebMcpStatus: (status: WebMcpStatus) => void
  setWebClipMessage: (message: string | null) => void
  setBoardViewport: (viewport: BoardViewport, mode?: 'fit' | 'custom') => void
  setBoardViewportSize: (size: ViewportSize) => void
  setBriefDrawerOpen: (open: boolean) => void
  setReviewDrawerOpen: (open: boolean) => void
}

/** Transient presentation state only; canonical workspace data stays in WorkspaceRuntime. */
export const useUiStore = create<UiState>()((set) => ({
  selectedBoardItemId: null,
  activeRightTab: 'review',
  activeTool: 'select',
  webMcpStatus: 'preview',
  webClipMessage: null,
  boardViewport: { x: 0, y: 0, scale: 1 },
  boardViewportSize: { width: 0, height: 0 },
  boardViewportMode: 'fit',
  isBoardViewportReady: false,
  isBriefDrawerOpen: false,
  isReviewDrawerOpen: false,
  selectBoardItem: (selectedBoardItemId) => set({ selectedBoardItemId }),
  setActiveRightTab: (activeRightTab) => set({ activeRightTab }),
  setActiveTool: (activeTool) => set({ activeTool }),
  setWebMcpStatus: (webMcpStatus) => set({ webMcpStatus }),
  setWebClipMessage: (webClipMessage) => set({ webClipMessage }),
  setBoardViewport: (boardViewport, boardViewportMode = 'custom') => set({ boardViewport, boardViewportMode, isBoardViewportReady: true }),
  setBoardViewportSize: (boardViewportSize) => set((state) => state.boardViewportSize.width === boardViewportSize.width && state.boardViewportSize.height === boardViewportSize.height ? state : { boardViewportSize }),
  setBriefDrawerOpen: (isBriefDrawerOpen) => set({ isBriefDrawerOpen }),
  setReviewDrawerOpen: (isReviewDrawerOpen) => set({ isReviewDrawerOpen }),
}))
