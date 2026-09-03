import { createOrganizedDemoWorkspaceState } from './organized-demo-data'
import { createWorkspaceRuntime } from './workspace-runtime'

export const organizedDemoRuntime = createWorkspaceRuntime(createOrganizedDemoWorkspaceState())
