from playwright.sync_api import sync_playwright

def dump_dom():
    try:
        with sync_playwright() as p:
            browser = p.chromium.connect_over_cdp("http://localhost:9222")
            context = browser.contexts[0]
            page = context.pages[0]
            print(f"Connected to page: {page.title()}")
            html = page.content()
            with open("dom.html", "w", encoding="utf-8") as f:
                f.write(html)
            print("DOM saved to dom.html")
            browser.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    dump_dom()
