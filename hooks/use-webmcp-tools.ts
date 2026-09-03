'use client'

import { useEffect } from 'react'

import { registerIterumTools } from '../lib/webmcp/register-tools'
import type { WorkspaceRuntime } from '../lib/domain/workspace-runtime'
import type { ProjectController } from '../lib/persistence/project-controller'
import { useUiStore } from '../stores/ui-store'

export function useWebMcpTools(runtime: WorkspaceRuntime, projectController?: ProjectController) {
  const setStatus = useUiStore((state) => state.setWebMcpStatus)
  useEffect(() => {
    const controller = new AbortController()
    if (!document.modelContext) { setStatus('preview'); return () => controller.abort() }
    let active = true
    const viewportController = {
      getViewport: () => useUiStore.getState().boardViewport,
      getViewportSize: () => useUiStore.getState().boardViewportSize,
      setViewport: (viewport: ReturnType<typeof useUiStore.getState>['boardViewport'], mode: 'fit' | 'custom' = 'custom') => useUiStore.getState().setBoardViewport(viewport, mode),
    }
    const reviewUi = {
      previewLayoutProposal: (id: string | null) => useUiStore.getState().setPreviewLayoutProposal(id),
      openReview: () => { useUiStore.getState().setActiveRightTab('review'); useUiStore.getState().setReviewDrawerOpen(true) },
    }
    const presentationUi = {
      getDisplayState: () => {
        const state = useUiStore.getState()
        return { mode: state.boardDisplayMode, selectedItemId: state.selectedBoardItemId, previewProposalId: state.previewLayoutProposalId, workspaceMode: state.activeWorkspaceMode, activeTool: state.activeTool, drawers: { brief: state.isBriefDrawerOpen, review: state.isReviewDrawerOpen } }
      },
      setDisplayMode: (mode: ReturnType<typeof useUiStore.getState>['boardDisplayMode']) => useUiStore.getState().setBoardDisplayMode(mode),
      preparePresentation: () => useUiStore.setState({ boardDisplayMode: 'presentation', selectedBoardItemId: null, previewLayoutProposalId: null, activeWorkspaceMode: 'mechanical', activeTool: 'select', isBriefDrawerOpen: false, isReviewDrawerOpen: false }),
    }
    registerIterumTools(runtime, controller, viewportController, reviewUi, presentationUi, projectController).then((registered) => { if (active) setStatus(registered ? 'ready' : 'preview') }).catch(() => { if (active && !controller.signal.aborted) setStatus('error') })
    return () => { active = false; controller.abort() }
  }, [projectController, runtime, setStatus])
}
