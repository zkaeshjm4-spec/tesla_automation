from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp("http://127.0.0.1:9222")
    context = browser.contexts[0]
    page = context.pages[0]

    page.keyboard.press("Escape")
    time.sleep(1)

    rows = page.locator("table tbody tr")
    rows.nth(0).locator("[data-cy='tableDropdownActions'] button").first.click()
    time.sleep(2)
    page.locator("[role='option'][data-tds-value='manageDriver']:visible").first.click()
    time.sleep(2)

    drivers = page.locator("ul.tds-list li").filter(has=page.locator(".tds-dropdown-trigger"))
    print("real driver count:", drivers.count())
    for k in range(drivers.count()):
        print(f"  [{k}] pay={drivers.nth(k).locator('svg.tds-icon-payment').count()>0} text={drivers.nth(k).inner_text()!r}")

    target = drivers.filter(has_not=page.locator("svg.tds-icon-payment")).first
    print("clicking menu for:", target.inner_text())
    target.locator(".tds-dropdown-trigger").first.click()
    time.sleep(1)
    opt = page.locator("[role='option'][data-tds-value='managePaymentResponsibility']:visible").first
    opt.click()
    time.sleep(3)

    print("\nURL:", page.url)
    body = page.evaluate("document.body.innerText")
    print("=== BODY TEXT ===")
    print(body[:1500])
    html = page.content()
    with open("pay_modal_dom.html", "w", encoding="utf-8") as f:
        f.write(html)
    print("\nRADIO/radio count:", page.locator("input[type='radio']").count())
    print("checkbox count:", page.locator("input[type='checkbox']").count())
    for sel in ["input[type='radio']", "input[type='checkbox']"]:
        loc = page.locator(sel)
        for k in range(loc.count()):
            try:
                print(f"  {sel}[{k}]:", loc.nth(k).evaluate("el => el.outerHTML")[:300])
            except Exception:
                pass
    btns = page.locator("[role='dialog'] button, .tds-modal button")
    print("modal buttons:", btns.count())
    for k in range(btns.count()):
        try:
            print("   BTN:", btns.nth(k).evaluate("el => el.outerHTML")[:200])
        except Exception:
            pass
    browser.close()