from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        print("Launching browser...")
        # Use software rendering to avoid WebGL crash in headless mode if necessary
        browser = p.chromium.launch(headless=True, args=['--use-gl=swiftshader'])
        page = browser.new_page()
        page.set_viewport_size({"width": 1280, "height": 720})

        print("Navigating...")
        page.goto("http://localhost:5173", timeout=60000)

        print("Waiting for canvas...")
        try:
            page.wait_for_selector("canvas", timeout=30000)
        except:
             print("Canvas not found")
             return

        print("Waiting for Enter button...")
        # Try to find the Enter button
        try:
            enter_button = page.get_by_text("ENTER", exact=True)
            if enter_button.is_visible():
                print("Clicking Enter...")
                enter_button.click()
            else:
                print("Enter button not visible?")
        except Exception as e:
            print(f"Error finding/clicking enter: {e}")

        print("Waiting for transition...")
        time.sleep(10) # Wait for fade out and scene reveal

        print("Taking screenshot...")
        page.screenshot(path="verification/verification_scene.png", timeout=60000)
        print("Screenshot saved.")

        browser.close()

if __name__ == "__main__":
    run()
