'use client'

import { createFullCampaignDemoState } from '../lib/domain/full-campaign-demo-data'
import { createWorkspaceRuntime } from '../lib/domain/workspace-runtime'
import { IterumWorkspace } from './iterum-workspace'

export function FullCampaignDemoWorkspace() {
  return <IterumWorkspace runtime={createWorkspaceRuntime(createFullCampaignDemoState())} />
}
