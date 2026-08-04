import os
import time
from playwright.sync_api import sync_playwright, Page, TimeoutError as PlaywrightTimeoutError

class QAAgent:
    """QA/Bug Finder Agent: Real-time Workflow Inspector and Healer."""
    
    def __init__(self, page: Page):
        self.page = page

    def verify_panel_opened(self, panel_locator):
        try:
            panel_locator.wait_for(state="visible", timeout=5000)
            return True
        except PlaywrightTimeoutError:
            print("[QA Agent] BUG: Side panel failed to open.")
            return False

    def verify_panel_closed(self, panel_locator):
        try:
            panel_locator.wait_for(state="hidden", timeout=5000)
            return True
        except PlaywrightTimeoutError:
            print("[QA Agent] BUG: Side panel failed to close.")
            return False

    def verify_save_button(self, save_button):
        if save_button.is_disabled():
            print("[QA Agent] BUG: Save button is disabled.")
            return False
        return True

    def check_for_toast_errors(self):
        # Look for common toast error classes/roles
        toasts = self.page.locator("div[role='alert'], .toast-error, .snack-bar-error")
        if toasts.count() > 0 and toasts.first.is_visible():
            print(f"[QA Agent] BUG: API error toast detected: {toasts.first.text_content()}")
            return False
        return True

