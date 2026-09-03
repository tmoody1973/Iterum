import { expect, test } from '@playwright/test'

const browserFailures = new WeakMap<object, string[]>()

test.beforeEach(async ({ page }) => {
  const failures: string[] = []
  browserFailures.set(page, failures)
  page.on('console', (message) => {
    if (message.type() === 'warning' || message.type() === 'error') failures.push(`console ${message.type()}: ${message.text()}`)
  })
  page.on('pageerror', (error) => failures.push(`page error: ${error.message}`))
  page.on('requestfailed', (request) => failures.push(`network failure: ${request.url()} (${request.failure()?.errorText ?? 'unknown'})`))
  page.on('response', (response) => {
    if (response.status() >= 400) failures.push(`network ${response.status()}: ${response.url()}`)
  })
})

test.afterEach(async ({ page }) => {
  expect(browserFailures.get(page), 'browser console, page, and network failures').toEqual([])
})

for (const viewport of [{ width: 1536, height: 1024 }, { width: 1280, height: 900 }]) test(`designer visibly approves and reverses a sourced proposal at ${viewport.width}px`, async ({ page }) => {
  await page.setViewportSize(viewport)
  await page.goto('/')

  await expect(page.getByRole('complementary', { name: 'Campaign job ticket' })).toBeVisible()
  await expect(page.getByRole('main', { name: 'Working mechanical' })).toBeVisible()
  await expect(page.getByRole('complementary', { name: 'Review tray' })).toBeVisible()
  await expect(page.locator('.mechanical-meta').getByText('7 items', { exact: true })).toBeVisible()
  const mechanical = page.getByRole('main', { name: 'Working mechanical' })
  const preview = page.getByTestId('proposal-placement')
  await expect(preview).toBeVisible()
  await expect(preview).toHaveClass(/is-preview/)
  const initialBox = await preview.boundingBox()
  const mechanicalBox = await mechanical.boundingBox()
  expect(initialBox).not.toBeNull()
  expect(mechanicalBox).not.toBeNull()
  expect(initialBox!.x).toBeGreaterThanOrEqual(mechanicalBox!.x)
  expect(initialBox!.y).toBeGreaterThanOrEqual(mechanicalBox!.y)
  expect(initialBox!.x + initialBox!.width).toBeLessThanOrEqual(mechanicalBox!.x + mechanicalBox!.width)
  expect(initialBox!.y + initialBox!.height).toBeLessThanOrEqual(mechanicalBox!.y + mechanicalBox!.height)
  const destination = await preview.getAttribute('data-placement')

  await page.getByRole('button', { name: /approve to floral artifact/i }).click()
  await expect(page.locator('.mechanical-meta').getByText('8 items', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Layers' }).click()
  await expect(page.getByRole('button', { name: 'Select Resin iris / violet fracture' })).toBeVisible()
  await expect(preview).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Latest action receipt' })).toContainText(destination!)

  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.locator('.mechanical-meta').getByText('7 items', { exact: true })).toBeVisible()
  await expect(page.getByRole('complementary', { name: 'Review tray' })).toContainText('4 pending')
  await expect(page.getByRole('button', { name: /approve to floral artifact/i })).toBeVisible()
  await expect(preview).toHaveClass(/is-preview/)
  await page.getByRole('button', { name: 'History' }).click()
  await expect(page.getByRole('complementary', { name: 'History' })).toContainText(/undid: approved resin iris/i)
})

test('shows the safe Preview state without a model context', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('WebMCP preview', { exact: true })).toBeVisible()
})

test('offers a stable organized result that a designer can inspect directly', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 })
  await page.goto('/organized')

  await expect(page.getByTestId('proposal-placement')).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Latest action receipt' })).toContainText('Applied organization proposal')
  await page.getByRole('button', { name: 'Layers' }).click()
  await expect(page.getByRole('button', { name: 'Select Headline type specimen' })).toContainText('Hierarchy: hero')
  await expect(page.getByRole('button', { name: 'Select Body type specimen' })).toContainText('Hierarchy: primary')
  const lockedReference = page.getByRole('button', { name: 'Select Asymmetrical type study' })
  await expect(lockedReference).toContainText('Locked')
  await expect(lockedReference).not.toContainText('Hierarchy:')
})

