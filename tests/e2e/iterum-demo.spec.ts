import { expect, test } from '@playwright/test'

test('designer approves and reverses a sourced proposal through the three-zone desk', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('complementary', { name: 'Campaign job ticket' })).toBeVisible()
  await expect(page.getByRole('main', { name: 'Working mechanical' })).toBeVisible()
  await expect(page.getByRole('complementary', { name: 'Review tray' })).toBeVisible()
  await expect(page.getByText('3 items', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: /approve to floral artifact/i }).click()
  await expect(page.getByText('4 items', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Select Resin iris / violet fracture' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Latest action receipt' })).toContainText(/board v04/i)

  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByText('3 items', { exact: true })).toBeVisible()
  await expect(page.getByRole('complementary', { name: 'Review tray' })).toContainText('1 pending')
  await expect(page.getByRole('button', { name: /approve to floral artifact/i })).toBeVisible()
})

test('shows the safe Preview state without a model context', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('WebMCP preview', { exact: true })).toBeVisible()
})

test('phone defaults to review while retaining brief and board-preview access', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  await expect(page.getByRole('complementary', { name: 'Review tray' })).toBeVisible()
  await page.getByRole('button', { name: 'Brief' }).click()
  await expect(page.getByRole('complementary', { name: 'Campaign job ticket' })).toBeVisible()
  await page.getByRole('button', { name: 'Review tray' }).click()
  await page.getByRole('button', { name: 'Board preview' }).click()
  await expect(page.getByText(/board preview · canvas editing continues on desktop/i)).toBeVisible()
})
