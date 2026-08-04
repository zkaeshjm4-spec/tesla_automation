import { NextResponse } from 'next/server';
import sealedBox from 'tweetnacl-sealedbox-js';

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const owner = body.owner || process.env.GITHUB_OWNER || 'zkaeshjm4-spec';
    const repo = body.repo || process.env.GITHUB_REPO || 'tesla_automation';
    const pat = body.pat || process.env.GITHUB_PAT;
    const secretValue = body.secretValue;

    if (!secretValue) {
      return NextResponse.json(
        { error: 'Missing secretValue.' },
        { status: 400 }
      );
    }

    if (!pat) {
      return NextResponse.json(
        { error: 'Missing GitHub Personal Access Token. Set GITHUB_PAT in Vercel environment variables or enter it in settings.' },
        { status: 400 }
      );
    }

    // 1. Get Public Key from GitHub
    const pkUrl = `https://api.github.com/repos/${owner}/${repo}/actions/secrets/public-key`;
    const pkResponse = await fetch(pkUrl, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${pat}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!pkResponse.ok) {
      const errorText = await pkResponse.text();
      return NextResponse.json(
        { error: `Failed to fetch public key (${pkResponse.status}): ${errorText}` },
        { status: pkResponse.status }
      );
    }

    const { key_id, key } = await pkResponse.json();

    // 2. Encrypt secretValue using sealedBox
    const messageBytes = Buffer.from(secretValue);
    const keyBytes = Buffer.from(key, 'base64');
    const encryptedBytes = sealedBox.seal(messageBytes, keyBytes);
    const encryptedBase64 = Buffer.from(encryptedBytes).toString('base64');

    // 3. Save secret to GitHub Secrets (TESLA_STORAGE_STATE)
    const secretUrl = `https://api.github.com/repos/${owner}/${repo}/actions/secrets/TESLA_STORAGE_STATE`;
    const putResponse = await fetch(secretUrl, {
      method: 'PUT',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${pat}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        encrypted_value: encryptedBase64,
        key_id: key_id,
      }),
    });

    if (!putResponse.ok && putResponse.status !== 201 && putResponse.status !== 204) {
      const errorText = await putResponse.text();
      return NextResponse.json(
        { error: `Failed to update secret (${putResponse.status}): ${errorText}` },
        { status: putResponse.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Tesla Session state (TESLA_STORAGE_STATE) successfully updated in GitHub Repository Secrets!',
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