test('locks the campaign brief and keeps creative-route approval with the designer', async ({ page }) => {
  await page.goto('/')
  const brief = page.getByRole('complementary', { name: 'Campaign job ticket' })
  await brief.getByRole('button', { name: 'Edit brief' }).click()
  await expect(brief.getByLabel('Objective')).toBeVisible()
  await brief.getByLabel('Working line').fill('A floral signal under pressure.')
  await brief.getByRole('button', { name: 'Save + lock' }).click()
  await expect(brief).toContainText('A floral signal under pressure.')
  await expect(brief).toContainText('Brief locked by designer')

  const route = page.getByRole('article', { name: 'Creative route: Mineral severity' })
  await route.getByRole('button', { name: 'Approve creative route Mineral severity' }).click()
  await expect(route).toHaveCount(0)
  await expect(page.getByText('3 pending', { exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Latest action receipt' })).toContainText('Approved creative route “Mineral severity”')
})

test('previews and atomically applies a WebMCP Direction Draft at the designer boundary', async ({ page }) => {
  await page.addInitScript(() => {
    const toolRegistry: Record<string, { execute: (input: unknown, context: { signal: AbortSignal }) => unknown }> = {}
    ;(window as typeof window & { __iterumTools?: typeof toolRegistry }).__iterumTools = toolRegistry
    Object.defineProperty(document, 'modelContext', { configurable: true, value: { registerTool: async (tool: { name: string; execute: typeof toolRegistry[string]['execute'] }) => { toolRegistry[tool.name] = tool } } })
  })
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  await expect.poll(() => page.evaluate(() => Object.keys((window as typeof window & { __iterumTools?: Record<string, unknown> }).__iterumTools ?? {}).length)).toBe(37)

  const proposed = await page.evaluate(async () => {
    const tools = (window as typeof window & { __iterumTools: Record<string, { execute: (input: unknown, context: { signal: AbortSignal }) => Promise<unknown> }> }).__iterumTools
    return tools.propose_board_layout.execute({
      campaignId: 'campaign-static-bloom', boardId: 'board-static-bloom', expectedBoardVersion: 3, idempotencyKey: 'e2e-direction-draft',
      layout: {
        id: 'layout-e2e-type-pressure', title: 'Compressed type pressure', rationale: 'Treat the two specimens as one severe typographic system and pin the direction in place.',
        changes: [
          { itemId: 'type-specimen-headline', position: { x: 735, y: 438 }, width: 340, height: 188, groupId: 'group-e2e-type', groupLabel: 'Compressed type system' },
          { itemId: 'type-specimen-body', position: { x: 735, y: 646 }, width: 340, groupId: 'group-e2e-type', groupLabel: 'Compressed type system' },
        ],
        notes: [{ id: 'note-e2e-pressure', title: 'Hold the pressure', body: 'Keep the hierarchy compressed and let the floral artifact remain the only soft interruption.', tone: 'blue', territory: 'Type pressure', position: { x: 390, y: 750 }, width: 320, height: 130 }],
      },
    }, { signal: new AbortController().signal })
  }) as { ok: boolean; boardVersion: number }
  expect(proposed).toMatchObject({ ok: true, boardVersion: 4 })

  const requested = await page.evaluate(async () => {
    const tools = (window as typeof window & { __iterumTools: Record<string, { execute: (input: unknown, context: { signal: AbortSignal }) => Promise<unknown> }> }).__iterumTools
    await tools.preview_board_layout.execute({ campaignId: 'campaign-static-bloom', boardId: 'board-static-bloom', proposalId: 'layout-e2e-type-pressure' }, { signal: new AbortController().signal })
    return tools.apply_board_layout.execute({ campaignId: 'campaign-static-bloom', boardId: 'board-static-bloom', proposalId: 'layout-e2e-type-pressure' }, { signal: new AbortController().signal })
  }) as { ok: boolean; boardVersion: number; data: { requiresDesignerApproval: boolean } }
  expect(requested).toMatchObject({ ok: true, boardVersion: 4, data: { requiresDesignerApproval: true } })

  const draft = page.getByRole('article', { name: 'Direction Draft: Compressed type pressure' })
  await expect(draft).toBeVisible()
  await expect(draft.getByRole('button', { name: 'Hide preview' })).toBeVisible()
  await expect(page.locator('.mechanical-meta').getByText('7 items', { exact: true })).toBeVisible()
  await draft.getByRole('button', { name: 'Apply direction' }).click()
  await expect(page.locator('.mechanical-meta').getByText('8 items', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Layers' }).click()
  await expect(page.getByRole('button', { name: 'Select Hold the pressure' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Latest action receipt' })).toContainText(/applied direction draft/i)
  await page.getByRole('region', { name: 'Latest action receipt' }).getByRole('button', { name: 'Undo' }).click()
  await expect(page.locator('.mechanical-meta').getByText('7 items', { exact: true })).toBeVisible()
  await expect(draft).toBeVisible()
})

test('organizes a creative route into reviewable hierarchy without touching its locked reference', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 })
  await page.goto('/')
  const mechanical = page.getByRole('main', { name: 'Working mechanical' })
  await mechanical.locator('.mechanical-toolbar').getByRole('button', { name: 'Organize' }).click()
  const studio = page.getByRole('region', { name: 'Organize direction' })
  await expect(studio.getByLabel('Scope')).toHaveValue('route:route-synthetic')
  await expect(studio).toContainText('2 items')
  await expect(studio).toContainText('1 untouched')
  await studio.getByRole('button', { name: 'Generate preview' }).click()

  const proposal = page.getByRole('article', { name: 'Direction Draft: Organize Synthetic warmth by type' })
  await expect(proposal).toContainText('Organization preview')
  await expect(proposal).toContainText(/hero/i)
  await expect(proposal).toContainText('1 protected item remains untouched')
  await expect(proposal.getByRole('button', { name: 'Hide preview' })).toBeVisible()
  await proposal.getByRole('button', { name: 'Apply organization' }).click()
  await expect(page.getByRole('region', { name: 'Latest action receipt' })).toContainText('Applied organization proposal')

  await page.getByRole('button', { name: 'Layers' }).click()
  const headline = page.getByRole('button', { name: 'Select Headline type specimen' })
  await expect(headline).toContainText('Hierarchy: hero')
  const lockedReference = page.getByRole('button', { name: 'Select Asymmetrical type study' })
  await expect(lockedReference).not.toContainText('Group: Typography')
  await expect(lockedReference).toContainText('Locked')
})

test('runs the board-organization WebMCP tool chain while reserving approval for the designer', async ({ page }) => {
  await page.addInitScript(() => {
    const toolRegistry: Record<string, { execute: (input: unknown, context: { signal: AbortSignal }) => unknown }> = {}
    ;(window as typeof window & { __iterumTools?: typeof toolRegistry }).__iterumTools = toolRegistry
    Object.defineProperty(document, 'modelContext', {
      configurable: true,
      value: {
        registerTool: async (tool: { name: string; execute: typeof toolRegistry[string]['execute'] }) => {
          toolRegistry[tool.name] = tool
        },
      },
    })
  })
  await page.setViewportSize({ width: 1440, height: 960 })
  await page.goto('/')
  await expect.poll(() => page.evaluate(() => Object.keys((window as typeof window & { __iterumTools?: Record<string, unknown> }).__iterumTools ?? {}).length)).toBe(37)

  const result = await page.evaluate(async () => {
    const tools = (window as typeof window & { __iterumTools: Record<string, { execute: (input: unknown, context: { signal: AbortSignal }) => Promise<unknown> }> }).__iterumTools
    const context = { signal: new AbortController().signal }
    const structure = await tools.get_board_structure.execute({
      campaignId: 'campaign-static-bloom',
      boardId: 'board-static-bloom',
    }, context) as { ok: boolean; boardVersion: number; data: { routes: unknown[]; groups: unknown[] } }
    const proposed = await tools.propose_board_organization.execute({
      campaignId: 'campaign-static-bloom',
      boardId: 'board-static-bloom',
      expectedBoardVersion: structure.boardVersion,
      idempotencyKey: 'e2e-organize-type-route',
      organization: {
        id: 'e2e-organization-tool',
        title: 'Type pressure hierarchy',
        scope: { type: 'route', routeId: 'route-synthetic' },
        strategy: 'type',
        layout: 'cluster-grid',
        maximumGroups: 3,
        ranking: 'visual-weight',
        briefKeywords: ['severe', 'warm'],
      },
    }, context) as { ok: boolean; boardVersion: number; data: { proposalId: string; groups: Array<{ id: string }>; untouchedLockedItemIds: string[]; requiresDesignerApproval: boolean } }
    const previewed = await tools.preview_board_organization.execute({
      campaignId: 'campaign-static-bloom',
      boardId: 'board-static-bloom',
      proposalId: proposed.data.proposalId,
    }, context) as { ok: boolean; boardVersion: number; data: { assignments: Array<{ role: string }>; projectedItems: Array<{ id: string; position: { x: number; y: number }; width: number; height: number; hierarchyRole: string; groupId: string }> }; ui: { updated: boolean } }
    const explained = await tools.explain_board_group.execute({
      campaignId: 'campaign-static-bloom',
      boardId: 'board-static-bloom',
      proposalId: proposed.data.proposalId,
      groupId: proposed.data.groups[0].id,
    }, context) as { ok: boolean; data: { assignments: Array<{ itemTitle: string; role: string }> } }
    return {
      toolNames: Object.keys(tools),
      structure,
      proposed,
      previewed,
      explained,
    }
  })

  expect(result.toolNames).toEqual(expect.arrayContaining([
    'get_board_structure',
    'propose_board_organization',
    'preview_board_organization',
    'explain_board_group',
  ]))
  expect(result.toolNames).not.toContain('approve_board_organization')
  expect(result.structure).toMatchObject({ ok: true, boardVersion: 3, data: { groups: [] } })
  expect(result.structure.data.routes).toHaveLength(3)
  expect(result.proposed).toMatchObject({
    ok: true,
    boardVersion: 4,
    data: {
      proposalId: 'e2e-organization-tool',
      untouchedLockedItemIds: ['reference-type-study'],
      requiresDesignerApproval: true,
    },
  })
  expect(result.previewed).toMatchObject({ ok: true, boardVersion: 4, ui: { updated: true } })
  expect(result.previewed.data.assignments.map((assignment) => assignment.role)).toEqual(['hero', 'primary'])
  expect(result.previewed.data.projectedItems).toEqual([
    { id: 'type-specimen-headline', position: { x: 800, y: 432 }, width: 256, height: 152, hierarchyRole: 'hero', groupId: 'e2e-organization-tool-group-typography-1' },
    { id: 'type-specimen-body', position: { x: 832, y: 600 }, width: 224, height: 128, hierarchyRole: 'primary', groupId: 'e2e-organization-tool-group-typography-1' },
  ])
  expect(result.explained.ok).toBe(true)
  expect(result.explained.data.assignments).toEqual(expect.arrayContaining([
    expect.objectContaining({ itemTitle: 'Headline type specimen', role: 'hero' }),
  ]))

  const proposal = page.getByRole('article', { name: 'Direction Draft: Type pressure hierarchy' })
  await expect(proposal).toBeVisible()
  await expect(proposal).toContainText('Synthetic warmth')
  await expect(proposal).toContainText('1 protected item remains untouched')
  await expect(proposal.getByRole('button', { name: 'Hide preview' })).toBeVisible()
  await expect(page.locator('.mechanical-meta').getByText('7 items', { exact: true })).toBeVisible()

  await proposal.getByRole('button', { name: 'Apply organization' }).click()
  await expect(page.getByRole('region', { name: 'Latest action receipt' })).toContainText('Applied organization proposal')
  await page.getByRole('button', { name: 'Layers' }).click()
  const headline = page.getByRole('button', { name: 'Select Headline type specimen' })
  const lockedReference = page.getByRole('button', { name: 'Select Asymmetrical type study' })
  await expect(headline).toContainText('Hierarchy: hero')
  await expect(lockedReference).toContainText('Locked')
  await expect(lockedReference).not.toContainText('Group: Typography')

  await page.getByRole('region', { name: 'Latest action receipt' }).getByRole('button', { name: 'Undo' }).click()
  await expect(headline).not.toContainText('Hierarchy: hero')
  await expect(proposal).toBeVisible()
})

test('composes a reviewable creative territory through WebMCP and leaves approval with the designer', async ({ page }) => {
  await page.addInitScript(() => {
    const toolRegistry: Record<string, { execute: (input: unknown, context: { signal: AbortSignal }) => unknown }> = {}
    ;(window as typeof window & { __iterumTools?: typeof toolRegistry }).__iterumTools = toolRegistry
    Object.defineProperty(document, 'modelContext', { configurable: true, value: { registerTool: async (tool: { name: string; execute: typeof toolRegistry[string]['execute'] }) => { toolRegistry[tool.name] = tool } } })
  })
  await page.setViewportSize({ width: 1440, height: 960 })
  await page.goto('/')
  await expect.poll(() => page.evaluate(() => Object.keys((window as typeof window & { __iterumTools?: Record<string, unknown> }).__iterumTools ?? {}).length)).toBe(37)

  const result = await page.evaluate(async () => {
    const tools = (window as typeof window & { __iterumTools: Record<string, { execute: (input: unknown, context: { signal: AbortSignal }) => Promise<unknown> }> }).__iterumTools
    return tools.propose_creative_territory.execute({
      campaignId: 'campaign-static-bloom', boardId: 'board-static-bloom', expectedBoardVersion: 3, idempotencyKey: 'e2e-compose-territory',
      territory: {
        id: 'e2e-territory-afterimage', title: 'Mineral afterimage', routeId: 'route-synthetic',
        thesis: 'Industrial warmth becomes intimate when severe type presses against preserved floral matter.',
        mood: 'Tense, tactile, electrically warm', density: 'balanced',
        groupingSignals: ['material contrast', 'compressed scale', 'sodium warmth'],
        references: [
          { itemId: 'reference-type-study', contribution: 'composition', annotation: 'Use its interrupted vertical rhythm and extreme scale, not its wording.' },
          { itemId: 'reference-resin-iris', contribution: 'materiality', annotation: 'Borrow the preserved surface as the soft counterpoint to severe typography.' },
        ],
        hierarchy: { heroItemId: 'type-specimen-headline', primaryItemIds: ['type-specimen-body'], supportingItemIds: [] },
        typography: { headlineItemId: 'type-specimen-headline', bodyItemId: 'type-specimen-body', relationship: 'Compressed display leads; restrained grotesk carries facts.', scaleRatio: 5 },
        palette: [
          { hex: '#171717', name: 'Carbon', role: 'ground' }, { hex: '#E1B86A', name: 'Sodium amber', role: 'accent' },
          { hex: '#A05040', name: 'Oxide', role: 'support' }, { hex: '#F0ECE4', name: 'Proof paper', role: 'type' },
        ],
        relationships: [{ fromItemId: 'reference-type-study', toItemId: 'reference-resin-iris', kind: 'contrast', rationale: 'Rigid type pressure makes the fragile bloom feel stranger.' }],
        application: { itemId: 'campaign-proof-static-bloom', format: 'Launch poster', caption: 'Tests whether the hierarchy survives as a campaign application.' },
      },
    }, { signal: new AbortController().signal })
  }) as { ok: boolean; boardVersion: number; data: { requiresDesignerApproval: boolean } }

  expect(result).toMatchObject({ ok: true, boardVersion: 4, data: { requiresDesignerApproval: true } })
  const territory = page.getByRole('article', { name: 'Direction Draft: Mineral afterimage' })
  await expect(territory).toContainText('Creative territory')
  await expect(territory).toContainText('Industrial warmth becomes intimate')
  await expect(territory).toContainText('Hierarchy intent')
  await expect(territory).toContainText('Hero')
  await expect(territory).toContainText('Reference contributions')
  await expect(territory).toContainText('5:1 scale')
  await expect(territory).toContainText('Campaign palette')
  await expect(territory).toContainText('Visual relationships')
  await expect(territory.getByRole('img', { name: 'Launch poster application preview' })).toBeVisible()
  await territory.getByRole('button', { name: 'Approve territory' }).click()
  await expect(page.getByRole('region', { name: 'Latest action receipt' })).toContainText('Applied organization proposal')
  await page.getByRole('button', { name: 'Layers' }).click()
  await expect(page.getByRole('button', { name: 'Select Headline type specimen' })).toContainText('Hierarchy: hero')
  await page.getByRole('region', { name: 'Latest action receipt' }).getByRole('button', { name: 'Undo' }).click()
  await expect(territory).toBeVisible()
})

test('presents a focused creative territory scenario for human review and approval', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 })
  await page.goto('/territory-review')

  const reviewTray = page.getByRole('complementary', { name: 'Review tray' })
  await expect(reviewTray).toBeVisible()
  await expect(reviewTray).toContainText('1 pending')

  const territory = page.getByRole('article', { name: 'Direction Draft: Mineral afterimage' })
  await expect(territory).toBeVisible()
  await expect(territory).toContainText('Creative territory')
  await expect(territory).toContainText('Industrial warmth becomes intimate')
  await expect(territory).toContainText('Hierarchy intent')
  await expect(territory).toContainText('Reference contributions')
  await expect(territory).toContainText('5:1 scale')
  await expect(territory).toContainText('Campaign palette')
  await expect(territory).toContainText('Visual relationships')
  await expect(territory.getByRole('img', { name: 'Launch poster application preview' })).toBeVisible()

  await territory.getByRole('button', { name: 'Approve territory' }).click()
  await expect(page.getByRole('region', { name: 'Latest action receipt' })).toContainText('Applied organization proposal')
  await page.getByRole('button', { name: 'Layers' }).click()
  await expect(page.getByRole('button', { name: 'Select Headline type specimen' })).toContainText('Hierarchy: hero')
  await page.getByRole('region', { name: 'Latest action receipt' }).getByRole('button', { name: 'Undo' }).click()
  await expect(territory).toBeVisible()
})

test('shows the completed PIVOT campaign using only its newly generated visual system', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 })
  await page.goto('/campaign-test')
  await expect(page.getByRole('heading', { name: 'PIVOT / 01' })).toBeVisible()
  await expect(page.getByText('Make light move.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Layers' }).click()
  await expect(page.getByRole('button', { name: 'Select PIVOT / 01 launch poster' })).toContainText('Hierarchy: hero')
  await expect(page.getByRole('button', { name: 'Select Cobalt pivot lamp / isolated' })).toContainText('Locked')
  await page.getByRole('button', { name: 'Type', exact: true }).click()
  await expect(page.getByText('Approved · Barlow + IBM Plex Mono', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Color', exact: true }).click()
  await expect(page.getByText('Extract locally. Systematize with The Color API. Explore with Colormind. Only designer-pinned swatches change the campaign palette.')).toBeVisible()
  await page.getByRole('button', { name: 'History' }).click()
  await expect(page.getByText('Approved Modular signal as the lead creative territory.')).toBeVisible()
})

test('switches the PIVOT board between explanatory Working view and clean Presentation view', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 })
  await page.goto('/campaign-test')
  const workspace = page.getByTestId('iterum-workspace')
  await expect(page.getByRole('button', { name: 'Working', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Select', exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Present', exact: true }).click()
  await expect(workspace).toHaveClass(/is-presentation/)
  await expect(page.getByRole('button', { name: 'Present', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Select', exact: true })).toBeHidden()
  await expect(page.getByRole('complementary', { name: 'Campaign job ticket' })).toBeHidden()
  await expect(page.getByRole('complementary', { name: 'Review tray' })).toBeHidden()

  await page.getByRole('button', { name: 'Working', exact: true }).click()
  await expect(workspace).toHaveClass(/is-working/)
  await expect(page.getByRole('button', { name: 'Select', exact: true })).toBeVisible()
})

test('selects type specimens and navigates the full mechanical', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Layers' }).click()
  const zoom = page.getByLabel('Current board zoom')
  await expect(zoom).toContainText('%')
  await page.getByRole('button', { name: 'Fit board' }).click()
  const fittedZoom = await zoom.textContent()

  await page.getByRole('button', { name: 'Select Headline type specimen' }).click()
  await expect(page.getByRole('button', { name: 'Select Headline type specimen' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Zoom in' }).click()
  await expect(zoom).not.toHaveText(fittedZoom!)
  await page.getByRole('button', { name: 'Set board zoom to 100 percent' }).click()
  await expect(zoom).toHaveText('100%')
  await page.getByRole('button', { name: 'Fit board' }).click()
  await expect(zoom).toHaveText(fittedZoom!)

  const canvas = page.locator('.konvajs-content')
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
  await page.mouse.wheel(0, -260)
  await expect(zoom).not.toHaveText(fittedZoom!)

  const world = page.locator('.board-overlay-world')
  const beforePan = await world.getAttribute('style')
  await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2)
  await page.keyboard.down('Space')
  await page.mouse.down()
  await page.mouse.move(box!.x + box!.width / 2 + 70, box!.y + box!.height / 2 + 35, { steps: 4 })
  await page.mouse.up()
  await page.keyboard.up('Space')
  await expect(world).not.toHaveAttribute('style', beforePan!)

  const beforeMiddlePan = await world.getAttribute('style')
  await page.mouse.down({ button: 'middle' })
  await page.mouse.move(box!.x + box!.width / 2 + 110, box!.y + box!.height / 2 + 70, { steps: 3 })
  await page.mouse.up({ button: 'middle' })
  await expect(world).not.toHaveAttribute('style', beforeMiddlePan!)
})

test('moves, resizes, locks, and unlocks the campaign proof and color strip', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Layers' }).click()

  const proof = page.getByRole('button', { name: 'Select Static Bloom campaign proof' })
  await proof.press('ArrowRight')
  await expect(proof).toContainText('X 345 · Y 164')
  await proof.click()
  const tools = page.getByLabel('Mechanical tools')
  await tools.getByRole('button', { name: 'Lock Static Bloom campaign proof' }).click()
  await expect(tools.getByRole('button', { name: 'Unlock Static Bloom campaign proof' })).toBeVisible()
  await proof.press('ArrowRight')
  await expect(proof).toContainText('X 345 · Y 164')
  await tools.getByRole('button', { name: 'Unlock Static Bloom campaign proof' }).click()
  await expect(tools.getByRole('button', { name: 'Lock Static Bloom campaign proof' })).toBeVisible()

  const colorStrip = page.getByRole('button', { name: 'Select Campaign color control strip' })
  await colorStrip.press('ArrowDown')
  await expect(colorStrip).toContainText('X 335 · Y 738')
  await page.getByRole('button', { name: 'Increase Campaign color control strip size' }).click()
  await expect(colorStrip).toContainText('470 × 48px')
})

test('extracts and saves a deterministic local color palette from a reference crop', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  await page.getByRole('main', { name: 'Working mechanical' }).getByRole('button', { name: 'Color', exact: true }).click()
  const studio = page.getByRole('complementary', { name: 'Color studio' })
  await expect(studio).toBeVisible()
  await expect(studio.getByRole('button', { name: 'Save canonical extraction' })).toBeEnabled()
  await studio.getByRole('button', { name: 'Save canonical extraction' }).click()
  await expect(page.getByRole('region', { name: 'Latest action receipt' })).toContainText(/extracted 6 canonical colors/i)
})

test('builds a sourced type pairing and keeps approval with the designer', async ({ page }) => {
  await page.route('**/api/typefaces/search**', async (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ query: 'fraunces', category: 'all', includeCommercial: false, googleFontsConfigured: false, results: [
      { id: 'fraunces', family: 'Fraunces', category: 'serif', source: 'fontsource', sourceLabel: 'Fontsource', license: 'Open-source via Fontsource', referenceOnly: false, weights: [400, 700], styles: ['normal'] },
      { id: 'instrument-sans', family: 'Instrument Sans', category: 'sans-serif', source: 'fontsource', sourceLabel: 'Fontsource', license: 'Open-source via Fontsource', referenceOnly: false, weights: [400, 600], styles: ['normal'] },
    ] }),
  }))
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  await page.getByRole('main', { name: 'Working mechanical' }).getByRole('button', { name: 'Type', exact: true }).click()
  const studio = page.getByRole('region', { name: 'Typography studio' })
  await expect(studio).toBeVisible()
  await studio.getByRole('button', { name: 'Search type' }).click()
  const fraunces = studio.locator('article').filter({ hasText: 'Fraunces' })
  const instrument = studio.locator('article').filter({ hasText: 'Instrument Sans' })
  await fraunces.getByRole('button', { name: 'Headline' }).click()
  await instrument.getByRole('button', { name: 'Body' }).click()
  await expect(studio.getByRole('region', { name: 'Type direction comparison' })).toContainText('The air remembers.')
  await studio.getByRole('button', { name: 'Send type direction to review' }).click()

  const typeProposal = page.getByRole('article', { name: 'Type direction: Fraunces and Instrument Sans' })
  await expect(typeProposal).toBeVisible()
  await expect(page.getByText('5 pending', { exact: true })).toBeVisible()
  await typeProposal.getByRole('button', { name: 'Approve type direction' }).click()
  await expect(page.getByRole('region', { name: 'Latest action receipt' })).toContainText(/approved fraunces \+ instrument sans/i)
  await page.getByRole('button', { name: 'Layers' }).click()
  await expect(page.getByRole('button', { name: 'Select Headline type specimen' })).toContainText('Typeface: Fraunces')
  await page.getByRole('region', { name: 'Latest action receipt' }).getByRole('button', { name: 'Undo' }).click()
  await expect(typeProposal).toBeVisible()
})

