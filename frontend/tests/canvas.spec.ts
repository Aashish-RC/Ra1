import { test, expect } from '@playwright/test';

test.describe('Rivet Canvas Foundation Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to canvas UI
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('1. Canvas loads without errors', async ({ page }) => {
    // Check canvas viewport exists and initial elements render
    const viewport = page.locator('#canvas-viewport');
    await expect(viewport).toBeVisible();

    const transformLayer = page.locator('#canvas-transform-layer');
    await expect(transformLayer).toBeVisible();

    const brand = page.locator('.brand-title');
    await expect(brand).toContainText('Rivet Canvas Studio');

    // Verify initial nodes are rendered
    const initialNodes = page.locator('.visual-node');
    await expect(initialNodes).toHaveCount(2);
  });

  test('2. A node can be dragged onto the canvas', async ({ page }) => {
    const initialCount = await page.locator('.visual-node').count();

    // Find a palette item (e.g. Chat or Text or Array)
    const paletteItem = page.locator('#palette-item-chat');
    await expect(paletteItem).toBeVisible();

    const canvas = page.locator('#canvas-viewport');

    // Simulate drag and drop using dataTransfer
    await paletteItem.dragTo(canvas, {
      targetPosition: { x: 350, y: 300 },
    });

    // Check that node count increased
    const afterCount = await page.locator('.visual-node').count();
    expect(afterCount).toBeGreaterThan(initialCount);

    // Verify a chat node is on canvas
    const chatNode = page.locator('.visual-node[data-node-type="chat"]');
    await expect(chatNode.first()).toBeVisible();
  });

  test('3. Two nodes can be connected via a port-to-port wire', async ({ page }) => {
    // Get initial wire count
    const initialWires = await page.locator('.wire-group').count();

    // Pre-seeded nodes: node-init-1 (TextNode output: value) -> node-init-2 (CodeNode input: input)
    // Add an additional node to wire
    const matchPalette = page.locator('#palette-item-match');
    await matchPalette.click(); // Click to add to canvas

    const matchNode = page.locator('.visual-node[data-node-type="match"]').first();
    await expect(matchNode).toBeVisible();

    const matchNodeId = await matchNode.getAttribute('data-node-id');
    const sourcePort = page.locator('#port-node-init-2-output');
    const targetPort = page.locator(`#port-${matchNodeId}-value`);

    await expect(sourcePort).toBeVisible();
    await expect(targetPort).toBeVisible();

    // Drag from output port to input port
    const sourceBox = await sourcePort.boundingBox();
    const targetBox = await targetPort.boundingBox();
    expect(sourceBox).not.toBeNull();
    expect(targetBox).not.toBeNull();

    await page.mouse.move(sourceBox!.x + sourceBox!.width / 2, sourceBox!.y + sourceBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(targetBox!.x + targetBox!.width / 2, targetBox!.y + targetBox!.height / 2, { steps: 5 });
    await page.mouse.up();

    // Verify wire count increased
    const updatedWires = await page.locator('.wire-group').count();
    expect(updatedWires).toBeGreaterThan(initialWires);
  });

  test('4. A connection can be removed', async ({ page }) => {
    // Initial seeded wire
    const initialWires = page.locator('.wire-group');
    await expect(initialWires).toHaveCount(1);

    // Click the wire to remove it
    const wireHit = page.locator('.wire-group path').first();
    await wireHit.click({ force: true });

    // Verify wire count decreased
    await expect(page.locator('.wire-group')).toHaveCount(0);
  });

  test('5. A node can be selected, moved, deleted', async ({ page }) => {
    const node = page.locator('#node-node-init-1');
    await expect(node).toBeVisible();

    // Select the node
    await node.click();
    await expect(node).toHaveClass(/selected/);

    // Get initial position
    const boxBefore = await node.boundingBox();
    expect(boxBefore).not.toBeNull();

    // Drag node to move
    await page.mouse.move(boxBefore!.x + 20, boxBefore!.y + 15);
    await page.mouse.down();
    await page.mouse.move(boxBefore!.x + 120, boxBefore!.y + 85, { steps: 5 });
    await page.mouse.up();

    // Verify position moved
    const boxAfter = await node.boundingBox();
    expect(boxAfter!.x).not.toEqual(boxBefore!.x);

    // Delete the node using the delete button
    const deleteBtn = node.locator('.node-action-btn.delete');
    await deleteBtn.click();

    // Verify node is removed from DOM
    await expect(page.locator('#node-node-init-1')).toHaveCount(0);
  });

  test('6. Pan and zoom respond to input', async ({ page }) => {
    const transformLayer = page.locator('#canvas-transform-layer');
    const zoomIndicator = page.locator('#zoom-level-indicator');

    await expect(zoomIndicator).toHaveText('100%');

    // Test Zoom In button
    const zoomInBtn = page.locator('#zoom-in-btn');
    await zoomInBtn.click();
    await expect(zoomIndicator).toHaveText('115%');

    // Test Zoom Out button
    const zoomOutBtn = page.locator('#zoom-out-btn');
    await zoomOutBtn.click();
    await zoomOutBtn.click();
    await expect(zoomIndicator).toHaveText('83%');

    // Test Zoom Reset
    const zoomResetBtn = page.locator('#zoom-reset-btn');
    await zoomResetBtn.click();
    await expect(zoomIndicator).toHaveText('100%');

    // Test Panning: Drag canvas background
    const panCoords = page.locator('#canvas-pan-coords');
    await expect(panCoords).toHaveText('0, 0');

    await page.mouse.move(600, 400);
    await page.mouse.down();
    await page.mouse.move(500, 300, { steps: 5 });
    await page.mouse.up();

    // Verify pan coordinates and transform reflect the -100, -100 displacement
    await expect(panCoords).toHaveText('-100, -100');
    const style = await transformLayer.getAttribute('style');
    expect(style).toContain('translate(-100px, -100px)');
  });

  test('7. Opening a node reveals its editable code view', async ({ page }) => {
    // Open code view for CodeNode
    const codeNode = page.locator('#node-node-init-2');
    await expect(codeNode).toBeVisible();

    const codeBtn = codeNode.locator('.edit-code-btn');
    await codeBtn.click();

    // Modal should be visible
    const modal = page.locator('#code-editor-modal');
    await expect(modal).toBeVisible();

    // Textarea should contain code and be editable
    const textarea = page.locator('#code-editor-textarea');
    await expect(textarea).toBeVisible();
    await expect(textarea).toContainText('export default async function');

    // Edit the code
    await textarea.fill('// Updated custom code\nreturn { output: "tested" };');

    // Save
    const saveBtn = page.locator('#code-editor-save');
    await saveBtn.click();
    await expect(modal).not.toBeVisible();

    // Reopen to verify persisted edit
    await codeBtn.click();
    await expect(textarea).toHaveValue('// Updated custom code\nreturn { output: "tested" };');
    await page.locator('#code-editor-close').click();
  });

  test('8. A flow saves and reloads as valid YAML', async ({ page }) => {
    // Open YAML modal
    const yamlBtn = page.locator('#yaml-flow-button');
    await yamlBtn.click();

    const modal = page.locator('#yaml-modal');
    await expect(modal).toBeVisible();

    // Check exported YAML contents
    const textarea = page.locator('#yaml-textarea');
    await expect(textarea).toBeVisible();
    const exportedYaml = await textarea.inputValue();

    expect(exportedYaml).toContain('metadata:');
    expect(exportedYaml).toContain('nodes:');
    expect(exportedYaml).toContain('connections:');

    // Switch to import tab and reload valid YAML
    const importTab = page.locator('#yaml-tab-import');
    await importTab.click();

    const customYaml = `
metadata:
  id: imported-graph-test
  name: Reloaded Test Flow
nodes:
  - id: imported-node-1
    type: userInput
    title: User Input Query
    visualData:
      x: 180
      y: 220
      width: 240
    data:
      prompt: "Please enter input:"
connections: []
`;
    await textarea.fill(customYaml);

    const applyBtn = page.locator('#yaml-apply-import-btn');
    await applyBtn.click();

    // Modal closes and reloaded node is on canvas
    await expect(modal).not.toBeVisible();
    const importedNode = page.locator('#node-imported-node-1');
    await expect(importedNode).toBeVisible();
    await expect(importedNode).toContainText('User Input Query');
  });

  test('9. The debugging-bridge panel opens without crashing', async ({ page }) => {
    // Open debugger panel
    const debugBtn = page.locator('#debug-panel-button');
    await debugBtn.click();

    const modal = page.locator('#debugger-modal');
    await expect(modal).toBeVisible();

    // Check status badge and URL input
    const badge = page.locator('#debugger-status-badge');
    await expect(badge).toBeVisible();
    await expect(badge).toContainText('DISCONNECTED');

    const urlInput = page.locator('#debugger-url-input');
    await expect(urlInput).toBeVisible();
    await expect(urlInput).toHaveValue('ws://localhost:21889');

    // Check connect button
    const connectBtn = page.locator('#debugger-connect-btn');
    await expect(connectBtn).toBeVisible();
    await expect(connectBtn).toHaveText('Connect to Bridge');

    // Check logs box
    const logsBox = page.locator('#debugger-logs-box');
    await expect(logsBox).toBeVisible();

    // Close panel
    const closeBtn = page.locator('#debugger-close-btn');
    await closeBtn.click();
    await expect(modal).not.toBeVisible();
  });
});
