import { createFullCampaignDemoState } from './full-campaign-demo-data'
import { createWorkspaceRuntime } from './workspace-runtime'

export const fullCampaignDemoRuntime = createWorkspaceRuntime(createFullCampaignDemoState())
