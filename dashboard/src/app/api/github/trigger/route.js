import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { owner, repo, pat } = await req.json();

    if (!owner || !repo || !pat) {
      return NextResponse.json(
        { error: 'Missing GitHub Owner, Repo, or Personal Access Token (PAT).' },
        { status: 400 }
      );
    }

    // Try repository_dispatch first
    const dispatchUrl = `https://api.github.com/repos/${owner}/${repo}/dispatches`;
    const response = await fetch(dispatchUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${pat}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event_type: 'trigger-tesla-automation',
        client_payload: { trigger_source: 'Vercel Control Center UI' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `GitHub API error (${response.status}): ${errorText}` },
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
