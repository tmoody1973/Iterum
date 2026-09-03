'use client'

import { createFullCampaignDemoState } from '../lib/domain/full-campaign-demo-data'
import { convexDeploymentUrl } from './convex-client-provider'
import { PersistentProjectWorkspace } from './persistence/persistent-project-workspace'
import { fullCampaignDemoRuntime } from '../lib/domain/full-campaign-demo-runtime'
import { IterumWorkspace } from './iterum-workspace'

export function FullCampaignDemoWorkspace() {
  if (convexDeploymentUrl) return <PersistentProjectWorkspace projectKey="pivot-webmcp-demo" seedState={createFullCampaignDemoState()} />
  return <IterumWorkspace runtime={fullCampaignDemoRuntime} />
}
