import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const owner = body.owner || process.env.GITHUB_OWNER || 'zkaeshjm4-spec';
    const repo = body.repo || process.env.GITHUB_REPO || 'tesla_automation';
    const pat = body.pat || process.env.GITHUB_PAT;

    if (!pat) {
      return NextResponse.json(
        { error: 'Missing GitHub Personal Access Token. Set GITHUB_PAT in Vercel environment variables or enter it in settings.' },
        { status: 400 }
      );
    }

    const headers = {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${pat}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    };

    // 1. Try workflow_dispatch API first
    const workflowDispatchUrl = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/tesla_automation.yml/dispatches`;
    let response = await fetch(workflowDispatchUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ref: 'main' }),
    });

    // 2. Fallback to repository_dispatch API if workflow_dispatch returns 404
    if (response.status === 404) {
      const repoDispatchUrl = `https://api.github.com/repos/${owner}/${repo}/dispatches`;
      response = await fetch(repoDispatchUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          event_type: 'trigger-tesla-automation',
          client_payload: { trigger_source: 'Vercel Control Center UI' },
        }),
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      let customError = `GitHub API error (${response.status}): ${errorText}`;
      
      if (response.status === 403) {
        customError = `🔑 GitHub PAT Scope Error (403): Your token is missing required permissions.\n` +
          `Solution: Go to https://github.com/settings/tokens, edit your token, and make sure the 'repo' and 'workflow' checkboxes are ticked!`;
      } else if (response.status === 404) {
        customError = `📂 Repository / Workflow Not Found (404): Ensure your code is pushed to https://github.com/${owner}/${repo} and .github/workflows/tesla_automation.yml exists.`;
      }

      return NextResponse.json(
        { error: customError },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Tesla Automation workflow triggered successfully via GitHub Actions!',
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
