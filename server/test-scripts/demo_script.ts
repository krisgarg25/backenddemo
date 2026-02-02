import axios from 'axios';

const BASE_URL = 'http://localhost:3000/game';

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface Resources {
  wood: number;
  clay: number;
  iron: number;
  crop: number;
}

interface Building {
  type: string;
  level: number;
}

interface Village {
  id: number;
  resources: Resources;
  buildings: Building[];
}

interface User {
  villages: Village[];
}

interface SetupResponse {
  user: User;
}

interface BuildResponse {
  action: {
    endTime: string;
  };
}

async function runDemo() {
  try {
    console.log('--- MMORTS Backend Demo Simulation ---');

    // 1. Setup
    console.log('\n[1] Setting up new world...');
    const setupRes = await axios.post<SetupResponse>(`${BASE_URL}/setup`);
    const villageId = setupRes.data.user.villages[0].id;
    console.log(`Setup Complete. Created Village ID: ${villageId}`);

    // 2. Resource Ticking
    console.log('\n[2] Testing Resource Ticking...');
    const initialRes = await axios.get<Village>(
      `${BASE_URL}/village/${villageId}`,
    );
    console.log('Initial Resources:', initialRes.data.resources);

    console.log('Waiting 3 seconds for production...');
    await sleep(3000);

    const tickedRes = await axios.get<Village>(
      `${BASE_URL}/village/${villageId}`,
    );
    console.log('New Resources:', tickedRes.data.resources);

    // Check increase (roughly 30 resources)
    const diff = tickedRes.data.resources.wood - initialRes.data.resources.wood;
    console.log(`Resource Increase: ~${diff} (Expected ~30)`);

    // 3. Build Queue
    console.log('\n[3] Testing Atomic Build Queue...');
    try {
      console.log('Requesting Upgrade: Farm (Cost 50 each)');
      const buildRes = await axios.post<BuildResponse>(
        `${BASE_URL}/village/${villageId}/build`,
        {
          type: 'Farm',
        },
      );
      console.log('Build Started:', buildRes.data);

      console.log('Checking Resources immediately (should be deducted)...');
      const deductedRes = await axios.get<Village>(
        `${BASE_URL}/village/${villageId}`,
      );
      console.log('Current Resources:', deductedRes.data.resources);

      const delay =
        new Date(buildRes.data.action.endTime).getTime() - new Date().getTime();
      console.log(`Waiting ${delay / 1000}s for construction...`);
      await sleep(delay + 2000); // Wait a bit extra for worker polling

      console.log('Checking Village Buildings...');
      const finalRes = await axios.get<Village>(
        `${BASE_URL}/village/${villageId}`,
      );
      console.log('Buildings:', finalRes.data.buildings);

      const farm = finalRes.data.buildings.find((b) => b.type === 'Farm');
      if (farm && farm.level >= 1) {
        console.log('SUCCESS: Farm built successfully!');
      } else {
        console.log('FAILURE: Farm not found or level incorrect.');
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        console.error('Build Error:', error.response.data);
      } else if (error instanceof Error) {
        console.error('Build Error:', error.message);
      } else {
        console.error('Build Error:', String(error));
      }
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Demo Failed:', error.message);
    } else {
      console.error('Demo Failed:', String(error));
    }
  }
}

void runDemo().catch((err) => console.error(err));
