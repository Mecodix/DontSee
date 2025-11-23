import time
from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # 1. Open the app
    page.goto("http://localhost:3000")

    # Wait for the app to load (look for Conceal button or textarea)
    expect(page.get_by_placeholder("Enter secret message here...")).to_be_visible()

    # 2. Locate the textarea and the maximize button
    textarea = page.get_by_placeholder("Enter secret message here...")

    # The maximize button is inside the same container as the textarea.
    # It has aria-label="Maximize"
    maximize_btn = page.get_by_label("Maximize")
    expect(maximize_btn).to_be_attached()

    # 3. Click Maximize
    maximize_btn.click()

    # 4. Verify Overlay
    # Look for the overlay container (fixed inset-0)
    # Inside overlay, there should be a textarea with the same content (empty for now)
    # And a Minimize button
    minimize_btn = page.get_by_label("Minimize")
    expect(minimize_btn).to_be_visible()

    # Check if footer (byte count) is visible in overlay
    # The text "0 /" should be present
    expect(page.get_by_text("0 /")).to_have_count(2) # One in normal view, one in overlay

    # Take screenshot of the Maximized View
    page.screenshot(path="/home/jules/verification/zen_mode.png")

    # 5. Close Overlay
    minimize_btn.click()

    # Verify overlay is gone
    expect(minimize_btn).not_to_be_visible()

    browser.close()

if __name__ == "__main__":
    with sync_playwright() as playwright:
        run(playwright)