test('captures a URL, preserves a designer crop, and sends it to review', async ({ page }) => {
  await page.route('**/api/references/capture**', async (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ title: 'Mineral glass study', description: 'Wet glass, hard shadow, and mineral bloom.', imageUrl: '/assets/ref-wet-concrete.webp', sourceUrl: 'https://example.com/mineral-glass', attribution: 'Example studio', rightsStatus: 'uncertain', provider: 'microlink', previewKind: 'screenshot', crop: { x: 0, y: 0, width: 100, height: 100 } }),
  }))
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  await page.getByRole('tab', { name: 'Capture' }).click()
  await page.getByLabel('Public source URL').fill('https://example.com/mineral-glass')
  await page.getByRole('button', { name: 'Inspect URL' }).click()
  await expect(page.getByRole('region', { name: 'Crop captured reference' })).toBeVisible()
  await page.getByRole('slider', { name: 'width' }).fill('70')
  await page.getByRole('button', { name: 'Send to Review' }).click()
  await expect(page.getByRole('article', { name: 'Proposal: Mineral glass study' })).toContainText('microlink · X0 Y0 W70 H100')
  await expect(page.getByText('5 pending', { exact: true })).toBeVisible()
})

test('receives a one-click browser image clip with its source and review boundary intact', async ({ page }) => {
  const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')
  await page.route('https://images.example.com/mineral.png', async (route) => route.fulfill({ status: 200, contentType: 'image/png', body: pixel }))
  const params = new URLSearchParams({
    clip: '1', clip_id: 'mineral-clip', clip_source: 'https://example.com/material-study',
    clip_image: 'https://images.example.com/mineral.png', clip_title: 'Clipped mineral study',
  })
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto(`/?${params}`)

  const notice = page.getByRole('region', { name: 'Web clip status' })
  await expect(notice).toContainText('waiting for review')
  await expect(page).toHaveURL('/')
  await expect(page.getByText('5 pending', { exact: true })).toBeVisible()
  const proposal = page.getByRole('article', { name: 'Proposal: Clipped mineral study' })
  await expect(proposal).toContainText('https://example.com/material-study')
  await expect(proposal).toContainText('web-clipper · X0 Y0 W100 H100')

  await proposal.getByRole('button', { name: 'Approve to Agent Additions' }).click()
  await expect(page.locator('.mechanical-meta').getByText('8 items', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Layers' }).click()
  await expect(page.getByRole('button', { name: 'Select Clipped mineral study' })).toBeVisible()
  await page.getByRole('region', { name: 'Latest action receipt' }).getByRole('button', { name: 'Undo' }).click()
  await expect(page.locator('.mechanical-meta').getByText('7 items', { exact: true })).toBeVisible()
  await expect(proposal).toBeVisible()
})

test('isolates a proposal locally and restores the original with a versioned action', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  const proposal = page.getByRole('article', { name: 'Proposal: Resin iris / violet fracture' })
  await proposal.getByRole('button', { name: 'Isolate subject' }).click()
  await expect(proposal.getByRole('button', { name: 'Use original' })).toBeVisible()
  await expect(proposal.locator('img')).toHaveClass(/is-isolated/)
  await expect(page.getByRole('region', { name: 'Latest action receipt' })).toContainText(/isolated resin iris/i)
  await proposal.getByRole('button', { name: 'Use original' }).click()
  await expect(proposal.getByRole('button', { name: 'Isolate subject' })).toBeVisible()
})

test('keeps the reference library scrollable above the workspace status bar', async ({ page }) => {
  await page.setViewportSize({ width: 1159, height: 810 })
  await page.goto('/')
  await page.getByRole('tab', { name: 'Library' }).click()

  const library = page.locator('.reference-library')
  await expect(library).toBeVisible()
  const dimensions = await library.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }))
  expect(dimensions.scrollHeight).toBeGreaterThan(dimensions.clientHeight)

  await library.evaluate((element) => { element.scrollTop = element.scrollHeight })
  await expect.poll(() => library.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
  await expect(page.getByRole('heading', { name: 'Resin iris / violet fracture' })).toBeInViewport()

  const libraryBox = await library.boundingBox()
  const statusBarBox = await page.locator('.bottom-mode-bar').boundingBox()
  expect(libraryBox).not.toBeNull()
  expect(statusBarBox).not.toBeNull()
  expect(libraryBox!.y + libraryBox!.height).toBeLessThanOrEqual(statusBarBox!.y + 1)
})

