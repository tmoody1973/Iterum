import { describe, expect, it, vi } from 'vitest'

import { createDemoWorkspaceState } from '../domain/demo-data'
import { createWorkspaceRuntime } from '../domain/workspace-runtime'
import type { ProjectController, ReviewerGrantSession } from '../persistence/project-controller'
import { createReviewerTools } from './register-review-tools'
import { registerIterumTools } from './register-tools'

const grant: ReviewerGrantSession = {
  projectKey: 'demo-project',
  grantKey: `review_${'b'.repeat(64)}`,
  creativeSessionId: 'creative-agent-one',
  reviewerSessionId: 'reviewer-agent-two',
  costCeilingUsd: 0.25,
  expiresAt: Date.now() + 60_000,
}

function setup() {
  const runtime = createWorkspaceRuntime(createDemoWorkspaceState())
  const validate = vi.fn(async () => undefined)
  const authorizeCost = vi.fn(async (_session, input) => ({
    accepted: true as const,
    quoteFingerprint: input.quoteFingerprint,
    generationIdempotencyKey: input.generationIdempotencyKey,
    proposerSessionId: grant.creativeSessionId,
    reviewerSessionId: grant.reviewerSessionId,
    expiresAt: Date.now() + 60_000,
  }))
  const projectController = { reviewerGrants: { create: vi.fn(), validate, authorizeCost, revoke: vi.fn() } } as unknown as ProjectController
  const tools = createReviewerTools(runtime, { role: 'reviewer', sessionId: grant.reviewerSessionId, reviewerGrant: grant }, projectController)
  return { runtime, validate, authorizeCost, tools }
}

describe('independent reviewer WebMCP tools', () => {
  it('registers reviewer and read tools without exposing creative mutation tools', async () => {
    const { runtime } = setup()
    const names: string[] = []
    document.modelContext = { registerTool: vi.fn(async (tool) => { names.push(tool.name); return undefined }) }
    const projectController = {
      reviewerGrants: {
        create: vi.fn(),
        validate: vi.fn(async () => undefined),
        authorizeCost: vi.fn(),
        revoke: vi.fn(),
      },
    } as unknown as ProjectController
    await registerIterumTools(runtime, new AbortController(), undefined, undefined, undefined, projectController, { role: 'reviewer', sessionId: grant.reviewerSessionId, reviewerGrant: grant })
    expect(names).toEqual(expect.arrayContaining(['get_campaign_context', 'review_campaign_brief', 'review_reference_proposal', 'authorize_image_generation_quote']))
    expect(names).not.toEqual(expect.arrayContaining(['update_campaign_brief', 'propose_reference', 'generate_image_candidates', 'create_campaign_project']))
  })

  it('validates the server grant before approving and records both sessions', async () => {
    const { runtime, validate, tools } = setup()
    const tool = tools.find((entry) => entry.name === 'review_reference_proposal')!
    const result = await tool.execute({
      campaignId: 'campaign-static-bloom', boardId: 'board-static-bloom', expectedBoardVersion: 3,
      idempotencyKey: 'review-reference-one', proposerSessionId: grant.creativeSessionId,
      decision: 'approve', rationale: 'The source and rights metadata are sufficient for direction review.', proposalId: 'proposal-resin',
    }, { signal: new AbortController().signal }) as any
    expect(validate).toHaveBeenCalledWith(grant, 'review_reference_proposal')
    expect(result).toMatchObject({ ok: true, receipt: { actor: 'reviewer', proposedBy: { sessionId: grant.creativeSessionId }, reviewedBy: { sessionId: grant.reviewerSessionId } } })
    expect(runtime.getSnapshot().proposals[0].status).toBe('approved')
  })

  it('rejects a self-review session before any server mutation', async () => {
    const { validate, tools } = setup()
    const tool = tools.find((entry) => entry.name === 'review_reference_proposal')!
    const result = await tool.execute({
      campaignId: 'campaign-static-bloom', boardId: 'board-static-bloom', expectedBoardVersion: 3,
      idempotencyKey: 'self-review', proposerSessionId: grant.reviewerSessionId,
      decision: 'approve', rationale: 'This should never pass the independent reviewer boundary.', proposalId: 'proposal-resin',
    }, { signal: new AbortController().signal }) as any
    expect(result).toMatchObject({ ok: false, error: { code: 'INVALID_REVIEW_SESSION' } })
    expect(validate).not.toHaveBeenCalled()
  })

  it('authorizes only the exact quote under the delegated ceiling', async () => {
    const { authorizeCost, tools } = setup()
    const tool = tools.find((entry) => entry.name === 'authorize_image_generation_quote')!
    const result = await tool.execute({
      campaignId: 'campaign-static-bloom', boardId: 'board-static-bloom', expectedBoardVersion: 3,
      idempotencyKey: 'authorize-cost-one', proposerSessionId: grant.creativeSessionId,
      decision: 'approve', rationale: 'One low-quality study is justified for the selected territory.',
      quoteFingerprint: 'imgq-v1-demo', generationIdempotencyKey: 'generation-one', estimatedOutputUsd: 0.006, costCeilingUsd: 0.25,
    }, { signal: new AbortController().signal }) as any
    expect(authorizeCost).toHaveBeenCalledWith(grant, expect.objectContaining({ quoteFingerprint: 'imgq-v1-demo', generationIdempotencyKey: 'generation-one', estimatedOutputUsd: 0.006 }))
    expect(result).toMatchObject({ ok: true, data: { costApproval: { accepted: true, generationIdempotencyKey: 'generation-one', proposerSessionId: grant.creativeSessionId, reviewerSessionId: grant.reviewerSessionId } } })
  })
})
