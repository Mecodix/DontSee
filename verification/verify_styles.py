from playwright.sync_api import sync_playwright

def verify_styling():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            # Wait for server to start
            page.goto("http://localhost:3000")

            # Wait for main content to be visible
            page.wait_for_selector("body")

            # Take a screenshot of the main page
            page.screenshot(path="verification/verification.png")
            print("Screenshot taken successfully")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_styling()
