from playwright.sync_api import sync_playwright, expect

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            # Log in
            page.goto("http://localhost:1717")
            page.get_by_label("Username").fill("admin")
            page.get_by_label("Password").fill("admin")
            page.get_by_role("button", name="SIGN IN").click()

            # Wait for the dashboard to load by checking for a known element
            expect(page.locator("div.mb-8 > h2.title-flat")).to_have_text("Dashboard")

            # Navigate to Users page by clicking the link
            page.get_by_role("link", name="User Management").click()

            # Wait for the user list to load
            expect(page.locator("div.mb-8 > h2.title-flat")).to_have_text("Users")

            # Take screenshot
            page.screenshot(path="jules-scratch/verification/verification.png")

        except Exception as e:
            print(f"An error occurred: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    run_verification()