class WorkerAgent:
    """Worker/Tester Agent: Python Playwright Automation Driver."""
    
    def __init__(self, page: Page, qa_agent: QAAgent, orchestrator):
        self.page = page
        self.qa = qa_agent
        self.orchestrator = orchestrator
        self.successes = 0
        self.skips = 0
        self.failures = 0

    def process_vehicles(self):
        print("[Worker Agent] Starting table traversal...")
        table_rows = self.page.locator("table tbody tr")
        
        self.page.wait_for_timeout(2000)
        row_count = table_rows.count()
        
        start_idx = 0
        if row_count > 0 and table_rows.nth(0).locator("th, [role='columnheader']").count() > 0:
            start_idx = 1
            
        if row_count <= start_idx:
            msg = "[Worker Agent] Could not find 'Owned Vehicles' rows. Please verify table selector."
            print(msg)
            self.orchestrator.report_issue(msg)
            return

        print(f"[Worker Agent] Found {row_count - start_idx} vehicle rows to process.")
        
        for i in range(start_idx, row_count):
            print(f"\n[Worker Agent] Processing row {i - start_idx + 1}/{row_count - start_idx}...")
            row = table_rows.nth(i)
            
            try:
                # Clear any leftover overlays (multiple Escapes in case of stacked modals)
                for _ in range(3):
                    try:
                        self.page.keyboard.press("Escape")
                    except Exception:
                        pass
                    self.page.wait_for_timeout(300)
            except Exception:
                pass
            
            try:
                # 1. Click three-dot menu on the vehicle row (retry once if a stale overlay blocks)
                menu_btn = None
                for attempt in range(2):
                    menu_btn = row.locator("[data-cy='tableDropdownActions'] button").first
                    menu_btn.scroll_into_view_if_needed()
                    menu_btn.click()
                    self.page.wait_for_timeout(800)
                    if self.page.locator("[role='option'][data-tds-value='manageDriver']:visible").count() > 0:
                        break
                    for _ in range(3):
                        try:
                            self.page.keyboard.press("Escape")
                        except Exception:
                            pass
                        self.page.wait_for_timeout(300)
                
                # 2. Click "Manage Drivers" from the row menu (visible option only)
                def open_manage_panel():
                    manage_opt = self.page.locator("[role='option'][data-tds-value='manageDriver']:visible").first
                    manage_opt.wait_for(state="visible", timeout=5000)
                    manage_opt.click()
                    self.page.wait_for_selector("ul.tds-list li", timeout=8000)
                    self.page.wait_for_timeout(1500)

                open_manage_panel()
                
                # 3. Real drivers = listed items that have a per-driver menu
                def get_drivers():
                    return self.page.locator("ul.tds-list li").filter(has=self.page.locator(".tds-dropdown-trigger"))
                
                # Loop through drivers; if the panel closes itself after a save, reopen it
                # and keep going until every driver has been handled.
                target = get_drivers().count()
                print(f"[Worker Agent] Found {target} drivers in panel.")
                j = 0
                reopen_guard = 0
                while True:
                    driver_items = get_drivers()
                    n = driver_items.count()
                    if n == 0:
                        # Panel disappeared after a save. Reopen to continue remaining drivers.
                        if j < target and reopen_guard < 8:
                            reopen_guard += 1
                            try:
                                menu_btn.click()
                                self.page.wait_for_timeout(800)
                                open_manage_panel()
                                continue
                            except Exception:
                                break
                        break
                    if j >= n:
                        if j >= target:
                            break
                        j = 0
                        continue
                    
                    try:
                        driver = driver_items.nth(j)
                        driver_text = driver.inner_text(timeout=5000).lower()
                    except Exception:
                        # List re-rendered mid-read; retry this index.
                        continue
                    
                    # 4. Skip account/operations drivers
                    if "operation" in driver_text or "@wheelsofavalon" in driver_text:
                        print(f"  -> Skipping driver {j+1}: account/operations driver.")
                        self.skips += 1
                        j += 1
                        continue
                        
                    # 5. Skip drivers that already have payment responsibility
                    if driver.locator("svg.tds-icon-payment").count() > 0:
                        print(f"  -> Skipping driver {j+1}: payment responsibility already set.")
                        self.skips += 1
                        j += 1
                        continue
                        
                    # 6. Open the driver's menu -> Manage Payment Responsibility
                    print(f"  -> Modifying payment responsibility for driver {j+1}...")
                    driver.locator(".tds-dropdown-trigger").first.click()
                    self.page.wait_for_timeout(1000)
                    
                    payment_opt = self.page.locator("[role='option'][data-tds-value='managePaymentResponsibility']:visible").first
                    payment_opt.wait_for(state="visible", timeout=5000)
                    payment_opt.click()
                    self.page.wait_for_timeout(1500)
                    
                    # 7. Tick "Charging" and Save
                    charging_box = self.page.locator("input[type='checkbox'][name='payerRole'][value='charging']").first
                    charging_box.wait_for(state="visible", timeout=5000)
                    if not charging_box.is_checked():
                        charging_box.check(force=True)
                    self.page.wait_for_timeout(500)
                    
                    save_btn = self.page.locator("[role='dialog'] button:has-text('Save'):visible, button:has-text('Save'):visible").last
                    if save_btn.is_disabled():
                        # Already set -> treat as success.
                        print(f"  -> Driver {j+1} already configured (Save disabled).")
                        self.successes += 1
                        j += 1
                        continue
                    else:
                        save_btn.click()
                        self.page.wait_for_timeout(2500)
                        if not self.qa.check_for_toast_errors():
                            self.failures += 1
                        else:
                            self.successes += 1
                            print(f"  -> Driver {j+1} done. Charging payment responsibility set.")
                    
                    # Close ONLY the payment modal (keep the Manage Drivers panel open)
                    try:
                        close_modal = self.page.locator("[role='dialog'] button[aria-label='Close Modal']:visible").first
                        if close_modal.count() > 0:
                            close_modal.click()
                        else:
                            self.page.keyboard.press("Escape")
                    except Exception:
                        try:
                            self.page.keyboard.press("Escape")
                        except Exception:
                            pass
                    self.page.wait_for_timeout(1200)
                    j += 1
                
                # 8. Close the Manage Drivers panel
                try:
                    for _ in range(2):
                        self.page.keyboard.press("Escape")
                        self.page.wait_for_timeout(400)
                except Exception:
                    pass
                self.page.wait_for_timeout(1000)
                
            except Exception as e:
                print(f"[Worker Agent] Exception on row {i - start_idx + 1}: {e}")
                self.failures += 1
                
            # Report status every 5 rows
            processed_so_far = i - start_idx + 1
            if processed_so_far % 5 == 0 or processed_so_far == (row_count - start_idx):
                self.orchestrator.log_status(f"Processed {processed_so_far}/{row_count - start_idx} rows. Success: {self.successes}, Skips: {self.skips}, Failures: {self.failures}")

