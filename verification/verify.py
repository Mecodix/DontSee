from playwright.sync_api import sync_playwright, expect

def verify_app():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            # Navigate to the preview server
            page.goto("http://localhost:4173")

            # Wait for the title to contain "DontSee"
            expect(page).to_have_title("DontSee | Secure Steganography")

            # Wait for the main header to be visible
            expect(page.get_by_role("heading", name="DontSee")).to_be_visible()

            # Take a screenshot
            page.screenshot(path="verification/app_screenshot.png")
            print("Screenshot taken successfully")
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_app()
