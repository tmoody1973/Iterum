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
  await expect(page.getByText('3 items', { exact: true })).toBeVisible()
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
  await expect(page.getByText('4 items', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Select Resin iris / violet fracture' })).toBeVisible()
  await expect(preview).toHaveClass(/is-placed/)
  await expect(preview).toHaveAttribute('data-placement', destination!)
  const placedBox = await preview.boundingBox()
  expect(placedBox!.x).toBeGreaterThanOrEqual(mechanicalBox!.x)
  expect(placedBox!.x + placedBox!.width).toBeLessThanOrEqual(mechanicalBox!.x + mechanicalBox!.width)
  await expect(page.getByRole('region', { name: 'Latest action receipt' })).toContainText(destination!)

  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByText('3 items', { exact: true })).toBeVisible()
  await expect(page.getByRole('complementary', { name: 'Review tray' })).toContainText('1 pending')
  await expect(page.getByRole('button', { name: /approve to floral artifact/i })).toBeVisible()
  await expect(preview).toHaveClass(/is-preview/)
})

test('shows the safe Preview state without a model context', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('WebMCP preview', { exact: true })).toBeVisible()
})

test('extracts and saves a deterministic local color palette from a reference crop', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  await page.getByRole('banner', { name: 'Iterum' }).getByRole('button', { name: 'Color', exact: true }).click()
  const studio = page.getByRole('complementary', { name: 'Color studio' })
  await expect(studio).toBeVisible()
  await expect(studio.getByRole('button', { name: 'Save canonical extraction' })).toBeEnabled()
  await studio.getByRole('button', { name: 'Save canonical extraction' }).click()
  await expect(page.getByRole('region', { name: 'Latest action receipt' })).toContainText(/extracted 6 canonical colors/i)
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
