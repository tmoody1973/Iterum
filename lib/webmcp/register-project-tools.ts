import type { WebMCPTool } from '../../types/webmcp'
import type { ProjectCatalogController } from '../persistence/project-controller'
import type { RegisteredTools } from './types'

const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const hasExactKeys = (value: Record<string, unknown>, allowed: string[]) => Object.keys(value).every((key) => allowed.includes(key))
const validProjectKey = (value: unknown): value is string => typeof value === 'string' && /^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$/.test(value)

function success<T>(data: T, summary: string, uiUpdated = false) {
  return { ok: true, schemaVersion: '1.0', scope: 'project-catalog', data, summary, ui: { updated: uiUpdated } }
}

function failure(code: string, message: string, retryable = false) {
  return { ok: false, schemaVersion: '1.0', scope: 'project-catalog', error: { code, message, retryable } }
}

export async function registerProjectCatalogTools(projects: ProjectCatalogController, controller = new AbortController()): Promise<RegisteredTools | null> {
  if (!document.modelContext) return null
  const tools: WebMCPTool[] = [
    {
      name: 'list_campaign_projects', title: 'List Iterum projects', description: 'List the authenticated designer’s recent cloud-backed Iterum projects. This does not expose another designer’s projects.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: async (input) => {
        if (!isObject(input) || !hasExactKeys(input, [])) return failure('VALIDATION_ERROR', 'This tool accepts no fields.')
        try { const items = await projects.listProjects(); return success({ projects: items }, `Found ${items.length} private cloud project${items.length === 1 ? '' : 's'}.`) }
        catch (error) { return failure('PERSISTENCE_UNAVAILABLE', error instanceof Error ? error.message : 'Projects could not be listed.', true) }
      },
    },
    {
      name: 'create_campaign_project', title: 'Create a blank campaign project', description: 'Create a blank cloud campaign owned by the authenticated designer. It creates no references, routes, palette, typography, or applications.',
      inputSchema: { type: 'object', properties: { name: { type: 'string', minLength: 1, maxLength: 120 }, objective: { type: 'string', minLength: 1, maxLength: 500 }, idempotencyKey: { type: 'string', minLength: 1, maxLength: 120 } }, required: ['name', 'objective', 'idempotencyKey'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: async (input) => {
        if (!isObject(input) || !hasExactKeys(input, ['name', 'objective', 'idempotencyKey']) || typeof input.name !== 'string' || !input.name.trim() || input.name.length > 120 || typeof input.objective !== 'string' || !input.objective.trim() || input.objective.length > 500 || typeof input.idempotencyKey !== 'string' || !input.idempotencyKey || input.idempotencyKey.length > 120) return failure('VALIDATION_ERROR', 'Provide a campaign name, objective, and stable idempotency key.')
        try {
          const project = await projects.createProject({ name: input.name.trim(), objective: input.objective.trim(), idempotencyKey: input.idempotencyKey })
          return success({ project, openWith: { tool: 'open_campaign_project', projectKey: project.projectKey } }, `Created private cloud project “${project.name}”.`, true)
        } catch (error) { return failure('PROJECT_CREATE_FAILED', error instanceof Error ? error.message : 'The project could not be created.', true) }
      },
    },
    {
      name: 'open_campaign_project', title: 'Open an Iterum project', description: 'Open one owned cloud project in the visible Iterum workspace without modifying its campaign content.',
      inputSchema: { type: 'object', properties: { projectKey: { type: 'string', minLength: 3, maxLength: 80, pattern: '^[a-z0-9][a-z0-9-]+[a-z0-9]$' } }, required: ['projectKey'], additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: (input) => {
        if (!isObject(input) || !hasExactKeys(input, ['projectKey']) || !validProjectKey(input.projectKey)) return failure('VALIDATION_ERROR', 'Provide one valid projectKey.')
        projects.openProject(input.projectKey)
        return success({ projectKey: input.projectKey, canonicalStateChanged: false }, `Opening private cloud project ${input.projectKey}.`, true)
      },
    },
  ]
  try { for (const tool of tools) await document.modelContext.registerTool(tool, { signal: controller.signal }) }
  catch (error) { controller.abort(); throw error }
  return { controller, count: tools.length }
}
