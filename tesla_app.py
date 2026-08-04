import os
import sys
import io
import time
import socket
import queue
import threading
import subprocess
import traceback
import tkinter as tk
from tkinter import scrolledtext, messagebox

BASE_DIR = os.path.dirname(os.path.abspath(sys.executable if getattr(sys, "frozen", False) else __file__))
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
PROFILE_DIR = os.path.join(BASE_DIR, "chrome_profile_real")
SESSION_FILE = os.path.join(BASE_DIR, "storage_state.json")
PORT = 9222


class StreamRedirector(io.TextIOBase):
    def __init__(self, log_queue):
        self.log_queue = log_queue

    def write(self, message):
        if message and message.strip():
            self.log_queue.put(message.rstrip("\n"))
        return len(message)

    def flush(self):
        pass


def chrome_running():
    try:
        s = socket.create_connection(("127.0.0.1", PORT), timeout=0.5)
        s.close()
        return True
    except OSError:
        return False


def kill_leftover_chrome():
    cmd = (
        "Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" | "
        "Where-Object { $_.CommandLine -match 'chrome_profile_real|remote-debugging-port=9222' } | "
        "ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
    )
    subprocess.run(["powershell", "-NoProfile", "-Command", cmd], timeout=30)


def start_chrome(log):
    log("Closing any leftover automation Chrome...")
    kill_leftover_chrome()
    deadline = time.time() + 20
    while time.time() < deadline and chrome_running():
        time.sleep(0.5)
    log("Starting automation Chrome with remote debugging...")
    os.makedirs(PROFILE_DIR, exist_ok=True)
    subprocess.Popen([CHROME_PATH, f"--remote-debugging-port={PORT}", f"--user-data-dir={PROFILE_DIR}"])
    deadline = time.time() + 30
    while time.time() < deadline and not chrome_running():
        time.sleep(0.5)
    if chrome_running():
        log(f"Chrome is listening on port {PORT}.")
    else:
        log("ERROR: Chrome did not start listening on port 9222.")


class TeslaApp:
    def __init__(self, root):
        self.root = root
        self.log_queue = queue.Queue()
        self.running = False

        root.title("Tesla Fleet Automation")
        root.geometry("760x520")
        root.configure(bg="#111827")

        header = tk.Label(root, text="Tesla Fleet Payment Automation", font=("Segoe UI", 16, "bold"),
                          bg="#111827", fg="#f9fafb")
        header.pack(pady=(12, 2))

        self.status_label = tk.Label(root, text="", font=("Segoe UI", 9), bg="#111827", fg="#9ca3af")
        self.status_label.pack(pady=(0, 8))

        buttons = tk.Frame(root, bg="#111827")
        buttons.pack(pady=4)
        self.chrome_btn = tk.Button(buttons, text="Start Chrome", width=16, command=self.on_start_chrome,
                                    bg="#374151", fg="white", activebackground="#4b5563", relief="flat")
        self.chrome_btn.grid(row=0, column=0, padx=6)
        self.run_btn = tk.Button(buttons, text="Run Automation", width=16, command=self.on_run,
                                 bg="#2563eb", fg="white", activebackground="#1d4ed8", relief="flat")
        self.run_btn.grid(row=0, column=1, padx=6)

        self.log_area = scrolledtext.ScrolledText(root, height=20, bg="#0f172a", fg="#d1d5db",
                                                  font=("Consolas", 9), state="disabled", wrap="word")
        self.log_area.pack(fill="both", expand=True, padx=12, pady=(8, 12))

        self.root.after(100, self.poll_queue)
        self.refresh_status()

    def log(self, message):
        self.log_queue.put(str(message))

    def poll_queue(self):
        try:
            while True:
                line = self.log_queue.get_nowait()
                self.log_area.configure(state="normal")
                self.log_area.insert("end", line + "\n")
                self.log_area.see("end")
                self.log_area.configure(state="disabled")
        except queue.Empty:
            pass
        self.root.after(100, self.poll_queue)

    def refresh_status(self):
        chrome = "running" if chrome_running() else "not running"
        session = "found" if os.path.exists(SESSION_FILE) else "MISSING (login required on first run)"
        self.status_label.configure(text=f"Chrome (port {PORT}): {chrome}   |   Tesla session: {session}")

    def on_start_chrome(self):
        self.chrome_btn.configure(state="disabled")
        threading.Thread(target=self._start_chrome_worker, daemon=True).start()

    def _start_chrome_worker(self):
        try:
            start_chrome(self.log)
        except Exception as exc:
            self.log(f"ERROR starting Chrome: {exc}")
        finally:
            self.root.after(0, self._enable_chrome_btn)

    def _enable_chrome_btn(self):
        self.chrome_btn.configure(state="normal")
        self.refresh_status()

    def on_run(self):
        if self.running:
            messagebox.showinfo("Tesla Fleet Automation", "Automation is already running.")
            return
        self.run_btn.configure(state="disabled")
        self.running = True
        threading.Thread(target=self._run_worker, daemon=True).start()

    def _run_worker(self):
        try:
            if not chrome_running():
                self.log("Chrome is not running. Starting it automatically...")
                start_chrome(self.log)
            from tesla_fleet_automation import OrchestratorAgent
            orchestrator = OrchestratorAgent()
            redirector = StreamRedirector(self.log_queue)
            sys.stdout = redirector
            sys.stderr = redirector
            try:
                orchestrator.run(ci_mode=False)
            finally:
                sys.stdout = sys.__stdout__
                sys.stderr = sys.__stderr__
            self.log("Automation run finished.")
        except Exception:
            self.log("UNHANDLED ERROR:\n" + traceback.format_exc())
        finally:
            self.running = False
            self.root.after(0, self._enable_run_btn)

    def _enable_run_btn(self):
        self.run_btn.configure(state="normal")
        self.refresh_status()


def main():
    os.chdir(BASE_DIR)
    root = tk.Tk()
    TeslaApp(root)
    root.mainloop()


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        result = []
        try:
            import playwright
            from tesla_fleet_automation import OrchestratorAgent
            result.append(f"playwright import OK")
            result.append("OrchestratorAgent import OK")
            from playwright.sync_api import sync_playwright
            p = sync_playwright().start()
            result.append("sync_playwright driver OK")
            p.stop()
        except Exception as exc:
            result.append(f"SELFTEST FAILED: {traceback.format_exc()}")
        with open(os.path.join(BASE_DIR, "selftest_result.txt"), "w", encoding="utf-8") as f:
            f.write("\n".join(result))
        sys.exit(0)
    try:
        main()
    except Exception:
        with open(os.path.join(BASE_DIR, "app_error.log"), "w", encoding="utf-8") as f:
            f.write(traceback.format_exc())
        raise
