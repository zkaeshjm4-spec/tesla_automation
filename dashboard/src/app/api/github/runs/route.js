import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const owner = searchParams.get('owner') || process.env.GITHUB_OWNER || 'zkaeshjm4-spec';
    const repo = searchParams.get('repo') || process.env.GITHUB_REPO || 'tesla_automation';
    const pat = searchParams.get('pat') || process.env.GITHUB_PAT;

    if (!pat) {
      return NextResponse.json(
        { error: 'Missing GitHub Personal Access Token. Set GITHUB_PAT in Vercel environment variables or enter it in settings.' },
        { status: 400 }
      );
    }

    const runsUrl = `https://api.github.com/repos/${owner}/${repo}/actions/runs?per_page=10`;
    const response = await fetch(runsUrl, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${pat}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
      next: { revalidate: 10 },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `GitHub API error (${response.status}): ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const runs = (data.workflow_runs || []).map((run) => ({
      id: run.id,
      name: run.name,
      status: run.status,
      conclusion: run.conclusion,
      event: run.event,
      html_url: run.html_url,
      created_at: run.created_at,
      updated_at: run.updated_at,
      run_number: run.run_number,
      actor: run.actor?.login || 'Automated',
    }));

    return NextResponse.json({ runs, total: data.total_count, owner, repo });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
