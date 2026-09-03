import { convexDeploymentUrl } from '../../components/convex-client-provider'
import { DesignerSessionBoundary } from '../../components/persistence/designer-session-boundary'
import { ProjectsDashboard } from '../../components/persistence/projects-dashboard'

export default function ProjectsPage() {
  if (!convexDeploymentUrl) return <main className="project-gate"><p className="project-gate-kicker">Iterum cloud workspace</p><h1>Convex is not configured</h1><p>Add NEXT_PUBLIC_CONVEX_URL to .env.local, then restart Next.js.</p><a href="/">Return to the demo</a></main>
  return <DesignerSessionBoundary><ProjectsDashboard /></DesignerSessionBoundary>
}
