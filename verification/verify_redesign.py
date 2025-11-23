from playwright.sync_api import sync_playwright

def verify_redesign():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            page.goto("http://localhost:3000")
            page.wait_for_load_state("networkidle")

            # Take a screenshot of the landing page
            page.screenshot(path="verification/landing_page.png")
            print("Screenshot taken: verification/landing_page.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_redesign()
