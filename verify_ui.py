from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader"]
        )
        context = browser.new_context(record_video_dir="/home/jules/verification/video", viewport={"width": 1280, "height": 720})
        page = context.new_page()
        page.goto('http://localhost:4173')

        # Wait for loading to complete
        page.wait_for_selector('button:has-text("Enter")', state="visible", timeout=60000)

        # Click enter
        page.evaluate('''
            Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes("Enter")).click()
        ''')

        # Wait a bit for the transition
        page.wait_for_timeout(4000)

        # Hover over clearing
        page.evaluate('''
            const btn = document.querySelector('button[aria-label="Go to Clearing"]');
            if (btn) {
                btn.dispatchEvent(new MouseEvent('mouseover', { 'bubbles': true, 'cancelable': true }));
            }
        ''')
        page.wait_for_timeout(1000)

        # CDP Screenshot fallback
        try:
           client = page.context.new_cdp_session(page)
           result = client.send("Page.captureScreenshot")
           import base64
           image_data = base64.b64decode(result["data"])
           with open("/home/jules/verification/verification.png", "wb") as f:
               f.write(image_data)
        except Exception as e:
           print("Failed to save via CDP", e)

        context.close()
        browser.close()

if __name__ == '__main__':
    run()
