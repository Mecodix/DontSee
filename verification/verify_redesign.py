from playwright.sync_api import sync_playwright

def verify_redesign():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Increase viewport to capture desktop view properly
        page = browser.new_page(viewport={'width': 1280, 'height': 800})

        try:
            print("Navigating to app...")
            page.goto("http://localhost:3000")

            # Wait for main container to ensure fonts and styles load
            page.wait_for_selector("main")

            print("Taking screenshot of initial state...")
            page.screenshot(path="verification/redesign_initial.png")

            # Additional check: Does header have glassmorphism?
            header = page.locator("header").first
            # We can't easily check css properties via simple boolean, but screenshot is key.

            print("Screenshot saved to verification/redesign_initial.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_redesign()
