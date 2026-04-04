from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.firefox.launch(headless=True)
    page = browser.new_page()
    page.goto("http://localhost:4173")
    page.wait_for_timeout(10000) # Wait 10 seconds for WebGL to load
    page.screenshot(path="/home/jules/verification/video/screenshot.png")
    browser.close()
