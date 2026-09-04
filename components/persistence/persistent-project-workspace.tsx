'use client'

import { useEffect } from 'react'

import type { WorkspaceState } from '../../lib/domain/types'
import type { ReviewerGrantSession } from '../../lib/persistence/project-controller'
import { usePersistentWorkspace } from '../../hooks/use-persistent-workspace'
import { useUiStore } from '../../stores/ui-store'
import { IterumWorkspace } from '../iterum-workspace'

export function PersistentProjectWorkspace({ projectKey, seedState, reviewerGrant }: { projectKey: string; seedState?: WorkspaceState; reviewerGrant?: ReviewerGrantSession }) {
  const persistence = usePersistentWorkspace(projectKey, seedState)

  useEffect(() => {
    useUiStore.setState({
      selectedBoardItemId: null,
      previewLayoutProposalId: null,
      activeTool: 'select',
      activeWorkspaceMode: 'mechanical',
      boardDisplayMode: 'working',
      isBriefDrawerOpen: false,
      isReviewDrawerOpen: false,
      boardViewportMode: 'fit',
      isBoardViewportReady: false,
    })
  }, [projectKey])

  if (!persistence.isReady) {
    return <main className="project-gate" aria-live="polite">
      <p className="project-gate-kicker">Iterum cloud workspace</p>
      <h1>{persistence.status.phase === 'error' ? 'Project unavailable' : 'Opening project'}</h1>
      <p>{persistence.status.message}</p>
      {persistence.status.phase === 'error' && <a href="/projects">Return to projects</a>}
    </main>
  }

  return <IterumWorkspace runtime={persistence.runtime} projectController={persistence.controller} projectStatus={persistence.status} reviewerGrant={reviewerGrant} showPendingProposalPreview={false} />
}
