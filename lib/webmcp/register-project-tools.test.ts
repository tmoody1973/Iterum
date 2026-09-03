import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ProjectCatalogController } from '../persistence/project-controller'
import { registerProjectCatalogTools } from './register-project-tools'

const project = {
  id: 'project-1',
  projectKey: 'mineral-night-123',
  name: 'Mineral Night',
  campaignId: 'campaign-mineral-night',
  boardId: 'board-mineral-night',
  workspaceVersion: 0,
  headRevision: 1,
  createdAt: 100,
  updatedAt: 100,
}

function controller(): ProjectCatalogController {
  return {
    listProjects: vi.fn(async () => [project]),
    createProject: vi.fn(async (input) => ({ ...project, name: input.name })),
    openProject: vi.fn(),
  }
}

afterEach(() => { delete document.modelContext })

describe('registerProjectCatalogTools', () => {
  it('falls back when the browser does not expose WebMCP', async () => {
    await expect(registerProjectCatalogTools(controller())).resolves.toBeNull()
  })

  it('registers strict owner-scoped project tools and executes the catalog flow', async () => {
    const registered: Array<{ name: string; inputSchema: Record<string, unknown>; execute: (input: unknown) => Promise<unknown> | unknown }> = []
    document.modelContext = { registerTool: vi.fn(async (tool) => { registered.push(tool); return undefined }) }
    const projects = controller()

    const result = await registerProjectCatalogTools(projects)

    expect(result?.count).toBe(3)
    expect(registered.map((tool) => tool.name)).toEqual(['list_campaign_projects', 'create_campaign_project', 'open_campaign_project'])
    expect(registered.every((tool) => tool.inputSchema.additionalProperties === false)).toBe(true)

    await expect(registered[0].execute({})).resolves.toMatchObject({
      ok: true,
      scope: 'project-catalog',
      data: { projects: [{ projectKey: 'mineral-night-123' }] },
      summary: 'Found 1 private cloud project.',
    })
    await expect(registered[1].execute({ name: ' New direction ', objective: ' Start clean. ', idempotencyKey: 'create-1' })).resolves.toMatchObject({
      ok: true,
      data: { project: { name: 'New direction' }, openWith: { tool: 'open_campaign_project', projectKey: 'mineral-night-123' } },
    })
    expect(projects.createProject).toHaveBeenCalledWith({ name: 'New direction', objective: 'Start clean.', idempotencyKey: 'create-1' })

    expect(registered[2].execute({ projectKey: 'mineral-night-123' })).toMatchObject({ ok: true, data: { canonicalStateChanged: false } })
    expect(projects.openProject).toHaveBeenCalledWith('mineral-night-123')
  })

  it('rejects extra fields and aborts registration after a browser failure', async () => {
    const registered: Array<{ name: string; execute: (input: unknown) => Promise<unknown> | unknown }> = []
    const abortController = new AbortController()
    document.modelContext = { registerTool: vi.fn(async (tool) => {
      registered.push(tool)
      if (registered.length === 2) throw new Error('registration failed')
      return undefined
    }) }

    await expect(registerProjectCatalogTools(controller(), abortController)).rejects.toThrow('registration failed')
    expect(abortController.signal.aborted).toBe(true)

    document.modelContext = { registerTool: vi.fn(async (tool) => { registered.push(tool); return undefined }) }
    registered.length = 0
    await registerProjectCatalogTools(controller())
    await expect(registered[0].execute({ ownerId: 'someone-else' })).resolves.toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } })
  })
})
