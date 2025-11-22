
from playwright.sync_api import Page, expect, sync_playwright
import time

def verify_scanning_delay(page: Page):
    print("Navigating to app...")
    page.goto("http://localhost:3000")

    # We can't easily drag-drop a real file in headless mode without a slightly complex setup
    # but we can verify the logic by observing that the state doesn't change "immediately".
    # Ideally we'd have a way to trigger the file input.

    print("Mocking file upload...")
    # Create a dummy file for upload
    with page.expect_file_chooser() as fc_info:
        page.locator("input[type=file]").click()
    file_chooser = fc_info.value

    # We need a dummy image. Let's assume one exists or create one?
    # Playwright might not have access to local FS easily if in a container?
    # But here we are in the sandbox, we can create a dummy image.

    # Note: We need a valid image for magic byte check.
    # We can use `read_image_file` if we had one, but we don't.
    # Let's skip the byte check or mock it?
    # Actually, creating a valid minimal PNG is easy.

    with open("test_image.png", "wb") as f:
        # Minimal 1x1 PNG
        f.write(b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82')

    print("Uploading file...")
    file_chooser.set_files("test_image.png")

    print("Checking for IMMEDIATE 'Analyzing...' text...")
    # With the bug (and 3s delay), this should FAIL to find "Analyzing Image..." immediately.
    try:
        expect(page.get_by_text("Analyzing Image...")).to_be_visible(timeout=500)
        print("PASS: 'Analyzing Image...' appeared immediately (Unexpected for bug repro)")
    except:
        print("SUCCESS: 'Analyzing Image...' did NOT appear immediately. Bug reproduced.")
        page.screenshot(path="verification/bug_reproduced.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_scanning_delay(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