test('searches the reference library and lets the designer approve agent tags', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  await page.getByRole('tab', { name: 'Library' }).click()
  await expect(page.getByText('4 of 4', { exact: true })).toBeVisible()
  await page.getByLabel('Search library').fill('industrial')
  await expect(page.getByText('1 of 4', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Wet concrete / sodium reflection' })).toBeVisible()
  await page.getByLabel('Search library').fill('')
  const suggestion = page.getByRole('region', { name: 'Tag suggestion for Resin iris / violet fracture' })
  await suggestion.getByRole('button', { name: 'Approve tags' }).click()
  await expect(page.getByLabel('Approved tags for Resin iris / violet fracture')).toContainText('violet fracture')
  await expect(page.getByRole('region', { name: 'Latest action receipt' })).toContainText(/approved tag suggestion/i)
})

test('phone defaults to review, restores drawer focus, and keeps approval reversible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  await expect(page.getByRole('complementary', { name: 'Review tray' })).toBeVisible()
  const brief = page.getByRole('button', { name: 'Brief', exact: true })
  await brief.focus()
  await page.keyboard.press('Enter')
  await expect(brief).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('complementary', { name: 'Campaign job ticket' })).toBeVisible()
  await page.getByRole('button', { name: 'Close brief' }).click()
  await expect(brief).toBeFocused()

  const review = page.getByRole('button', { name: 'Review tray' })
  await review.focus()
  await page.keyboard.press('Enter')
  await expect(review).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('button', { name: /approve to floral artifact/i })).toBeVisible()
  await page.getByRole('button', { name: /approve to floral artifact/i }).click()
  const receipt = page.getByRole('region', { name: 'Latest action receipt' })
  await expect(receipt).toContainText(/board v04/i)
  await receipt.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByRole('button', { name: /approve to floral artifact/i })).toBeVisible()
  await page.getByRole('button', { name: 'Board preview' }).click()
  await expect(review).toBeFocused()
  await expect(page.getByText(/board preview · canvas editing continues on desktop/i)).toBeVisible()
})

test('switching to phone after navigation enters review-first mode', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  await expect(page.getByRole('main', { name: 'Working mechanical' })).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole('complementary', { name: 'Review tray' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Board preview' })).toBeVisible()
})