class OrchestratorAgent:
    """Main Agent: Project Manager and Final Approver."""
    
    def __init__(self):
        self.logs = []
        self.issues = []
        self.worker = None

    def log_status(self, msg):
        print(f"[Orchestrator] {msg}")
        self.logs.append(msg)

    def report_issue(self, issue):
        self.issues.append(issue)

    def run(self, ci_mode=False):
        print("[Orchestrator] Initializing Multi-Agent Framework...")
        is_ci = ci_mode or os.environ.get("CI") == "true" or os.environ.get("HEADLESS") == "true"
        
        try:
            with sync_playwright() as p:
                if is_ci:
                    print("[Orchestrator] Running in CI / Headless Mode...")
                    storage_state_path = "storage_state.json"
                    
                    # If TESLA_STORAGE_STATE env var is provided, write it to file
                    env_storage = os.environ.get("TESLA_STORAGE_STATE")
                    if env_storage and not os.path.exists(storage_state_path):
                        with open(storage_state_path, "w", encoding="utf-8") as f:
                            f.write(env_storage)
                            
                    if not os.path.exists(storage_state_path):
                        msg = "No storage_state.json found. Please authenticate and upload Tesla session state via Vercel UI."
                        print(f"[Orchestrator] [SESSION_EXPIRED] {msg}")
                        self.generate_report(error=msg, status_code="LOGGED_OUT")
                        return

                    browser = p.chromium.launch(headless=True)
                    context = browser.new_context(storage_state=storage_state_path)
                    page = context.new_page()
                    
                    fleet_url = "https://www.tesla.com/teslaaccount/business/fleets/landing/1d567283-8292-40a7-8bbe-224aa88e85f8"
                    print(f"[Orchestrator] Navigating to Tesla Fleet Portal ({fleet_url})...")
                    page.goto(fleet_url, wait_until="domcontentloaded")
                    
                    # Check if redirected to auth / login page
                    page.wait_for_timeout(5000)
                    if "auth.tesla.com" in page.url or "ssologin" in page.url or page.locator("input[name='identity'], input[type='email']").count() > 0:
                        msg = "Tesla session expired or invalid. Re-authentication required in Vercel UI."
                        print(f"[Orchestrator] [SESSION_EXPIRED] {msg}")
                        self.generate_report(error=msg, status_code="LOGGED_OUT")
                        return
                else:
                    print("[Orchestrator] Preparing your real Chrome profile copy (one-time)...")
                    real_profile = r"C:\Users\HP\AppData\Local\Google\Chrome\User Data"
                    mirror_profile = os.path.join(os.path.dirname(os.path.abspath(__file__)), "chrome_profile_real")
                    mirror_default = os.path.join(mirror_profile, "Default")
                    if os.path.exists(os.path.join(mirror_default, "Preferences")) is False:
                        import shutil
                        print("[Orchestrator] First run: copying your real Chrome profile (one-time)...")
                        os.makedirs(mirror_profile, exist_ok=True)
                        shutil.copytree(os.path.join(real_profile, "Default"), mirror_default)
                        local_state = os.path.join(real_profile, "Local State")
                        if os.path.exists(local_state):
                            shutil.copy2(local_state, os.path.join(mirror_profile, "Local State"))

                    print("[Orchestrator] Waiting for Chrome to start (remote debugging on port 9222)...")
                    print("[Orchestrator] >>> If Chrome is not open yet, run 'start_chrome.bat' now. <<<")
                    browser = None
                    deadline = time.time() + 600
                    while time.time() < deadline:
                        try:
                            browser = p.chromium.connect_over_cdp("http://127.0.0.1:9222")
                            break
                        except Exception:
                            time.sleep(3)
                    if browser is None:
                        print("[Orchestrator] Chrome never started. Run 'start_chrome.bat' and try again.")
                        self.generate_report(error="Chrome not detected on port 9222")
                        return

                    context = browser.contexts[0] if browser.contexts else browser.new_context()
                    page = context.pages[0] if context.pages else context.new_page()
                    print("[Orchestrator] Connected to your Chrome.")

                    if "teslaaccount/business" not in page.url:
                        print("[Orchestrator] Opening Tesla Business Fleet page...")
                        page.goto("https://www.tesla.com/teslaaccount/business/fleets/landing/1d567283-8292-40a7-8bbe-224aa88e85f8")

                    print("[Orchestrator] Waiting for you to log in (waits until logged in, Ctrl+C to stop). "
                          "Solve the CAPTCHA and log in normally in the browser...")
                    while True:
                        try:
                            page.wait_for_selector("table tbody tr, [role='row']", timeout=5000)
                            break
                        except PlaywrightTimeoutError:
                            print(f"[Orchestrator] Still waiting for login... (page: {page.title()})")

                print(f"[Orchestrator] Logged in. Proceeding with workflow. Page title: {page.title()}")

                # Export storage state for future CI runs
                try:
                    context.storage_state(path="storage_state.json")
                    print("[Orchestrator] Saved updated session state to storage_state.json")
                except Exception as ex:
                    print(f"[Orchestrator] Warning: could not save storage state: {ex}")

                qa_agent = QAAgent(page)
                self.worker = WorkerAgent(page, qa_agent, self)
                self.worker.process_vehicles()

                self.generate_report()

        except Exception as e:
            print(f"[Orchestrator] Failed to connect or execute. Error: {e}")
            self.generate_report(error=str(e))

    def generate_report(self, error=None, status_code=None):
        import json
        print("\n[Orchestrator] Generating final execution report...")
        
        status = status_code or ("FAILED" if error else "COMPLETED")
        successes = self.worker.successes if self.worker else 0
        skips = self.worker.skips if self.worker else 0
        failures = self.worker.failures if self.worker else 0
        
        # Write JSON summary for API / Vercel consuming
        summary_data = {
            "timestamp": time.ctime(),
            "status": status,
            "error": error,
            "successes": successes,
            "skips": skips,
            "failures": failures,
            "logs": self.logs,
            "issues": self.issues
        }
        with open("run_summary.json", "w", encoding="utf-8") as sf:
            json.dump(summary_data, sf, indent=2)
            
        with open("execution_report.md", "a", encoding="utf-8") as f:
            f.write(f"\n## Execution Run - {time.ctime()}\n\n")
            if error:
                f.write(f"**Status:** {status}\n**Error:** {error}\n")
            elif self.worker:
                f.write(f"**Status:** Completed\n")
                f.write(f"**Successes:** {successes}\n")
                f.write(f"**Skips:** {skips}\n")
                f.write(f"**Failures:** {failures}\n")
                
                if len(self.issues) == 0 and failures == 0:
                    f.write("\n### APPROVAL\n")
                    f.write("**WORKFLOW COMPLETION APPROVED BY MAIN ORCHESTRATOR.**\n")
                    print("WORKFLOW COMPLETION APPROVED BY MAIN ORCHESTRATOR.")
                else:
                    f.write("\n### WARNINGS / ISSUES\n")
                    for issue in self.issues:
                        f.write(f"- {issue}\n")
                    print("[Orchestrator] Workflow completed with warnings/errors. See execution_report.md.")
            else:
                f.write("**Status:** Unknown Failure\n")

if __name__ == "__main__":
    import sys
    ci_flag = "--ci" in sys.argv or "-ci" in sys.argv
    orchestrator = OrchestratorAgent()
    orchestrator.run(ci_mode=ci_flag)

