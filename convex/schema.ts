import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  projects: defineTable({
    projectKey: v.string(),
    name: v.string(),
    campaignId: v.string(),
    boardId: v.string(),
    workspace: v.any(),
    workspaceVersion: v.number(),
    headRevision: v.number(),
    schemaVersion: v.number(),
    lastSaveKey: v.optional(v.string()),
    lastSnapshotKey: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_project_key', ['projectKey'])
    .index('by_updated_at', ['updatedAt']),

  boardVersions: defineTable({
    projectId: v.id('projects'),
    boardId: v.string(),
    workspaceVersion: v.number(),
    headRevision: v.number(),
    label: v.string(),
    kind: v.union(v.literal('initial'), v.literal('snapshot'), v.literal('restore')),
    actor: v.union(v.literal('designer'), v.literal('agent'), v.literal('system')),
    workspace: v.any(),
    sourceVersionId: v.optional(v.id('boardVersions')),
    idempotencyKey: v.string(),
    createdAt: v.number(),
  })
    .index('by_project', ['projectId'])
    .index('by_project_and_created_at', ['projectId', 'createdAt'])
    .index('by_project_and_idempotency', ['projectId', 'idempotencyKey']),

  assets: defineTable({
    projectId: v.id('projects'),
    assetKey: v.string(),
    filename: v.string(),
    mediaType: v.string(),
    sourceUrl: v.optional(v.string()),
    attribution: v.optional(v.string()),
    rightsStatus: v.union(v.literal('cleared'), v.literal('reference-only'), v.literal('uncertain')),
    storageId: v.optional(v.id('_storage')),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_project', ['projectId'])
    .index('by_project_and_asset_key', ['projectId', 'assetKey']),

  webmcpRuns: defineTable({
    projectId: v.id('projects'),
    toolName: v.string(),
    status: v.union(v.literal('started'), v.literal('succeeded'), v.literal('failed'), v.literal('awaiting-review')),
    input: v.any(),
    output: v.optional(v.any()),
    error: v.optional(v.string()),
    boardVersionBefore: v.number(),
    boardVersionAfter: v.optional(v.number()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index('by_project', ['projectId'])
    .index('by_project_and_created_at', ['projectId', 'createdAt']),
})
