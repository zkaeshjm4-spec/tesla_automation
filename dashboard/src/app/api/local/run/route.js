import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST() {
  try {
    const projectRoot = path.resolve(process.cwd(), '..');
    const pythonScript = path.join(projectRoot, 'tesla_fleet_automation.py');

    console.log('[Local Runner] Launching visual local automation:', pythonScript);

    // Spawn Python script attached to Chrome CDP port 9222
    const child = spawn('python', [pythonScript], {
      cwd: projectRoot,
      shell: true,
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    });

    child.stdout.on('data', (data) => {
      console.log(`[Visual Automation]: ${data.toString().trim()}`);
    });

    child.stderr.on('data', (data) => {
      console.error(`[Visual Automation Error]: ${data.toString().trim()}`);
    });

    return NextResponse.json({
      success: true,
      message: 'Visual local automation launched! Attached to Chrome (Port 9222).',
      pid: child.pid,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
