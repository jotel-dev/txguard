export async function navigate(page, name) {
  const menu = page.getByRole('button', { name: 'Menu', exact: true })
  if (await menu.isVisible()) await menu.click()
  await page.getByRole('link', { name, exact: true }).click()
}
