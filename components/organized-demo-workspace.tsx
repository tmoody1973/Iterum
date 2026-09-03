'use client'

import { organizedDemoRuntime } from '../lib/domain/organized-demo-runtime'
import { IterumWorkspace } from './iterum-workspace'

export function OrganizedDemoWorkspace() {
  return <IterumWorkspace runtime={organizedDemoRuntime} showPendingProposalPreview={false} />
}
