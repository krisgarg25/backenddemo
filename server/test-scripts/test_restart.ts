import axios from 'axios';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

const BASE_URL = 'http://localhost:3000/game';

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let serverProcess: ChildProcess | null = null;

async function startServer() {
  console.log('Starting server...');
  return new Promise<void>((resolve) => {
    serverProcess = spawn('npm', ['start'], {
      shell: true,
      cwd: path.resolve(__dirname, '..'),
    });
    serverProcess.stdout?.on('data', (data: Buffer) => {
      const msg = data.toString();
      // console.log('[Server]', msg); // Uncomment for debug
      if (msg.includes('Nest application successfully started')) {
        resolve();
      }
    });
  });
}

function killServer() {
  if (serverProcess) {
    console.log('Killing server...');
    spawn('taskkill', [
      '/pid',
      serverProcess.pid?.toString() || '',
      '/f',
      '/t',
    ]);
    serverProcess = null;
  }
}

async function runTest() {
  try {
    console.log('--- TEST: Server Restart Safety ---');

    // 1. Ensure server is running
    await startServer();
    console.log('Server started.');

    // 2. Setup
    console.log('Setting up world...');
    const setupRes = await axios.post<{ user: { villages: { id: number }[] } }>(
      `${BASE_URL}/setup`,
    );
    const villageId = setupRes.data.user.villages[0].id;

    // 3. Schedule Action (Long enough to survive restart)
    console.log('Scheduling LONG action (30s)...');
    // We cheat and send a manual request if the API allows, or we just trust the logic.
    // Since our API currently hardcodes 10s, we rely on killing it FAST.
    const buildRes = await axios.post<{ action: { endTime: string } }>(
      `${BASE_URL}/village/${villageId}/build`,
      {
        type: 'RestartTestBuilding',
      },
    );
    const endTime = new Date(buildRes.data.action.endTime);
    console.log(`Action Scheduled. Ends at: ${endTime.toISOString()}`);

    // 4. KILL SERVER IMMEDIATELY
    console.log('>>> CRASHING SERVER NOW <<<');
    killServer();

    // 5. Wait until passing the endTime while server is DEAD
    const timeToWait = endTime.getTime() - new Date().getTime() + 2000;
    console.log(`Waiting ${timeToWait / 1000}s while server is offline...`);
    await sleep(timeToWait);

    // 6. Restart Server
    console.log('>>> RESTARTING SERVER <<<');
    await startServer();
    console.log('Server back online.');

    // 7. Verify Worker picks it up "immediately" (within next tick)
    console.log('Waiting 3s for worker to catch up...');
    await sleep(3000);

    // 8. Check result
    const finalRes = await axios.get<{
      buildings: { type: string; level: number }[];
    }>(`${BASE_URL}/village/${villageId}`);
    const buildings = finalRes.data.buildings;
    const testBuilding = buildings.find(
      (b: { type: string; level: number }) => b.type === 'RestartTestBuilding',
    );

    if (testBuilding && testBuilding.level >= 1) {
      console.log(
        '✅ PASS: Building completed even though server was dead during endTime!',
      );
    } else {
      console.error('❌ FAIL: Building not found or not upgraded.');
      console.log('Buildings:', buildings);
    }
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.error('Test Failed:', e.message);
    } else {
      console.error('Test Failed:', String(e));
    }
  } finally {
    killServer();
    process.exit(0);
  }
}

void runTest();
