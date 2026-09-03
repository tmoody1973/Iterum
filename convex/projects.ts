import { ConvexError, v } from 'convex/values'

import { mutation, query } from './_generated/server'

const actor = v.union(v.literal('designer'), v.literal('agent'), v.literal('system'))

function assertProjectKey(projectKey: string) {
  if (!/^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$/.test(projectKey)) {
    throw new ConvexError({ code: 'INVALID_PROJECT_KEY', message: 'Project keys must contain 3–80 lowercase letters, numbers, or hyphens.' })
  }
}

function assertWorkspace(workspace: unknown): asserts workspace is {
  campaign: { id: string; boardId: string; name: string }
  version: number
  boardItems: unknown[]
  proposals: unknown[]
  receipts: unknown[]
} {
  if (!workspace || typeof workspace !== 'object') throw new ConvexError({ code: 'INVALID_WORKSPACE', message: 'A workspace document is required.' })
  const value = workspace as Record<string, unknown>
  const campaign = value.campaign as Record<string, unknown> | undefined
  if (!campaign || typeof campaign.id !== 'string' || typeof campaign.boardId !== 'string' || typeof campaign.name !== 'string' || !Number.isInteger(value.version) || !Array.isArray(value.boardItems) || !Array.isArray(value.proposals) || !Array.isArray(value.receipts)) {
    throw new ConvexError({ code: 'INVALID_WORKSPACE', message: 'The workspace document is missing its campaign, version, board items, proposals, or receipts.' })
  }
}

function cleanLabel(label: string) {
  const result = label.trim().replace(/\s+/g, ' ')
  if (!result || result.length > 120) throw new ConvexError({ code: 'INVALID_LABEL', message: 'Version labels must contain 1–120 characters.' })
  return result
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db.query('projects').withIndex('by_updated_at').order('desc').take(50)
    return projects.map((project) => ({
      id: project._id,
      projectKey: project.projectKey,
      name: project.name,
      campaignId: project.campaignId,
      boardId: project.boardId,
      workspaceVersion: project.workspaceVersion,
      headRevision: project.headRevision,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    }))
  },
})

export const get = query({
  args: { projectKey: v.string() },
  handler: async (ctx, args) => {
    assertProjectKey(args.projectKey)
    return await ctx.db.query('projects').withIndex('by_project_key', (q) => q.eq('projectKey', args.projectKey)).unique()
  },
})

export const ensure = mutation({
  args: { projectKey: v.string(), name: v.string(), workspace: v.any(), idempotencyKey: v.string() },
  handler: async (ctx, args) => {
    assertProjectKey(args.projectKey)
    assertWorkspace(args.workspace)
    const existing = await ctx.db.query('projects').withIndex('by_project_key', (q) => q.eq('projectKey', args.projectKey)).unique()
    if (existing) return existing

    const now = Date.now()
    const name = args.name.trim()
    if (!name || name.length > 120) throw new ConvexError({ code: 'INVALID_PROJECT_NAME', message: 'Project names must contain 1–120 characters.' })
    const projectId = await ctx.db.insert('projects', {
      projectKey: args.projectKey,
      name,
      campaignId: args.workspace.campaign.id,
      boardId: args.workspace.campaign.boardId,
      workspace: args.workspace,
      workspaceVersion: args.workspace.version,
      headRevision: 1,
      schemaVersion: 1,
      lastSaveKey: args.idempotencyKey,
      createdAt: now,
      updatedAt: now,
    })
    await ctx.db.insert('boardVersions', {
      projectId,
      boardId: args.workspace.campaign.boardId,
      workspaceVersion: args.workspace.version,
      headRevision: 1,
      label: 'Initial project',
      kind: 'initial',
      actor: 'designer',
      workspace: args.workspace,
      idempotencyKey: args.idempotencyKey,
      createdAt: now,
    })
    return await ctx.db.get(projectId)
  },
})

export const saveWorkspace = mutation({
  args: {
    projectKey: v.string(),
    expectedHeadRevision: v.number(),
    workspace: v.any(),
    idempotencyKey: v.string(),
  },
  handler: async (ctx, args) => {
    assertProjectKey(args.projectKey)
    assertWorkspace(args.workspace)
    const project = await ctx.db.query('projects').withIndex('by_project_key', (q) => q.eq('projectKey', args.projectKey)).unique()
    if (!project) throw new ConvexError({ code: 'PROJECT_NOT_FOUND', message: 'The project no longer exists.' })
    if (project.lastSaveKey === args.idempotencyKey) return project
    if (project.headRevision !== args.expectedHeadRevision) {
      throw new ConvexError({ code: 'HEAD_CONFLICT', message: 'The project changed elsewhere. Reload or restore before saving.', expectedHeadRevision: args.expectedHeadRevision, actualHeadRevision: project.headRevision })
    }
    if (args.workspace.campaign.id !== project.campaignId || args.workspace.campaign.boardId !== project.boardId || args.workspace.version < project.workspaceVersion) {
      throw new ConvexError({ code: 'STALE_WORKSPACE', message: 'The incoming workspace does not match the current project head.' })
    }
    const headRevision = project.headRevision + 1
    const updatedAt = Date.now()
    await ctx.db.patch(project._id, {
      name: args.workspace.campaign.name,
      workspace: args.workspace,
      workspaceVersion: args.workspace.version,
      headRevision,
      lastSaveKey: args.idempotencyKey,
      updatedAt,
    })
    return { ...project, name: args.workspace.campaign.name, workspace: args.workspace, workspaceVersion: args.workspace.version, headRevision, lastSaveKey: args.idempotencyKey, updatedAt }
  },
})

