from playwright.sync_api import sync_playwright

def verify_changes():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the app (Vite default is usually 5173 but previous log said 3000)
        page.goto("http://localhost:3000")

        # Wait for the app to load
        page.wait_for_selector("main")

        # Verify initial state: "True Steganography" header
        page.wait_for_selector("text=True Steganography")

        # Take a screenshot of the initial state
        page.screenshot(path="verification/true_stego_initial.png")

        browser.close()

if __name__ == "__main__":
    verify_changes()
