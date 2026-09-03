'use client'

import { creativeTerritoryDemoRequest } from '../lib/domain/creative-territory-demo-data'
import { creativeTerritoryDemoRuntime } from '../lib/domain/creative-territory-demo-runtime'
import { IterumWorkspace } from './iterum-workspace'

export function CreativeTerritoryDemoWorkspace() {
  return <IterumWorkspace runtime={creativeTerritoryDemoRuntime} showPendingProposalPreview={false} reviewOnMount initialPreviewLayoutProposalId={creativeTerritoryDemoRequest.id} />
}
