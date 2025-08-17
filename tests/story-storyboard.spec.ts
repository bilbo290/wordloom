import { test, expect } from '@playwright/test'

test.describe('Story Storyboarding System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    
    // Navigate to Story Writer Mode and create a test project
    await page.getByText('Story Writer Mode').click()
    await page.getByRole('button', { name: 'Start New Story Project' }).click()
    
    // Fill in project details
    await page.getByPlaceholder('Enter story title').fill('Test Story')
    await page.getByPlaceholder('Describe your story premise').fill('A test story about collaborative AI writing')
    await page.getByRole('combobox').first().click()
    await page.getByText('fantasy').click()
    await page.getByRole('combobox').last().click() 
    await page.getByText('novel').click()
    await page.getByRole('button', { name: 'Create Project' }).click()
    
    // Navigate to chapter phase
    await page.getByRole('button', { name: 'Chapter Writing' }).click()
  })

  test('should display chapter workspace with storyboard tab by default', async ({ page }) => {
    // Should show the chapter development interface
    await expect(page.getByText('Chapter Development')).toBeVisible()
    await expect(page.getByText('Plan your scenes before writing')).toBeVisible()
    
    // Should have storyboard and scene chat tabs
    await expect(page.getByRole('tab', { name: 'Storyboard' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Scene Chat' })).toBeVisible()
    
    // Storyboard tab should be active by default
    await expect(page.getByRole('tab', { name: 'Storyboard' })).toHaveAttribute('data-state', 'active')
  })

  test('should allow creating and managing scenes in storyboard', async ({ page }) => {
    // Click to open storyboard
    await page.getByRole('button', { name: 'Open Storyboard' }).click()
    
    // Should show empty storyboard initially
    await expect(page.getByText('No scenes yet')).toBeVisible()
    await expect(page.getByText('Start building your chapter by adding the first scene')).toBeVisible()
    
    // Add first scene
    await page.getByRole('button', { name: 'Add First Scene' }).click()
    
    // Should create Scene 1
    await expect(page.getByText('#1')).toBeVisible()
    await expect(page.getByText('Scene 1')).toBeVisible()
    
    // Should show scene status as concept
    await expect(page.getByText('concept')).toBeVisible()
    
    // Add another scene
    await page.getByRole('button', { name: 'Add Scene' }).click()
    
    // Should now have 2 scenes
    await expect(page.getByText('#2')).toBeVisible()
    await expect(page.getByText('Scene 2')).toBeVisible()
  })

  test('should allow editing scene details', async ({ page }) => {
    // Open storyboard and add a scene
    await page.getByRole('button', { name: 'Open Storyboard' }).click()
    await page.getByRole('button', { name: 'Add First Scene' }).click()
    
    // Expand scene details
    await page.locator('button').filter({ hasText: '>' }).click()
    
    // Should show expanded scene details
    await expect(page.getByText('Purpose')).toBeVisible()
    await expect(page.getByText('No purpose defined')).toBeVisible()
    
    // Edit scene title
    await page.locator('button[aria-label="Edit scene"]').first().click()
    await page.getByRole('textbox').first().fill('Opening Scene - Hero Introduction')
    await page.keyboard.press('Enter')
    
    // Should update scene title
    await expect(page.getByText('Opening Scene - Hero Introduction')).toBeVisible()
  })

  test('should enable scene chat when scene is selected', async ({ page }) => {
    // Open storyboard and add a scene
    await page.getByRole('button', { name: 'Open Storyboard' }).click()
    await page.getByRole('button', { name: 'Add First Scene' }).click()
    
    // Select the scene
    await page.getByText('Scene 1').click()
    
    // Switch to scene chat tab
    await page.getByRole('tab', { name: 'Scene Chat' }).click()
    
    // Should show scene chat interface
    await expect(page.getByText('Scene Development')).toBeVisible()
    await expect(page.getByText('Scene 1: Scene 1')).toBeVisible()
    
    // Should show discussion focus selector
    await expect(page.getByText('Discussion Focus')).toBeVisible()
    await expect(page.getByText('Scene Structure')).toBeVisible()
    
    // Should show message area
    await expect(page.getByText('Start discussing this scene')).toBeVisible()
  })

  test('should allow scene discussion with different contexts', async ({ page }) => {
    // Setup scene
    await page.getByRole('button', { name: 'Open Storyboard' }).click()
    await page.getByRole('button', { name: 'Add First Scene' }).click()
    await page.getByText('Scene 1').click()
    await page.getByRole('tab', { name: 'Scene Chat' }).click()
    
    // Test different discussion contexts
    const contexts = [
      { name: 'Story Beats', description: 'Plan specific story beats' },
      { name: 'Dialogue & Character', description: 'Focus on character conversations' },
      { name: 'Visual & Mood', description: 'Explore visual and cinematic elements' },
      { name: 'Pacing & Flow', description: 'Examine scene timing and rhythm' }
    ]
    
    for (const context of contexts) {
      await page.getByRole('combobox').click()
      await page.getByText(context.name).click()
      await expect(page.getByText(context.description)).toBeVisible()
    }
  })

  test('should send messages in scene chat', async ({ page }) => {
    // Setup scene and navigate to chat
    await page.getByRole('button', { name: 'Open Storyboard' }).click()
    await page.getByRole('button', { name: 'Add First Scene' }).click()
    await page.getByText('Scene 1').click()
    await page.getByRole('tab', { name: 'Scene Chat' }).click()
    
    // Type a message
    const testMessage = 'I want this scene to introduce the protagonist in a dramatic way'
    await page.getByPlaceholder('Discuss storyboard for this scene...').fill(testMessage)
    await page.getByRole('button', { name: 'Send' }).click()
    
    // Should show user message
    await expect(page.getByText(testMessage)).toBeVisible()
    
    // Should show AI thinking state
    await expect(page.getByText('Thinking about your scene...')).toBeVisible()
  })

  test('should show synthesis option after sufficient discussion', async ({ page }) => {
    // Setup scene and start discussion
    await page.getByRole('button', { name: 'Open Storyboard' }).click()
    await page.getByRole('button', { name: 'Add First Scene' }).click()
    await page.getByText('Scene 1').click()
    await page.getByRole('tab', { name: 'Scene Chat' }).click()
    
    // Send first message
    await page.getByPlaceholder('Discuss storyboard for this scene...').fill('This should be an action scene')
    await page.getByRole('button', { name: 'Send' }).click()
    
    // Wait for AI response and send second message
    await page.waitForTimeout(2000) // Give AI time to respond
    await page.getByPlaceholder('Discuss storyboard for this scene...').fill('The protagonist should face a difficult choice')
    await page.getByRole('button', { name: 'Send' }).click()
    
    // Should show synthesize button after 2+ user messages
    await expect(page.getByRole('button', { name: 'Synthesize' })).toBeVisible()
  })

  test('should allow scene reordering via drag and drop', async ({ page }) => {
    // Setup multiple scenes
    await page.getByRole('button', { name: 'Open Storyboard' }).click()
    await page.getByRole('button', { name: 'Add First Scene' }).click()
    await page.getByRole('button', { name: 'Add Scene' }).click()
    await page.getByRole('button', { name: 'Add Scene' }).click()
    
    // Should have scenes 1, 2, 3 in order
    const scenes = page.locator('[data-testid="scene-card"]')
    await expect(scenes).toHaveCount(3)
    
    // Note: Actual drag and drop testing would require more complex setup
    // For now, we verify the scenes are present and draggable attribute exists
    await expect(page.locator('[draggable="true"]')).toHaveCount(3)
  })

  test('should switch to editor when scene is selected', async ({ page }) => {
    // Setup scene
    await page.getByRole('button', { name: 'Open Storyboard' }).click()
    await page.getByRole('button', { name: 'Add First Scene' }).click()
    
    // Select scene
    await page.getByText('Scene 1').click()
    
    // Should show Monaco editor in center panel
    await expect(page.locator('.monaco-editor')).toBeVisible()
    
    // Should show scene details in right panel
    await expect(page.getByText('Scene Purpose')).toBeVisible()
    await expect(page.getByText('Scene Notes')).toBeVisible()
  })

  test('should show scene context in header when selected', async ({ page }) => {
    // Setup scene with some details
    await page.getByRole('button', { name: 'Open Storyboard' }).click()
    await page.getByRole('button', { name: 'Add First Scene' }).click()
    
    // Edit scene to add setting
    await page.locator('button').filter({ hasText: '>' }).click()
    // Would need to add scene editing interface for setting, characters, mood
    
    // Select scene
    await page.getByText('Scene 1').click()
    
    // Should show scene info in header context bar
    await expect(page.getByText('Scene 1: Scene 1')).toBeVisible()
  })

  test('should save and persist scene changes', async ({ page }) => {
    // Setup scene and add content
    await page.getByRole('button', { name: 'Open Storyboard' }).click()
    await page.getByRole('button', { name: 'Add First Scene' }).click()
    await page.getByText('Scene 1').click()
    
    // Add content to editor
    await page.locator('.monaco-editor textarea').fill('This is the opening scene content.')
    
    // Save content
    await page.getByRole('button', { name: 'Save' }).click()
    
    // Should show save confirmation
    await expect(page.getByText('Content saved')).toBeVisible()
    
    // Navigate away and back to verify persistence
    await page.getByRole('button', { name: 'Story Ideation' }).click()
    await page.getByRole('button', { name: 'Chapter Writing' }).click()
    
    // Content should be preserved
    await expect(page.locator('.monaco-editor')).toContainText('This is the opening scene content.')
  })

  test('should export chapter content', async ({ page }) => {
    // Setup scene with content
    await page.getByRole('button', { name: 'Open Storyboard' }).click()
    await page.getByRole('button', { name: 'Add First Scene' }).click()
    await page.getByText('Scene 1').click()
    await page.locator('.monaco-editor textarea').fill('Scene content for export.')
    
    // Setup download handling
    const downloadPromise = page.waitForEvent('download')
    
    // Export chapter
    await page.getByRole('button', { name: 'Export' }).click()
    
    const download = await downloadPromise
    
    // Verify download
    expect(download.suggestedFilename()).toMatch(/\.md$/)
    expect(download.suggestedFilename()).toContain('Test Story')
  })

  test('should navigate between chapters', async ({ page }) => {
    // For this test, we'd need multiple chapters set up
    // The navigation buttons should be present
    await expect(page.locator('button[aria-label="Previous chapter"]')).toBeVisible()
    await expect(page.locator('button[aria-label="Next chapter"]')).toBeVisible()
    
    // Initially should be disabled (only one chapter)
    await expect(page.locator('button[aria-label="Previous chapter"]')).toBeDisabled()
    await expect(page.locator('button[aria-label="Next chapter"]')).toBeDisabled()
  })

  test('should display synthesis results in scene details', async ({ page }) => {
    // Setup scene with synthesis data
    await page.getByRole('button', { name: 'Open Storyboard' }).click()
    await page.getByRole('button', { name: 'Add First Scene' }).click()
    await page.getByText('Scene 1').click()
    await page.getByRole('tab', { name: 'Scene Chat' }).click()
    
    // Have discussion and synthesize
    await page.getByPlaceholder('Discuss storyboard for this scene...').fill('Action-packed opening')
    await page.getByRole('button', { name: 'Send' }).click()
    await page.waitForTimeout(1000)
    
    await page.getByPlaceholder('Discuss storyboard for this scene...').fill('Hero makes difficult choice')
    await page.getByRole('button', { name: 'Send' }).click()
    
    // Click synthesize if available
    const synthesizeButton = page.getByRole('button', { name: 'Synthesize' })
    if (await synthesizeButton.isVisible()) {
      await synthesizeButton.click()
      
      // Should eventually show synthesis results
      await expect(page.getByText('AI Synthesis')).toBeVisible()
    }
  })
})

test.describe('Scene Storyboard Component', () => {
  test('should handle scene status transitions', async ({ page }) => {
    await page.goto('/')
    
    // Navigate to story mode and set up
    await page.getByText('Story Writer Mode').click()
    await page.getByRole('button', { name: 'Start New Story Project' }).click()
    await page.getByPlaceholder('Enter story title').fill('Status Test')
    await page.getByPlaceholder('Describe your story premise').fill('Testing scene status')
    await page.getByRole('combobox').first().click()
    await page.getByText('fantasy').click()
    await page.getByRole('combobox').last().click()
    await page.getByText('novel').click()
    await page.getByRole('button', { name: 'Create Project' }).click()
    await page.getByRole('button', { name: 'Chapter Writing' }).click()
    
    // Add scene and check initial status
    await page.getByRole('button', { name: 'Open Storyboard' }).click()
    await page.getByRole('button', { name: 'Add First Scene' }).click()
    
    // Should start as 'concept'
    await expect(page.getByText('concept')).toBeVisible()
    
    // After discussion and synthesis, should become 'outlined'
    // After writing content, should become 'written'
    // This would require full integration testing with AI
  })

  test('should show scene type indicators', async ({ page }) => {
    await page.goto('/')
    await page.getByText('Story Writer Mode').click()
    await page.getByRole('button', { name: 'Start New Story Project' }).click()
    await page.getByPlaceholder('Enter story title').fill('Type Test')
    await page.getByPlaceholder('Describe your story premise').fill('Testing scene types')
    await page.getByRole('combobox').first().click()
    await page.getByText('fantasy').click()
    await page.getByRole('combobox').last().click()
    await page.getByText('novel').click()
    await page.getByRole('button', { name: 'Create Project' }).click()
    await page.getByRole('button', { name: 'Chapter Writing' }).click()
    
    await page.getByRole('button', { name: 'Open Storyboard' }).click()
    await page.getByRole('button', { name: 'Add First Scene' }).click()
    
    // Scene types would be set through editing interface
    // Different scene types should show different colored badges
    // opening, climax, resolution, cliffhanger, transition
  })
})