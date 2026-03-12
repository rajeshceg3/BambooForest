from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader"]
        )
        page = browser.new_page()
        page.goto('http://localhost:4173')

        # Wait for loading to complete (it's 100% when started button appears)
        page.wait_for_selector('button:has-text("Enter")', state="visible", timeout=60000)

        # Take a screenshot of the intro screen
        page.screenshot(path="intro_screen.png")

        # Click enter using Playwright locator, but do evaluating to click just the button tag
        page.evaluate('''
            Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes("Enter")).click()
        ''')

        # Wait a bit for the transition
        page.wait_for_timeout(3000)

        # Take a screenshot of the UI active
        page.screenshot(path="ui_active.png")

        # Wait for 5 seconds for idle state to kick in
        page.wait_for_timeout(5500)

        # Take a screenshot of the UI idle
        page.screenshot(path="ui_idle.png")

        browser.close()

if __name__ == '__main__':
    run()
