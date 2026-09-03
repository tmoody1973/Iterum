import { createCreativeTerritoryReviewState } from './creative-territory-demo-data'
import { createWorkspaceRuntime } from './workspace-runtime'

export const creativeTerritoryDemoRuntime = createWorkspaceRuntime(createCreativeTerritoryReviewState())
