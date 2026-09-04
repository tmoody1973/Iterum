import { DesignerSessionBoundary } from '../../../../components/persistence/designer-session-boundary'
import { ReviewerProjectWorkspace } from '../../../../components/persistence/reviewer-project-workspace'

export default async function ReviewerPage({ params, searchParams }: { params: Promise<{ projectKey: string }>; searchParams: Promise<{ grant?: string }> }) {
  const [{ projectKey }, query] = await Promise.all([params, searchParams])
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) return <main className="project-gate"><p className="project-gate-kicker">Iterum cloud workspace</p><h1>Convex is not configured</h1><p>Add NEXT_PUBLIC_CONVEX_URL to the deployment environment, then rebuild Iterum.</p></main>
  return <DesignerSessionBoundary><ReviewerProjectWorkspace projectKey={projectKey} initialGrantKey={query.grant} /></DesignerSessionBoundary>
}
