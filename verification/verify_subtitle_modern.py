from playwright.sync_api import sync_playwright

def verify_subtitle_and_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the app (Vite default is usually 5173 but previous log said 3000)
        page.goto("http://localhost:3000")

        # Wait for the app to load
        page.wait_for_selector("main")

        # Verify initial state: "Steganography" header
        page.wait_for_selector("text=Steganography")

        # Wait for blinking cursor animation (just time wait)
        page.wait_for_timeout(2000)

        # Take a screenshot to verify modernized subtitle and cursor
        page.screenshot(path="verification/modern_subtitle.png")

        browser.close()

if __name__ == "__main__":
    verify_subtitle_and_ui()
