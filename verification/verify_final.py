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
        except:
             print("Canvas not found")
             return

        print("Waiting for intro...")
        time.sleep(5)

        print("Looking for ENTER button...")
        try:
            # Try different selectors
            button_clicked = False

            # 1. Exact text with spaces
            enter_text = page.get_by_text("E N T E R")
            if enter_text.count() > 0:
                print("Found 'E N T E R' text. Clicking...")
                enter_text.first.click()
                button_clicked = True

            # 2. Button role
            if not button_clicked:
                buttons = page.get_by_role("button")
                if buttons.count() > 0:
                    print("Found button role. Clicking first button...")
                    buttons.first.click()
                    button_clicked = True

            if not button_clicked:
                print("Could not find button. Clicking center of screen...")
                page.mouse.click(640, 360)

        except Exception as e:
            print(f"Error interaction: {e}")

        print("Waiting for transition to complete...")
        time.sleep(15)

        print("Taking final screenshot...")
        page.screenshot(path="verification/verification_final.png", timeout=60000)
        print("Screenshot saved to verification/verification_final.png")

        browser.close()

if __name__ == "__main__":
    run()
