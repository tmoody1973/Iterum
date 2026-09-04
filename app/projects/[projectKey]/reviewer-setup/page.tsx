import { DesignerSessionBoundary } from '../../../../components/persistence/designer-session-boundary'
import { ReviewerPassSetup } from '../../../../components/persistence/reviewer-pass-setup'

export default async function ReviewerSetupPage({ params }: { params: Promise<{ projectKey: string }> }) {
  const { projectKey } = await params
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) return <main className="project-gate"><h1>Convex is not configured</h1></main>
  return <DesignerSessionBoundary><ReviewerPassSetup projectKey={projectKey} /></DesignerSessionBoundary>
}
