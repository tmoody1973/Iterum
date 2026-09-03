import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { authTables } from '@convex-dev/auth/server'

export default defineSchema({
  ...authTables,
  projects: defineTable({
    // Optional only while pre-authentication projects are claimed by their first owner.
    ownerId: v.optional(v.id('users')),
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
    .index('by_owner_and_updated_at', ['ownerId', 'updatedAt'])
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

  imageGenerationRuns: defineTable({
    projectId: v.id('projects'),
    runKey: v.string(),
    idempotencyKey: v.string(),
    requestHash: v.string(),
    operation: v.union(v.literal('generate-candidates'), v.literal('edit-candidate'), v.literal('generate-applications')),
    status: v.union(v.literal('running'), v.literal('generated'), v.literal('awaiting-review'), v.literal('failed')),
    model: v.literal('gpt-image-2'),
    quality: v.union(v.literal('low'), v.literal('medium'), v.literal('high')),
    territoryId: v.string(),
    purpose: v.string(),
    prompt: v.string(),
    preserve: v.array(v.string()),
    avoid: v.array(v.string()),
    referenceItemIds: v.array(v.string()),
    outputSpecs: v.any(),
    costQuote: v.any(),
    boardVersionBefore: v.number(),
    boardVersionAfter: v.optional(v.number()),
    proposalIds: v.array(v.string()),
    outputs: v.any(),
    requestId: v.optional(v.string()),
    error: v.optional(v.any()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index('by_project_and_run_key', ['projectId', 'runKey'])
    .index('by_project_and_idempotency', ['projectId', 'idempotencyKey'])
    .index('by_project_and_created_at', ['projectId', 'createdAt']),

  generatedImageAssets: defineTable({
    projectId: v.id('projects'),
    runId: v.id('imageGenerationRuns'),
    assetKey: v.string(),
    parentAssetKey: v.optional(v.string()),
    version: v.number(),
    label: v.string(),
    storageId: v.id('_storage'),
    imageUrl: v.string(),
    mediaType: v.literal('image/webp'),
    width: v.number(),
    height: v.number(),
    purpose: v.string(),
    applicationFormat: v.optional(v.union(v.literal('poster-4:5'), v.literal('story-9:16'), v.literal('landing-hero-16:9'), v.literal('square-1:1'))),
    model: v.literal('gpt-image-2'),
    prompt: v.string(),
    referenceItemIds: v.array(v.string()),
    createdAt: v.number(),
  })
    .index('by_project_and_asset_key', ['projectId', 'assetKey'])
    .index('by_project_and_created_at', ['projectId', 'createdAt']),
})
