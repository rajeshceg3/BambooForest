from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        print("Launching browser...")
        browser = p.chromium.launch(headless=True, args=['--use-gl=swiftshader'])
        page = browser.new_page()
        page.set_viewport_size({"width": 1280, "height": 720})

        print("Navigating...")
        page.goto("http://localhost:5173", timeout=60000)

        print("Waiting for canvas...")
        try:
            page.wait_for_selector("canvas", timeout=30000)
        except Exception as e:
            print(f"Canvas not found: {e}")
            page.screenshot(path="verification/error_screenshot.png")
            browser.close()
            return

        print("Waiting for scene to stabilize...")
        time.sleep(10) # Give more time for heavy shaders

        print("Taking screenshot...")
        try:
            page.screenshot(path="verification/verification.png", timeout=60000)
            print("Screenshot saved.")
        except Exception as e:
             print(f"Screenshot failed: {e}")

        browser.close()

if __name__ == "__main__":
    run()
