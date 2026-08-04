# 🚀 Tesla Fleet Automation: GitHub Actions & Vercel Setup Guide

This guide explains how to deploy your Tesla Fleet Payment Automation to **GitHub Actions** and launch your interactive **Vercel Control Center Dashboard**.

---

## 🏗️ Architecture Overview

* **GitHub Actions (`.github/workflows/tesla_automation.yml`)**: Runs your Playwright Python automation script headlessly in the cloud.
* **Vercel Web App (`dashboard/`)**: A Next.js web application that lets you:
  * ⚡ **Trigger** automation runs on demand with 1 click.
  * 📊 View live **run history & status logs**.
  * 🔐 **Re-authenticate** your Tesla SSO session by updating `TESLA_STORAGE_STATE` in GitHub Secrets.

---

## 📋 Step 1: Push Code to GitHub

1. Initialize Git in your project directory (if not done already):
   ```bash
   git init
   git add .
   git commit -m "Add Tesla automation, GitHub Action workflow, and Vercel Next.js dashboard"
   ```
2. Create a new repository on GitHub (Private or Public).
3. Connect and push your code:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/tesla-automation.git
   git branch -M main
   git push -u origin main
   ```

---

## 🔑 Step 2: Create a GitHub Personal Access Token (PAT)

Your Vercel dashboard uses a GitHub PAT to trigger workflows and update session secrets via the GitHub API.

1. Go to **GitHub** → **Settings** → **Developer Settings** → **Personal Access Tokens** → **Tokens (classic)**.
2. Click **Generate new token (classic)**.
3. Name: `Vercel Tesla Automation`
4. Select Scopes:
   * ✅ `repo` (Full control of private repositories)
   * ✅ `workflow` (Update GitHub Action workflows)
5. Click **Generate token** and copy the string (`ghp_xxxxxxxxxxxx`).

---

## 🔺 Step 3: Deploy Dashboard to Vercel

### Option A: Via Vercel Dashboard (Easiest)
1. Go to [vercel.com/new](https://vercel.com/new).
2. Import your GitHub repository (`tesla-automation`).
3. Set **Root Directory** to `dashboard`.
4. Framework Preset: **Next.js**.
5. Click **Deploy**.

### Option B: Via Vercel CLI
```bash
cd dashboard
npx vercel
```

---

## 🔐 Step 4: Initial Tesla Login / Session Setup

Because Tesla uses SSO with 2FA/CAPTCHA, headless automatic password login in cloud CI gets blocked. 

To give GitHub Actions access to your logged-in Tesla session:

### How to export session state locally:
1. Run `python tesla_fleet_automation.py` locally on your computer.
2. Log into your Tesla Fleet account in Chrome.
3. The script will automatically save your authenticated cookies to `storage_state.json`.
4. Open `storage_state.json` and copy its entire JSON content.

### Sync to Vercel Dashboard:
1. Open your deployed Vercel Dashboard URL.
2. Click **Re-authenticate / Sync Cookies**.
3. Paste the contents of `storage_state.json`.
4. Click **Sync Session Secret**.

This automatically encrypts and saves your session to GitHub Secrets (`TESLA_STORAGE_STATE`). 

---

## ⚡ Step 5: Trigger & Automate

* **Scheduled**: Runs automatically every day at 08:00 UTC on GitHub Actions.
* **On Demand**: Click **Trigger Automation Now** in your Vercel Dashboard anytime!
