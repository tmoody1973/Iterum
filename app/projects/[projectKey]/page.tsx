import { DesignerSessionBoundary } from '../../../components/persistence/designer-session-boundary'
import { PersistentProjectWorkspace } from '../../../components/persistence/persistent-project-workspace'

export default async function ProjectPage({ params }: { params: Promise<{ projectKey: string }> }) {
  const { projectKey } = await params
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) return <main className="project-gate"><p className="project-gate-kicker">Iterum cloud workspace</p><h1>Convex is not configured</h1><p>Add NEXT_PUBLIC_CONVEX_URL to the deployment environment, then rebuild Iterum.</p><a href="/">Return to the demo</a></main>
  return <DesignerSessionBoundary><PersistentProjectWorkspace projectKey={projectKey} /></DesignerSessionBoundary>
}
