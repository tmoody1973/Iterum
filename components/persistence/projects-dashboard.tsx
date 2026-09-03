'use client'

import { useMutation, useQuery } from 'convex/react'
import { ArrowRight, Cloud, Plus } from 'lucide-react'
import { FormEvent, useState } from 'react'

import { api } from '../../convex/_generated/api'
import { createBlankCampaignState, createProjectKey } from '../../lib/domain/blank-campaign'

export function ProjectsDashboard() {
  const projects = useQuery(api.projects.list, {})
  const ensureProject = useMutation(api.projects.ensure)
  const [name, setName] = useState('')
  const [objective, setObjective] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const createProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const cleanName = name.trim()
    const cleanObjective = objective.trim()
    if (!cleanName || !cleanObjective || busy) return
    setBusy(true); setMessage('Creating blank cloud project…')
    try {
      const projectKey = createProjectKey(cleanName)
      const workspace = createBlankCampaignState(cleanName, cleanObjective)
      await ensureProject({ projectKey, name: cleanName, workspace, idempotencyKey: crypto.randomUUID() })
      window.location.assign(`/projects/${encodeURIComponent(projectKey)}`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The project could not be created.')
      setBusy(false)
    }
  }

  return <main className="projects-page">
    <header className="projects-heading"><div><p>Iterum / Cloud projects</p><h1>Campaign directions</h1></div><span><Cloud aria-hidden="true" />Convex connected</span></header>
    <div className="projects-grid">
      <section className="new-project-card" aria-labelledby="new-project-title">
        <p className="projects-index">01 / Start clean</p>
        <h2 id="new-project-title">New campaign</h2>
        <p>Create an empty project. References, routes, palettes, typography, and applications begin blank.</p>
        <form onSubmit={createProject}>
          <label>Campaign name<input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required placeholder="October mineral fragrance" /></label>
          <label>Objective<textarea value={objective} onChange={(event) => setObjective(event.target.value)} maxLength={500} required placeholder="Launch a new fragrance with a distinctive editorial campaign direction." /></label>
          <button type="submit" disabled={busy}><Plus aria-hidden="true" />Create blank project</button>
          {message && <p role="status">{message}</p>}
        </form>
      </section>
      <section className="project-list" aria-labelledby="project-list-title">
        <div><p className="projects-index">02 / Resume</p><h2 id="project-list-title">Recent projects</h2></div>
        {projects === undefined ? <p role="status">Loading cloud projects…</p> : projects.length ? <ol>{projects.map((project) => <li key={project.id}><a href={`/projects/${encodeURIComponent(project.projectKey)}`}><span><strong>{project.name}</strong><small>Board V{String(project.workspaceVersion).padStart(2, '0')} · Cloud revision {project.headRevision}</small><time dateTime={new Date(project.updatedAt).toISOString()}>Updated {new Date(project.updatedAt).toLocaleString()}</time></span><ArrowRight aria-hidden="true" /></a></li>)}</ol> : <p>No projects yet. Create the first blank campaign.</p>}
      </section>
    </div>
  </main>
}
