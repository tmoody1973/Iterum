import { expect, test, type Page } from '@playwright/test'

async function installWebMcpRegistry(page: Page) {
  await page.addInitScript(() => {
    const toolRegistry: Record<string, { execute: (input: unknown, context: { signal: AbortSignal }) => unknown }> = {}
    ;(window as typeof window & { __iterumTools?: typeof toolRegistry }).__iterumTools = toolRegistry
    Object.defineProperty(document, 'modelContext', { configurable: true, value: { registerTool: async (tool: { name: string; execute: typeof toolRegistry[string]['execute'] }) => { toolRegistry[tool.name] = tool } } })
  })
}

test('separates creative and reviewer WebMCP sessions and syncs the approved brief', async ({ context, page }) => {
  test.setTimeout(60_000)
  await installWebMcpRegistry(page)
  await page.goto('/projects')
  await page.getByLabel('Campaign name').fill(`Reviewer proof ${Date.now()}`)
  await page.getByLabel('Objective').fill('Prove that a separate reviewer agent can approve work without a live user click.')
  await page.getByRole('button', { name: 'Create blank project' }).click()
  await expect(page).toHaveURL(/\/projects\/[a-z0-9-]+$/)
  await expect(page.getByText('Cloud · ready', { exact: true })).toBeVisible()

  const creativeContext = await page.evaluate(async () => {
    const tools = (window as typeof window & { __iterumTools: Record<string, { execute: (input: unknown, context: { signal: AbortSignal }) => Promise<any> }> }).__iterumTools
    const project = (await tools.list_campaign_projects.execute({}, { signal: new AbortController().signal })).data.projects.find((candidate: { projectKey: string }) => document.location.pathname.endsWith(candidate.projectKey))
    const campaign = await tools.get_campaign_context.execute({ campaignId: project.campaignId, boardId: project.boardId }, { signal: new AbortController().signal })
    return { ...project, agentSession: campaign.data.webMcpSession, toolNames: Object.keys(tools) }
  }) as { projectKey: string; campaignId: string; boardId: string; agentSession: { role: string; sessionId: string }; toolNames: string[] }
  expect(creativeContext.agentSession.role).toBe('creative')
  expect(creativeContext.toolNames).toContain('update_campaign_brief')
  expect(creativeContext.toolNames).not.toContain('review_campaign_brief')

  const setupPage = await context.newPage()
  await setupPage.goto(`/projects/${creativeContext.projectKey}/reviewer-setup`)
  await setupPage.getByRole('button', { name: 'Create reviewer pass' }).click()
  const reviewerPath = await setupPage.getByRole('link', { name: 'Open reviewer workspace' }).getAttribute('href')
  expect(reviewerPath).toContain('/review?grant=')

  const reviewerPage = await context.newPage()
  await installWebMcpRegistry(reviewerPage)
  await reviewerPage.goto(reviewerPath!)
  await expect(reviewerPage).toHaveURL(new RegExp(`/projects/${creativeContext.projectKey}/review$`))
  await expect(reviewerPage.getByText('Independent Reviewer Agent', { exact: true })).toBeVisible()

  const reviewerContext = await reviewerPage.evaluate(async ({ campaignId, boardId }) => {
    const tools = (window as typeof window & { __iterumTools: Record<string, { execute: (input: unknown, context: { signal: AbortSignal }) => Promise<any> }> }).__iterumTools
    const campaign = await tools.get_campaign_context.execute({ campaignId, boardId }, { signal: new AbortController().signal })
    return { agentSession: campaign.data.webMcpSession, toolNames: Object.keys(tools) }
  }, creativeContext) as { agentSession: { role: string; sessionId: string }; toolNames: string[] }
  expect(reviewerContext.agentSession).toMatchObject({ role: 'reviewer', independentReviewer: true })
  expect(reviewerContext.agentSession.sessionId).not.toBe(creativeContext.agentSession.sessionId)
  expect(reviewerContext.toolNames).toContain('review_campaign_brief')
  expect(reviewerContext.toolNames).not.toContain('update_campaign_brief')
  expect(reviewerContext.toolNames).not.toContain('generate_image_candidates')

  const proposed = await page.evaluate(async ({ campaignId, boardId }) => {
    const tools = (window as typeof window & { __iterumTools: Record<string, { execute: (input: unknown, context: { signal: AbortSignal }) => Promise<any> }> }).__iterumTools
    return await tools.update_campaign_brief.execute({
      campaignId, boardId, expectedBoardVersion: 0, idempotencyKey: 'reviewer-e2e-brief', name: 'Reviewer proof', line: 'Independent judgment remains visible.',
      brief: { objective: 'Prove independent WebMCP review.', audience: 'Design-tool judges', proposition: 'Creative automation remains accountable.', tone: ['precise'], mandatoryAssets: ['Evidence ledger'], antiDirections: ['Self approval'], schedule: 'Demo day' },
    }, { signal: new AbortController().signal })
  }, creativeContext) as any
  expect(proposed).toMatchObject({ ok: true, boardVersion: 1 })
  await expect(page.getByText('Cloud · saved', { exact: true })).toBeVisible()

  await expect.poll(async () => await reviewerPage.evaluate(async ({ campaignId, boardId }) => {
    const tools = (window as typeof window & { __iterumTools: Record<string, { execute: (input: unknown, context: { signal: AbortSignal }) => Promise<any> }> }).__iterumTools
    return (await tools.get_campaign_context.execute({ campaignId, boardId }, { signal: new AbortController().signal })).boardVersion
  }, creativeContext)).toBe(1)

  const reviewed = await reviewerPage.evaluate(async ({ ids, proposerSessionId }) => {
    const tools = (window as typeof window & { __iterumTools: Record<string, { execute: (input: unknown, context: { signal: AbortSignal }) => Promise<any> }> }).__iterumTools
    return await tools.review_campaign_brief.execute({ campaignId: ids.campaignId, boardId: ids.boardId, expectedBoardVersion: 1, idempotencyKey: 'reviewer-e2e-lock', proposerSessionId, decision: 'approve', rationale: 'The brief is specific, bounded, and ready for reference research.' }, { signal: new AbortController().signal })
  }, { ids: creativeContext, proposerSessionId: creativeContext.agentSession.sessionId }) as any
  expect(reviewed).toMatchObject({ ok: true, boardVersion: 2, receipt: { actor: 'reviewer', proposedBy: { sessionId: creativeContext.agentSession.sessionId }, reviewedBy: { sessionId: reviewerContext.agentSession.sessionId } } })
  await expect(reviewerPage.getByText('Cloud · saved', { exact: true })).toBeVisible()
  await expect(page.getByText('Brief locked by Reviewer Agent', { exact: true })).toBeVisible()
})
