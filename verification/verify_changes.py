from playwright.sync_api import sync_playwright

def verify_changes():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the app (Vite default is usually 5173 but log says 3000)
        page.goto("http://localhost:3000")

        # Wait for the app to load
        page.wait_for_selector("main")

        # Hover over the upload card to trigger animation (approximate location or selector)
        # The card is in ImagePreview, let's find the container.
        # It has "Upload Image" text.

        upload_area = page.get_by_text("Upload Image").locator("xpath=..")
        upload_area.hover()

        # Wait a moment for hover effect
        page.wait_for_timeout(500)

        # Take a screenshot of the whole page to verify alignment and styles
        page.screenshot(path="verification/full_page.png")

        browser.close()

if __name__ == "__main__":
    verify_changes()
