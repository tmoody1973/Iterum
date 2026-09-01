import { createDemoWorkspaceState } from './demo-data'
import { createWorkspaceRuntime } from './workspace-runtime'

/** The explicit canonical in-memory repository used by the local demo. */
export const demoRuntime = createWorkspaceRuntime(createDemoWorkspaceState())
