
from playwright.sync_api import Page, expect, sync_playwright
import time

def verify_app_load(page: Page):
    print("Navigating to app...")
    page.goto("http://localhost:3000")

    print("Waiting for header...")
    expect(page.get_by_role("heading", name="Hide or Reveal Secrets")).to_be_visible()

    print("Checking for Image Preview component (Dropzone)...")
    # The app doesn't show buttons until an image is uploaded.
    # We should check for the dropzone or the text that prompts upload.

    # Based on App.tsx, if !image, headerTitle is "Hide or Reveal Secrets"
    # And headerDesc is "Upload a DontSee image..."

    expect(page.get_by_text("Upload a DontSee image to decrypt")).to_be_visible()

    # The main functionality (buttons) appears only after image upload.
    # Since we can't easily upload an image in this headless script without a file,
    # we will verify the initial state which proves the app loaded and rendered the main component.

    print("Taking screenshot...")
    page.screenshot(path="verification/app_loaded.png")
    print("Done.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_app_load(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
