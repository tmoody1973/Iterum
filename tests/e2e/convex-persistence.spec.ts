import { expect, test } from '@playwright/test'

test('creates a blank cloud campaign, autosaves, reloads, snapshots, and restores a new head', async ({ page }) => {
  await page.addInitScript(() => {
    const toolRegistry: Record<string, { execute: (input: unknown, context: { signal: AbortSignal }) => unknown }> = {}
    ;(window as typeof window & { __iterumTools?: typeof toolRegistry }).__iterumTools = toolRegistry
    Object.defineProperty(document, 'modelContext', { configurable: true, value: { registerTool: async (tool: { name: string; execute: typeof toolRegistry[string]['execute'] }) => { toolRegistry[tool.name] = tool } } })
  })
  await page.setViewportSize({ width: 1440, height: 960 })
  await page.goto('/projects')
  const campaignName = `Cloud proof ${Date.now()}`
  await page.getByLabel('Campaign name').fill(campaignName)
  await page.getByLabel('Objective').fill('Prove that a professional campaign can begin blank, save durably, and recover an earlier direction.')
  await page.getByRole('button', { name: 'Create blank project' }).click()
  await expect(page).toHaveURL(/\/projects\/[a-z0-9-]+$/)
  const reviewUrl = page.url()
  await expect(page.getByText('Cloud · ready', { exact: true })).toBeVisible()
  await expect.poll(() => page.evaluate(() => Object.keys((window as typeof window & { __iterumTools?: Record<string, unknown> }).__iterumTools ?? {}).length)).toBe(47)

  const firstSave = await page.evaluate(async () => {
    const tools = (window as typeof window & { __iterumTools: Record<string, { execute: (input: unknown, context: { signal: AbortSignal }) => Promise<unknown> }> }).__iterumTools
    const summary = document.querySelector('.mechanical-meta span:nth-child(2)')?.textContent ?? ''
    const boardSummary = document.querySelector('.board-semantic-outline')?.textContent ?? ''
    return { toolNames: Object.keys(tools), summary, boardSummary }
  })
  expect(firstSave.toolNames).toEqual(expect.arrayContaining(['create_campaign_project', 'get_project_save_status', 'create_board_snapshot', 'list_board_versions', 'restore_board_version']))

  const contextIds = await page.evaluate(() => {
    const text = document.querySelector('.board-semantic-outline')?.textContent ?? ''
    const workspace = document.querySelector('[data-testid="iterum-workspace"]')
    return { text, campaignName: workspace ? document.querySelector('.crumbs')?.textContent ?? '' : '' }
  })
  expect(contextIds.campaignName).toContain(campaignName)

  const saved = await page.evaluate(async () => {
    const tools = (window as typeof window & { __iterumTools: Record<string, { execute: (input: unknown, context: { signal: AbortSignal }) => Promise<unknown> }> }).__iterumTools
    const context = { signal: new AbortController().signal }
    const projects = await tools.list_campaign_projects.execute({}, context) as { data: { projects: Array<{ name: string; campaignId: string; boardId: string; projectKey: string }> } }
    const open = projects.data.projects.find((project) => document.location.pathname.endsWith(project.projectKey))!
    const response = await tools.update_campaign_brief.execute({
      campaignId: open.campaignId, boardId: open.boardId, expectedBoardVersion: 0, idempotencyKey: 'e2e-cloud-brief-v1', name: open.name, line: 'Direction one survives reload.',
      brief: { objective: 'Prove durable campaign recovery.', audience: 'Independent creative directors', proposition: 'Direction work remains trustworthy across sessions.', tone: ['precise'], mandatoryAssets: ['Campaign wordmark'], antiDirections: ['Generic moodboard'], schedule: 'October launch' },
    }, context) as { ok: boolean; boardVersion: number }
    return { open, response }
  })
  expect(saved.response).toMatchObject({ ok: true, boardVersion: 1 })
  await expect(page.getByText('Cloud · saved', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Working line')).toHaveValue('Direction one survives reload.')
  await expect.poll(() => page.evaluate(() => Object.keys((window as typeof window & { __iterumTools?: Record<string, unknown> }).__iterumTools ?? {}).length)).toBe(47)

  const checkpoint = await page.evaluate(async ({ campaignId, boardId }) => {
    const tools = (window as typeof window & { __iterumTools: Record<string, { execute: (input: unknown, context: { signal: AbortSignal }) => Promise<unknown> }> }).__iterumTools
    const context = { signal: new AbortController().signal }
    const created = await tools.create_board_snapshot.execute({ campaignId, boardId, expectedBoardVersion: 1, idempotencyKey: 'e2e-cloud-snapshot-v1', label: 'Approved direction one' }, context) as { data: { version: { id: string } } }
    return created.data.version
  }, saved.open)

  const secondSave = await page.evaluate(async ({ campaignId, boardId, name }) => {
    const tools = (window as typeof window & { __iterumTools: Record<string, { execute: (input: unknown, context: { signal: AbortSignal }) => Promise<unknown> }> }).__iterumTools
    return await tools.update_campaign_brief.execute({
      campaignId, boardId, expectedBoardVersion: 1, idempotencyKey: 'e2e-cloud-brief-v2', name, line: 'Direction two is temporary.',
      brief: { objective: 'Prove durable campaign recovery.', audience: 'Independent creative directors', proposition: 'Direction work remains trustworthy across sessions.', tone: ['precise'], mandatoryAssets: ['Campaign wordmark'], antiDirections: ['Generic moodboard'], schedule: 'October launch' },
    }, { signal: new AbortController().signal }) as { ok: boolean; boardVersion: number }
  }, saved.open)
  expect(secondSave).toMatchObject({ ok: true, boardVersion: 2 })
  await expect(page.getByText('Cloud · saved', { exact: true })).toBeVisible()

  const restored = await page.evaluate(async ({ campaignId, boardId, versionId }) => {
    const tools = (window as typeof window & { __iterumTools: Record<string, { execute: (input: unknown, context: { signal: AbortSignal }) => Promise<unknown> }> }).__iterumTools
    return await tools.restore_board_version.execute({ campaignId, boardId, expectedBoardVersion: 2, idempotencyKey: 'e2e-cloud-restore-v1', versionId }, { signal: new AbortController().signal }) as { ok: boolean; boardVersion: number }
  }, { ...saved.open, versionId: checkpoint.id })
  expect(restored).toMatchObject({ ok: true, boardVersion: 3 })
  await expect(page.getByLabel('Working line')).toHaveValue('Direction one survives reload.')
  await page.reload()
  await expect(page.getByLabel('Working line')).toHaveValue('Direction one survives reload.')
  await expect(page.getByText('Cloud · ready', { exact: true })).toBeVisible()
  console.log(`CLOUD_PROJECT_REVIEW_URL=${reviewUrl}`)
})