export const createVersion = mutation({
  args: { projectKey: v.string(), expectedHeadRevision: v.number(), label: v.string(), actor, idempotencyKey: v.string() },
  handler: async (ctx, args) => {
    const project = await ctx.db.query('projects').withIndex('by_project_key', (q) => q.eq('projectKey', args.projectKey)).unique()
    if (!project) throw new ConvexError({ code: 'PROJECT_NOT_FOUND', message: 'The project no longer exists.' })
    if (project.lastSnapshotKey === args.idempotencyKey) {
      return await ctx.db.query('boardVersions').withIndex('by_project_and_idempotency', (q) => q.eq('projectId', project._id).eq('idempotencyKey', args.idempotencyKey)).unique()
    }
    if (project.headRevision !== args.expectedHeadRevision) throw new ConvexError({ code: 'HEAD_CONFLICT', message: 'Save the latest project head before creating a version.' })
    const versionId = await ctx.db.insert('boardVersions', {
      projectId: project._id,
      boardId: project.boardId,
      workspaceVersion: project.workspaceVersion,
      headRevision: project.headRevision,
      label: cleanLabel(args.label),
      kind: 'snapshot',
      actor: args.actor,
      workspace: project.workspace,
      idempotencyKey: args.idempotencyKey,
      createdAt: Date.now(),
    })
    await ctx.db.patch(project._id, { lastSnapshotKey: args.idempotencyKey, updatedAt: Date.now() })
    return await ctx.db.get(versionId)
  },
})

export const listVersions = query({
  args: { projectKey: v.string() },
  handler: async (ctx, args) => {
    const project = await ctx.db.query('projects').withIndex('by_project_key', (q) => q.eq('projectKey', args.projectKey)).unique()
    if (!project) return []
    const versions = await ctx.db.query('boardVersions').withIndex('by_project_and_created_at', (q) => q.eq('projectId', project._id)).order('desc').take(50)
    return versions.map((version) => ({ id: version._id, label: version.label, kind: version.kind, actor: version.actor, workspaceVersion: version.workspaceVersion, headRevision: version.headRevision, createdAt: version.createdAt }))
  },
})

export const restoreVersion = mutation({
  args: { projectKey: v.string(), versionId: v.id('boardVersions'), expectedHeadRevision: v.number(), actor, idempotencyKey: v.string() },
  handler: async (ctx, args) => {
    const project = await ctx.db.query('projects').withIndex('by_project_key', (q) => q.eq('projectKey', args.projectKey)).unique()
    if (!project) throw new ConvexError({ code: 'PROJECT_NOT_FOUND', message: 'The project no longer exists.' })
    if (project.lastSaveKey === args.idempotencyKey) return project
    if (project.headRevision !== args.expectedHeadRevision) throw new ConvexError({ code: 'HEAD_CONFLICT', message: 'The project changed elsewhere. Refresh versions before restoring.' })
    const source = await ctx.db.get(args.versionId)
    if (!source || source.projectId !== project._id) throw new ConvexError({ code: 'VERSION_NOT_FOUND', message: 'That version does not belong to this project.' })
    assertWorkspace(source.workspace)
    const restoredWorkspace = { ...source.workspace, version: Math.max(project.workspaceVersion, source.workspace.version) + 1 }
    const now = Date.now()
    const headRevision = project.headRevision + 1
    await ctx.db.insert('boardVersions', {
      projectId: project._id,
      boardId: project.boardId,
      workspaceVersion: project.workspaceVersion,
      headRevision: project.headRevision,
      label: `Before restore to ${source.label}`,
      kind: 'snapshot',
      actor: args.actor,
      workspace: project.workspace,
      idempotencyKey: `${args.idempotencyKey}:previous-head`,
      createdAt: now - 1,
    })
    await ctx.db.patch(project._id, {
      workspace: restoredWorkspace,
      workspaceVersion: restoredWorkspace.version,
      headRevision,
      lastSaveKey: args.idempotencyKey,
      updatedAt: now,
    })
    await ctx.db.insert('boardVersions', {
      projectId: project._id,
      boardId: project.boardId,
      workspaceVersion: restoredWorkspace.version,
      headRevision,
      label: `Restored: ${source.label}`,
      kind: 'restore',
      actor: args.actor,
      workspace: restoredWorkspace,
      sourceVersionId: source._id,
      idempotencyKey: args.idempotencyKey,
      createdAt: now,
    })
    return { ...project, workspace: restoredWorkspace, workspaceVersion: restoredWorkspace.version, headRevision, lastSaveKey: args.idempotencyKey, updatedAt: now }
  },
})
