import { expect, test, type Page } from '@playwright/test'

const runLiveImageSmoke = process.env.ITERUM_RUN_LIVE_IMAGE_TEST === '1' ? test : test.skip

async function installWebMcpRegistry(page: Page) {
  await page.addInitScript(() => {
    const toolRegistry: Record<string, { execute: (input: unknown, context: { signal: AbortSignal }) => unknown }> = {}
    ;(window as typeof window & { __iterumTools?: typeof toolRegistry }).__iterumTools = toolRegistry
    Object.defineProperty(document, 'modelContext', { configurable: true, value: { registerTool: async (tool: { name: string; execute: typeof toolRegistry[string]['execute'] }) => { toolRegistry[tool.name] = tool } } })
  })
}

runLiveImageSmoke('generates one real low-quality image into Review and records its run ledger', async ({ page }) => {
  test.setTimeout(240_000)
  await installWebMcpRegistry(page)
  await page.setViewportSize({ width: 1440, height: 960 })
  await page.goto('/projects')

  const campaignName = `Image smoke ${Date.now()}`
  await page.getByLabel('Campaign name').fill(campaignName)
  await page.getByLabel('Objective').fill('Test a review-first generated image for a modular lighting launch.')
  await page.getByRole('button', { name: 'Create blank project' }).click()
  await expect(page).toHaveURL(/\/projects\/[a-z0-9-]+$/)
  await expect(page.getByText('Cloud · ready', { exact: true })).toBeVisible()
  await expect.poll(() => page.evaluate(() => Object.keys((window as typeof window & { __iterumTools?: Record<string, unknown> }).__iterumTools ?? {}).length)).toBe(51)

  const project = await page.evaluate(async () => {
    const tools = (window as typeof window & { __iterumTools: Record<string, { execute: (input: unknown, context: { signal: AbortSignal }) => Promise<any> }> }).__iterumTools
    const result = await tools.list_campaign_projects.execute({}, { signal: new AbortController().signal })
    return result.data.projects.find((candidate: { projectKey: string }) => document.location.pathname.endsWith(candidate.projectKey))
  }) as { projectKey: string; campaignId: string; boardId: string }

  const brief = await page.evaluate(async (ids) => {
    const tools = (window as typeof window & { __iterumTools: Record<string, { execute: (input: unknown, context: { signal: AbortSignal }) => Promise<any> }> }).__iterumTools
    return tools.update_campaign_brief.execute({
      campaignId: ids.campaignId, boardId: ids.boardId, expectedBoardVersion: 0, idempotencyKey: 'live-image-brief-v1',
      name: 'Signal Relay', line: 'Light becomes a modular signal.',
      brief: {
        objective: 'Launch a sculptural cobalt task lamp through a precise editorial campaign.',
        audience: 'Architects and design-literate lighting buyers.',
        proposition: 'A compact light can reorganize the atmosphere of a room.',
        tone: ['precise', 'kinetic', 'architectural'], mandatoryAssets: ['Cobalt lamp'],
        antiDirections: ['Lifestyle clutter', 'Rendered typography', 'Generic luxury gradients'], schedule: 'Autumn launch',
      },
    }, { signal: new AbortController().signal })
  }, project)
  expect(brief).toMatchObject({ ok: true, boardVersion: 1 })
  await page.getByRole('button', { name: 'Save + lock' }).click()
  await expect(page.getByText('Brief locked by designer', { exact: true })).toBeVisible()

  const proposedRoute = await page.evaluate(async (ids) => {
    const tools = (window as typeof window & { __iterumTools: Record<string, { execute: (input: unknown, context: { signal: AbortSignal }) => Promise<any> }> }).__iterumTools
    const context = await tools.get_campaign_context.execute({ campaignId: ids.campaignId, boardId: ids.boardId }, { signal: new AbortController().signal })
    return tools.propose_creative_routes.execute({
      campaignId: ids.campaignId, boardId: ids.boardId, expectedBoardVersion: context.boardVersion, idempotencyKey: 'live-image-route-v1',
      routes: [{
        id: 'route-signal-relay', name: 'Signal Relay', territory: 'Modular signal',
        thesis: 'A cobalt lamp becomes a compact architectural signal inside a field of warm white space.',
        palette: ['#073B9A', '#F1EFE9', '#171717'], typography: 'Condensed grotesk display with monospaced technical captions.',
        imageTreatment: 'Hard directional light, crisp object edges, long geometric shadows, and restrained editorial grain.',
        compositionPrinciples: ['One dominant object', 'Asymmetric negative space', 'Diagonal shadow rhythm'],
        frame: { position: { x: 40, y: 40 }, width: 1040, height: 820 },
      }],
    }, { signal: new AbortController().signal })
  }, project)
  expect(proposedRoute.ok).toBe(true)
  await page.getByRole('button', { name: 'Approve creative route Signal Relay' }).click()
  await expect(page.getByRole('region', { name: 'Latest action receipt' })).toContainText('Approved creative route “Signal Relay”')

  const referenceUrl = 'https://iterum-topaz.vercel.app/assets/pivot-lamp-product.png'
  const proposedReference = await page.evaluate(async ({ ids, referenceUrl }) => {
    const tools = (window as typeof window & { __iterumTools: Record<string, { execute: (input: unknown, context: { signal: AbortSignal }) => Promise<any> }> }).__iterumTools
    const context = await tools.get_campaign_context.execute({ campaignId: ids.campaignId, boardId: ids.boardId }, { signal: new AbortController().signal })
    return tools.propose_captured_reference.execute({
      campaignId: ids.campaignId, boardId: ids.boardId, expectedBoardVersion: context.boardVersion, idempotencyKey: 'live-image-reference-v1',
      reference: {
        id: 'reference-cobalt-lamp', title: 'Cobalt pivot lamp', imageUrl: referenceUrl, sourceUrl: referenceUrl,
        attribution: 'Iterum synthetic product study', rightsStatus: 'cleared',
        rationale: 'Defines the mandatory cobalt object, hard edge, and compact modular silhouette.', intendedTerritory: 'Modular signal',
        crop: { x: 0, y: 0, width: 100, height: 100 }, captureProvider: 'manual',
      },
    }, { signal: new AbortController().signal })
  }, { ids: project, referenceUrl })
  expect(proposedReference.ok).toBe(true)
  await page.getByRole('button', { name: 'Approve to Modular signal' }).click()
  await page.getByRole('button', { name: 'Layers' }).click()
  await expect(page.getByRole('button', { name: 'Select Cobalt pivot lamp' })).toBeAttached()

  const generated = await page.evaluate(async (ids) => {
    const tools = (window as typeof window & { __iterumTools: Record<string, { execute: (input: unknown, context: { signal: AbortSignal }) => Promise<any> }> }).__iterumTools
    const signal = new AbortController().signal
    const context = await tools.get_campaign_context.execute({ campaignId: ids.campaignId, boardId: ids.boardId }, { signal })
    const board = await tools.get_board_items.execute({ campaignId: ids.campaignId, boardId: ids.boardId }, { signal })
    const reference = board.data.items.find((item: { title: string }) => item.title === 'Cobalt pivot lamp')
    const request = {
      campaignId: ids.campaignId, boardId: ids.boardId, expectedBoardVersion: context.boardVersion, idempotencyKey: 'live-image-generation-v1',
      territoryId: 'route-signal-relay', purpose: 'campaign-image', referenceItemIds: [reference.id],
      prompt: 'Create a new editorial product photograph of this cobalt lamp on a warm-white architectural plinth. Hard afternoon light casts one long diagonal shadow. Keep the scene sparse and tactile, with generous clear space on the upper left for designer-set typography.',
      preserve: ['Cobalt body color', 'Lamp silhouette', 'Recognizable modular construction'],
      avoid: ['Words or letters', 'Logos', 'Lifestyle clutter', 'People', 'Gradient background'],
      aspectRatio: '1:1', quality: 'low', candidateCount: 1,
    }
    const quote = await tools.generate_image_candidates.execute(request, { signal })
    if (!quote.ok) return { quote }
    const result = await tools.generate_image_candidates.execute({ ...request, costApproval: { accepted: true, quoteFingerprint: quote.data.quote.quoteFingerprint } }, { signal })
    if (!result.ok) return { quote, result }
    const ledger = await tools.get_image_generation_run.execute({ campaignId: ids.campaignId, boardId: ids.boardId, runKey: result.data.run.runKey }, { signal })
    return { quote, result, ledger }
  }, project)

  expect(generated.quote).toMatchObject({ ok: true, data: { generationStarted: false, quote: { model: 'gpt-image-2', quality: 'low', imageCount: 1, requiresCostApproval: true } } })
  expect(generated.result).toMatchObject({ ok: true, data: { requiresDesignerApproval: true, run: { status: 'awaiting-review' } } })
  expect(generated.ledger).toMatchObject({ ok: true, data: { run: { operation: 'generate-candidates', status: 'awaiting-review' } } })
  await expect(page.getByText('Generated study', { exact: false })).toBeVisible()
  await expect(page.getByText('Raster image only · never canonical campaign type', { exact: true })).toBeVisible()
  await page.screenshot({ path: 'test-results/iterum-image-generation-live.png', fullPage: true })
  console.log(`IMAGE_SMOKE_PROJECT_URL=${page.url()}`)
  console.log(`IMAGE_SMOKE_RUN_KEY=${generated.result.data.run.runKey}`)
  console.log(`IMAGE_SMOKE_OUTPUT_URL=${generated.result.data.run.outputs[0].imageUrl}`)
})
