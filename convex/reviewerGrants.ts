import { getAuthUserId } from '@convex-dev/auth/server'
import { ConvexError, v } from 'convex/values'

import { internal } from './_generated/api'
import { action, internalMutation, mutation, query } from './_generated/server'

const MAX_GRANT_MINUTES = 4 * 60
const MAX_COST_CEILING_USD = 5

function secureToken(prefix: string) {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const encoded = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${prefix}_${encoded}`
}

function cleanSession(value: string, label: string) {
  const result = value.trim()
  if (result.length < 3 || result.length > 120) throw new ConvexError({ code: 'INVALID_REVIEW_SESSION', message: `${label} must contain 3–120 characters.` })
  return result
}

export const create = action({
  args: {
    projectKey: v.string(),
    creativeSessionId: v.string(),
    reviewerSessionId: v.string(),
    expiresInMinutes: v.number(),
    costCeilingUsd: v.number(),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<any> => {
    const ownerId = await getAuthUserId(ctx)
    if (!ownerId) throw new ConvexError({ code: 'UNAUTHENTICATED', message: 'Open the owner workspace before creating a reviewer pass.' })
    return await ctx.runMutation(internal.reviewerGrants.insertGrant, {
      ...args,
      ownerId,
      grantKey: secureToken('review'),
    })
  },
})

export const insertGrant = internalMutation({
  args: {
    ownerId: v.id('users'),
    projectKey: v.string(),
    grantKey: v.string(),
    creativeSessionId: v.string(),
    reviewerSessionId: v.string(),
    expiresInMinutes: v.number(),
    costCeilingUsd: v.number(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const creativeSessionId = cleanSession(args.creativeSessionId, 'Creative session')
    const reviewerSessionId = cleanSession(args.reviewerSessionId, 'Reviewer session')
    if (creativeSessionId === reviewerSessionId) throw new ConvexError({ code: 'INVALID_REVIEW_SESSION', message: 'The reviewer must use a session distinct from the creative proposer.' })
    if (!Number.isFinite(args.expiresInMinutes) || args.expiresInMinutes < 5 || args.expiresInMinutes > MAX_GRANT_MINUTES) throw new ConvexError({ code: 'INVALID_GRANT_EXPIRY', message: 'Reviewer passes may last from 5 minutes to 4 hours.' })
    if (!Number.isFinite(args.costCeilingUsd) || args.costCeilingUsd < 0 || args.costCeilingUsd > MAX_COST_CEILING_USD) throw new ConvexError({ code: 'INVALID_COST_CEILING', message: `Reviewer cost authority must be between $0 and $${MAX_COST_CEILING_USD}.` })
    const project = await ctx.db.query('projects').withIndex('by_project_key', (q) => q.eq('projectKey', args.projectKey)).unique()
    if (!project || project.ownerId !== args.ownerId) throw new ConvexError({ code: 'PROJECT_NOT_FOUND', message: 'The owner project is unavailable.' })
    const createdAt = Date.now()
    const expiresAt = createdAt + args.expiresInMinutes * 60_000
    const reviewerGrantId = await ctx.db.insert('reviewerGrants', {
      projectId: project._id,
      ownerId: args.ownerId,
      grantKey: args.grantKey,
      creativeSessionId,
      reviewerSessionId,
      costCeilingUsd: args.costCeilingUsd,
      expiresAt,
      status: 'active',
      createdAt,
    })
    return { reviewerGrantId, grantKey: args.grantKey, projectKey: args.projectKey, creativeSessionId, reviewerSessionId, costCeilingUsd: args.costCeilingUsd, expiresAt }
  },
})

export const validateReview = query({
  args: {
    projectKey: v.string(),
    grantKey: v.string(),
    creativeSessionId: v.string(),
    reviewerSessionId: v.string(),
    action: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const ownerId = await getAuthUserId(ctx)
    if (!ownerId) throw new ConvexError({ code: 'UNAUTHENTICATED', message: 'The reviewer pass requires the owner browser session.' })
    const project = await ctx.db.query('projects').withIndex('by_project_key', (q) => q.eq('projectKey', args.projectKey)).unique()
    const grant = await ctx.db.query('reviewerGrants').withIndex('by_grant_key', (q) => q.eq('grantKey', args.grantKey)).unique()
    if (!project || !grant || project.ownerId !== ownerId || grant.projectId !== project._id || grant.ownerId !== ownerId || grant.status !== 'active' || grant.expiresAt <= Date.now() || grant.creativeSessionId !== args.creativeSessionId || grant.reviewerSessionId !== args.reviewerSessionId || args.creativeSessionId === args.reviewerSessionId) {
      throw new ConvexError({ code: 'INVALID_REVIEWER_GRANT', message: 'This reviewer pass is invalid, expired, or not scoped to these two agent sessions.' })
    }
    return { valid: true, action: args.action, projectKey: args.projectKey, creativeSessionId: grant.creativeSessionId, reviewerSessionId: grant.reviewerSessionId, costCeilingUsd: grant.costCeilingUsd, expiresAt: grant.expiresAt }
  },
})

export const resolve = query({
  args: { projectKey: v.string(), grantKey: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const ownerId = await getAuthUserId(ctx)
    if (!ownerId) throw new ConvexError({ code: 'UNAUTHENTICATED', message: 'The reviewer pass requires the owner browser session.' })
    const project = await ctx.db.query('projects').withIndex('by_project_key', (q) => q.eq('projectKey', args.projectKey)).unique()
    const grant = await ctx.db.query('reviewerGrants').withIndex('by_grant_key', (q) => q.eq('grantKey', args.grantKey)).unique()
    if (!project || !grant || project.ownerId !== ownerId || grant.projectId !== project._id || grant.ownerId !== ownerId || grant.status !== 'active' || grant.expiresAt <= Date.now()) return null
    return { projectKey: args.projectKey, grantKey: args.grantKey, creativeSessionId: grant.creativeSessionId, reviewerSessionId: grant.reviewerSessionId, costCeilingUsd: grant.costCeilingUsd, expiresAt: grant.expiresAt }
  },
})

export const authorizeCost = action({
  args: {
    projectKey: v.string(),
    grantKey: v.string(),
    creativeSessionId: v.string(),
    reviewerSessionId: v.string(),
    quoteFingerprint: v.string(),
    generationIdempotencyKey: v.string(),
    estimatedOutputUsd: v.number(),
    rationale: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<any> => {
    const ownerId = await getAuthUserId(ctx)
    if (!ownerId) throw new ConvexError({ code: 'UNAUTHENTICATED', message: 'The reviewer pass requires the owner browser session.' })
    return await ctx.runMutation(internal.reviewerGrants.insertCostAuthorization, {
      ...args,
      ownerId,
    })
  },
})

export const insertCostAuthorization = internalMutation({
  args: {
    ownerId: v.id('users'),
    projectKey: v.string(),
    grantKey: v.string(),
    creativeSessionId: v.string(),
    reviewerSessionId: v.string(),
    quoteFingerprint: v.string(),
    generationIdempotencyKey: v.string(),
    estimatedOutputUsd: v.number(),
    rationale: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const project = await ctx.db.query('projects').withIndex('by_project_key', (q) => q.eq('projectKey', args.projectKey)).unique()
    const grant = await ctx.db.query('reviewerGrants').withIndex('by_grant_key', (q) => q.eq('grantKey', args.grantKey)).unique()
    const rationale = args.rationale.trim()
    if (!project || !grant || project.ownerId !== args.ownerId || grant.projectId !== project._id || grant.ownerId !== args.ownerId || grant.status !== 'active' || grant.expiresAt <= Date.now() || grant.creativeSessionId !== args.creativeSessionId || grant.reviewerSessionId !== args.reviewerSessionId || args.creativeSessionId === args.reviewerSessionId) throw new ConvexError({ code: 'INVALID_REVIEWER_GRANT', message: 'This reviewer pass cannot authorize generation.' })
    if (!args.quoteFingerprint || !args.generationIdempotencyKey || !Number.isFinite(args.estimatedOutputUsd) || args.estimatedOutputUsd < 0 || args.estimatedOutputUsd > grant.costCeilingUsd || rationale.length < 12 || rationale.length > 500) throw new ConvexError({ code: 'COST_APPROVAL_REQUIRED', message: 'The exact quote, bounded cost, generation key, and reviewer rationale are required.' })
    const existing = await ctx.db.query('generationAuthorizations').withIndex('by_project_and_generation_key', (q) => q.eq('projectId', project._id).eq('generationIdempotencyKey', args.generationIdempotencyKey)).unique()
    if (existing) {
      if (existing.quoteFingerprint !== args.quoteFingerprint || existing.proposerSessionId !== args.creativeSessionId || existing.reviewerSessionId !== args.reviewerSessionId) throw new ConvexError({ code: 'IDEMPOTENCY_CONFLICT', message: 'That generation key is already bound to a different approval.' })
      return { authorizationId: existing._id, quoteFingerprint: existing.quoteFingerprint, generationIdempotencyKey: existing.generationIdempotencyKey, expiresAt: existing.expiresAt }
    }
    const priorAuthorizations = await ctx.db.query('generationAuthorizations').withIndex('by_reviewer_grant', (q) => q.eq('reviewerGrantId', grant._id)).collect()
    const authorizedTotal = priorAuthorizations.reduce((total, authorization) => total + authorization.estimatedOutputUsd, 0)
    if (Number((authorizedTotal + args.estimatedOutputUsd).toFixed(3)) > grant.costCeilingUsd) throw new ConvexError({ code: 'COST_CEILING_EXCEEDED', message: 'This quote would exceed the reviewer pass total generation ceiling.' })
    const createdAt = Date.now()
    const expiresAt = Math.min(grant.expiresAt, createdAt + 30 * 60_000)
    const authorizationId = await ctx.db.insert('generationAuthorizations', {
      projectId: project._id,
      reviewerGrantId: grant._id,
      quoteFingerprint: args.quoteFingerprint,
      generationIdempotencyKey: args.generationIdempotencyKey,
      estimatedOutputUsd: args.estimatedOutputUsd,
      proposerSessionId: args.creativeSessionId,
      reviewerSessionId: args.reviewerSessionId,
      rationale,
      expiresAt,
      createdAt,
    })
    await ctx.db.patch(grant._id, { lastUsedAt: createdAt })
    return { authorizationId, quoteFingerprint: args.quoteFingerprint, generationIdempotencyKey: args.generationIdempotencyKey, expiresAt }
  },
})

export const consumeCostAuthorization = internalMutation({
  args: {
    ownerId: v.id('users'),
    projectKey: v.string(),
    quoteFingerprint: v.string(),
    generationIdempotencyKey: v.string(),
    estimatedOutputUsd: v.number(),
    proposerSessionId: v.string(),
    reviewerSessionId: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const project = await ctx.db.query('projects').withIndex('by_project_key', (q) => q.eq('projectKey', args.projectKey)).unique()
    const authorization = project ? await ctx.db.query('generationAuthorizations').withIndex('by_project_and_generation_key', (q) => q.eq('projectId', project._id).eq('generationIdempotencyKey', args.generationIdempotencyKey)).unique() : null
    if (!project || project.ownerId !== args.ownerId || !authorization || authorization.projectId !== project._id || authorization.quoteFingerprint !== args.quoteFingerprint || authorization.generationIdempotencyKey !== args.generationIdempotencyKey || authorization.estimatedOutputUsd !== args.estimatedOutputUsd || authorization.proposerSessionId !== args.proposerSessionId || authorization.reviewerSessionId !== args.reviewerSessionId || args.proposerSessionId === args.reviewerSessionId || authorization.expiresAt <= Date.now()) throw new ConvexError({ code: 'COST_APPROVAL_REQUIRED', message: 'A current independent-reviewer authorization for this exact quote and session pair is required.' })
    if (!authorization.consumedAt) await ctx.db.patch(authorization._id, { consumedAt: Date.now() })
    return { valid: true, reviewerSessionId: authorization.reviewerSessionId, proposerSessionId: authorization.proposerSessionId, authorizationId: authorization._id }
  },
})

export const revoke = mutation({
  args: { projectKey: v.string(), grantKey: v.string() },
  handler: async (ctx, args) => {
    const ownerId = await getAuthUserId(ctx)
    if (!ownerId) throw new ConvexError({ code: 'UNAUTHENTICATED', message: 'Open the owner workspace.' })
    const project = await ctx.db.query('projects').withIndex('by_project_key', (q) => q.eq('projectKey', args.projectKey)).unique()
    const grant = await ctx.db.query('reviewerGrants').withIndex('by_grant_key', (q) => q.eq('grantKey', args.grantKey)).unique()
    if (!project || !grant || project.ownerId !== ownerId || grant.projectId !== project._id) throw new ConvexError({ code: 'INVALID_REVIEWER_GRANT', message: 'Reviewer pass not found.' })
    await ctx.db.patch(grant._id, { status: 'revoked' })
    return { revoked: true }
  },
})
