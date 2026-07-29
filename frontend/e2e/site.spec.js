import { test, expect } from '@playwright/test'

test('home, catalogue and model page work', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.goto('/catalog')
  await expect(page.getByText('CHANGFA CFF904')).toBeVisible()
  await page.goto('/tractors/changfa-cfj220')
  await expect(page.getByRole('heading', { name: 'CHANGFA CFJ220' })).toBeVisible()
})

test('language selector changes UI', async ({ page }) => {
  await page.goto('/')
  await page.locator('select[aria-label="Language"]').selectOption('en')
  await expect(page.getByText('Open catalogue')).toBeVisible()
})
