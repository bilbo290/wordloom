import { test, expect } from '@playwright/test'

test.describe('Storyboard Integration Tests', () => {
  test('should create story project and access storyboard', async ({ page }) => {
    // Start from home page
    await page.goto('/')
    
    // Navigate to Story Writer Mode
    await page.getByText('Story Writer Mode').click()
    
    // Create new project
    await page.getByRole('button', { name: /Start New Story Project/ }).click()
    
    // Fill project form
    await page.getByPlaceholder('Enter story title').fill('Storyboard Test Story')
    await page.getByPlaceholder('Describe your story premise').fill('A story to test the storyboarding system')
    
    // Select genre and length
    await page.locator('select, [role="combobox"]').first().click()
    await page.getByText('fantasy', { exact: true }).click()
    
    await page.locator('select, [role="combobox"]').last().click() 
    await page.getByText('novel', { exact: true }).click()
    
    // Create project
    await page.getByRole('button', { name: 'Create Project' }).click()
    
    // Navigate to chapter phase
    await page.getByRole('button', { name: /Chapter Writing/ }).click()
    
    // Should see chapter development interface
    await expect(page.getByText('Chapter Development')).toBeVisible()
    await expect(page.getByText('Plan your scenes before writing')).toBeVisible()
  })

  test('should open storyboard and add scenes', async ({ page }) => {
    // Setup: Create project and navigate to chapter phase
    await page.goto('/')
    await page.getByText('Story Writer Mode').click()
    await page.getByRole('button', { name: /Start New Story Project/ }).click()
    await page.getByPlaceholder('Enter story title').fill('Scene Test')
    await page.getByPlaceholder('Describe your story premise').fill('Testing scene creation')
    await page.locator('select, [role="combobox"]').first().click()
    await page.getByText('fantasy', { exact: true }).click()
    await page.locator('select, [role="combobox"]').last().click()
    await page.getByText('novel', { exact: true }).click()
    await page.getByRole('button', { name: 'Create Project' }).click()
    await page.getByRole('button', { name: /Chapter Writing/ }).click()
    
    // Open storyboard
    await page.getByRole('button', { name: /Open Storyboard/ }).click()
    
    // Should show storyboard interface
    await expect(page.getByText('Scene Storyboard')).toBeVisible()
    await expect(page.getByText('No scenes yet')).toBeVisible()
    
    // Add first scene
    await page.getByRole('button', { name: /Add First Scene/ }).click()
    
    // Should create Scene 1
    await expect(page.getByText('Scene 1', { exact: true })).toBeVisible()
    await expect(page.getByText('concept')).toBeVisible()
    
    // Add second scene
    await page.getByRole('button', { name: /Add Scene/ }).click()
    
    // Should create Scene 2
    await expect(page.getByText('Scene 2', { exact: true })).toBeVisible()
    
    // Should have 2 scenes total
    const sceneCards = page.locator('[draggable="true"]')
    await expect(sceneCards).toHaveCount(2)
  })

  test('should switch between storyboard and scene chat tabs', async ({ page }) => {
    // Setup project and scenes
    await page.goto('/')
    await page.getByText('Story Writer Mode').click()
    await page.getByRole('button', { name: /Start New Story Project/ }).click()
    await page.getByPlaceholder('Enter story title').fill('Tab Test')
    await page.getByPlaceholder('Describe your story premise').fill('Testing tab functionality')
    await page.locator('select, [role="combobox"]').first().click()
    await page.getByText('fantasy', { exact: true }).click()
    await page.locator('select, [role="combobox"]').last().click()
    await page.getByText('novel', { exact: true }).click()
    await page.getByRole('button', { name: 'Create Project' }).click()
    await page.getByRole('button', { name: /Chapter Writing/ }).click()
    await page.getByRole('button', { name: /Open Storyboard/ }).click()
    await page.getByRole('button', { name: /Add First Scene/ }).click()
    
    // Should see storyboard tab active
    await expect(page.getByRole('tab', { name: /Storyboard/ })).toHaveAttribute('data-state', 'active')
    
    // Switch to scene chat tab
    await page.getByRole('tab', { name: /Scene Chat/ }).click()
    
    // Should show scene chat interface
    await expect(page.getByRole('tab', { name: /Scene Chat/ })).toHaveAttribute('data-state', 'active')
    await expect(page.getByText('Select a Scene')).toBeVisible()
    
    // Switch back to storyboard
    await page.getByRole('tab', { name: /Storyboard/ }).click()
    await expect(page.getByRole('tab', { name: /Storyboard/ })).toHaveAttribute('data-state', 'active')
  })

  test('should select scene and enable chat', async ({ page }) => {
    // Setup
    await page.goto('/')
    await page.getByText('Story Writer Mode').click()
    await page.getByRole('button', { name: /Start New Story Project/ }).click()
    await page.getByPlaceholder('Enter story title').fill('Selection Test')
    await page.getByPlaceholder('Describe your story premise').fill('Testing scene selection')
    await page.locator('select, [role="combobox"]').first().click()
    await page.getByText('fantasy', { exact: true }).click()
    await page.locator('select, [role="combobox"]').last().click()
    await page.getByText('novel', { exact: true }).click()
    await page.getByRole('button', { name: 'Create Project' }).click()
    await page.getByRole('button', { name: /Chapter Writing/ }).click()
    await page.getByRole('button', { name: /Open Storyboard/ }).click()
    await page.getByRole('button', { name: /Add First Scene/ }).click()
    
    // Select the scene by clicking on it
    await page.getByText('Scene 1', { exact: true }).click()
    
    // Should show Monaco editor in center
    await expect(page.locator('.monaco-editor')).toBeVisible()
    
    // Switch to scene chat
    await page.getByRole('tab', { name: /Scene Chat/ }).click()
    
    // Should now show scene chat interface
    await expect(page.getByText('Scene Development')).toBeVisible()
    await expect(page.getByText('Scene 1: Scene 1')).toBeVisible()
    await expect(page.getByText('Discussion Focus')).toBeVisible()
  })

  test('should send message in scene chat', async ({ page }) => {
    // Setup with selected scene
    await page.goto('/')
    await page.getByText('Story Writer Mode').click()
    await page.getByRole('button', { name: /Start New Story Project/ }).click()
    await page.getByPlaceholder('Enter story title').fill('Chat Test')
    await page.getByPlaceholder('Describe your story premise').fill('Testing chat functionality')
    await page.locator('select, [role="combobox"]').first().click()
    await page.getByText('fantasy', { exact: true }).click()
    await page.locator('select, [role="combobox"]').last().click()
    await page.getByText('novel', { exact: true }).click()
    await page.getByRole('button', { name: 'Create Project' }).click()
    await page.getByRole('button', { name: /Chapter Writing/ }).click()
    await page.getByRole('button', { name: /Open Storyboard/ }).click()
    await page.getByRole('button', { name: /Add First Scene/ }).click()
    await page.getByText('Scene 1', { exact: true }).click()
    await page.getByRole('tab', { name: /Scene Chat/ }).click()
    
    // Send a message
    const testMessage = 'This scene should introduce the main character dramatically'
    await page.getByPlaceholder(/Discuss.*for this scene/).fill(testMessage)
    await page.getByRole('button', { name: /Send/ }).click()
    
    // Should show the user message
    await expect(page.getByText(testMessage)).toBeVisible()
    
    // Should show AI thinking indicator
    await expect(page.getByText('Thinking about your scene')).toBeVisible()
  })

  test('should change discussion focus context', async ({ page }) => {
    // Setup 
    await page.goto('/')
    await page.getByText('Story Writer Mode').click()
    await page.getByRole('button', { name: /Start New Story Project/ }).click()
    await page.getByPlaceholder('Enter story title').fill('Context Test')
    await page.getByPlaceholder('Describe your story premise').fill('Testing context switching')
    await page.locator('select, [role="combobox"]').first().click()
    await page.getByText('fantasy', { exact: true }).click()
    await page.locator('select, [role="combobox"]').last().click()
    await page.getByText('novel', { exact: true }).click()
    await page.getByRole('button', { name: 'Create Project' }).click()
    await page.getByRole('button', { name: /Chapter Writing/ }).click()
    await page.getByRole('button', { name: /Open Storyboard/ }).click()
    await page.getByRole('button', { name: /Add First Scene/ }).click()
    await page.getByText('Scene 1', { exact: true }).click()
    await page.getByRole('tab', { name: /Scene Chat/ }).click()
    
    // Test different contexts
    const contexts = [
      'Story Beats',
      'Dialogue & Character', 
      'Visual & Mood',
      'Pacing & Flow'
    ]
    
    for (const context of contexts) {
      // Open context selector
      await page.getByRole('combobox').click()
      await page.getByText(context).click()
      
      // Should update placeholder text
      const placeholder = await page.getByRole('textbox').getAttribute('placeholder')
      expect(placeholder?.toLowerCase()).toContain(context.toLowerCase().split(' ')[0])
    }
  })

  test('should expand and edit scene details', async ({ page }) => {
    // Setup
    await page.goto('/')
    await page.getByText('Story Writer Mode').click()
    await page.getByRole('button', { name: /Start New Story Project/ }).click()
    await page.getByPlaceholder('Enter story title').fill('Edit Test')
    await page.getByPlaceholder('Describe your story premise').fill('Testing scene editing')
    await page.locator('select, [role="combobox"]').first().click()
    await page.getByText('fantasy', { exact: true }).click()
    await page.locator('select, [role="combobox"]').last().click()
    await page.getByText('novel', { exact: true }).click()
    await page.getByRole('button', { name: 'Create Project' }).click()
    await page.getByRole('button', { name: /Chapter Writing/ }).click()
    await page.getByRole('button', { name: /Open Storyboard/ }).click()
    await page.getByRole('button', { name: /Add First Scene/ }).click()
    
    // Expand scene details
    await page.locator('svg').filter({ hasText: '>' }).click()
    
    // Should show expanded details
    await expect(page.getByText('Purpose')).toBeVisible()
    await expect(page.getByText('No purpose defined')).toBeVisible()
    
    // Should show edit and delete buttons on hover
    await page.hover('[draggable="true"]')
    await expect(page.locator('button').filter({ hasText: 'Edit' })).toBeVisible()
    await expect(page.locator('button').filter({ hasText: 'Delete' })).toBeVisible()
  })

  test('should save scene content in editor', async ({ page }) => {
    // Setup with scene selected
    await page.goto('/')
    await page.getByText('Story Writer Mode').click()
    await page.getByRole('button', { name: /Start New Story Project/ }).click()
    await page.getByPlaceholder('Enter story title').fill('Save Test')
    await page.getByPlaceholder('Describe your story premise').fill('Testing content saving')
    await page.locator('select, [role="combobox"]').first().click()
    await page.getByText('fantasy', { exact: true }).click()
    await page.locator('select, [role="combobox"]').last().click()
    await page.getByText('novel', { exact: true }).click()
    await page.getByRole('button', { name: 'Create Project' }).click()
    await page.getByRole('button', { name: /Chapter Writing/ }).click()
    await page.getByRole('button', { name: /Open Storyboard/ }).click()
    await page.getByRole('button', { name: /Add First Scene/ }).click()
    await page.getByText('Scene 1', { exact: true }).click()
    
    // Type content in Monaco editor
    await page.locator('.monaco-editor textarea').fill('The dragon soared overhead, casting a massive shadow.')
    
    // Save button should be enabled
    await expect(page.getByRole('button', { name: /Save/ })).toBeEnabled()
    
    // Click save
    await page.getByRole('button', { name: /Save/ }).click()
    
    // Should show save confirmation
    await expect(page.getByText('Content saved')).toBeVisible()
    
    // Save button should be disabled after saving
    await expect(page.getByRole('button', { name: /Save/ })).toBeDisabled()
  })

  test('should show word count and statistics', async ({ page }) => {
    // Setup with content
    await page.goto('/')
    await page.getByText('Story Writer Mode').click()
    await page.getByRole('button', { name: /Start New Story Project/ }).click()
    await page.getByPlaceholder('Enter story title').fill('Stats Test')
    await page.getByPlaceholder('Describe your story premise').fill('Testing statistics')
    await page.locator('select, [role="combobox"]').first().click()
    await page.getByText('fantasy', { exact: true }).click()
    await page.locator('select, [role="combobox"]').last().click()
    await page.getByText('novel', { exact: true }).click()
    await page.getByRole('button', { name: 'Create Project' }).click()
    await page.getByRole('button', { name: /Chapter Writing/ }).click()
    await page.getByRole('button', { name: /Open Storyboard/ }).click()
    await page.getByRole('button', { name: /Add First Scene/ }).click()
    await page.getByText('Scene 1', { exact: true }).click()
    
    // Add content
    await page.locator('.monaco-editor textarea').fill('The quick brown fox jumps over the lazy dog.')
    
    // Should show word count
    await expect(page.getByText(/\d+ words/)).toBeVisible()
    
    // In storyboard, should show scene count
    await page.getByRole('tab', { name: /Storyboard/ }).click()
    await expect(page.getByText('1 scenes')).toBeVisible()
  })
})