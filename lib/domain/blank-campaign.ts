import type { WorkspaceState } from './types'

function compactId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'untitled'
}

export function createBlankCampaignState(name: string, objective = 'Define a distinctive campaign direction.'): WorkspaceState {
  const suffix = crypto.randomUUID().slice(0, 8)
  const slug = compactId(name)
  return {
    campaign: {
      id: `campaign-${slug}-${suffix}`,
      boardId: `board-${slug}-${suffix}`,
      name: name.trim(),
      line: 'Direction in progress.',
      brief: objective.trim(),
      deliverables: [],
      constraints: [],
      briefStatus: 'draft',
      creativeBrief: {
        objective: objective.trim(),
        audience: 'To be defined',
        proposition: 'To be defined',
        tone: [],
        mandatoryAssets: [],
        antiDirections: [],
        schedule: 'To be defined',
      },
    },
    creativeRoutes: [],
    version: 0,
    placementPolicy: { allowAgentDirectPlacement: false, directPlacementTerritory: 'Unsorted' },
    colorPalette: { extraction: null, pinned: [] },
    typeDirection: null,
    typeProposals: [],
    layoutProposals: [],
    boardItems: [],
    proposals: [],
    receipts: [],
    processedCommands: [],
  }
}

export function createProjectKey(name: string) {
  return `${compactId(name).slice(0, 36)}-${crypto.randomUUID().slice(0, 8)}`
}
