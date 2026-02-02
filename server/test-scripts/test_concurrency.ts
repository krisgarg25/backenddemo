import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runConcurrencyTest() {
  console.log('--- TEST: Worker Concurrency (Idempotency) ---');

  // 1. Setup Data directly in DB
  const user = await prisma.user.create({
    data: {
      username: `ConcurrencyTester_${Date.now()}`,
      villages: {
        create: { name: 'TestVillage' },
      },
    },
    include: { villages: true },
  });
  const villageId = user.villages[0].id;

  // 2. Create a "Past Due" Action (Pending)
  const action = await prisma.actionQueue.create({
    data: {
      villageId,
      type: 'CONCURRENCY_TEST',
      data: '{}',
      startTime: new Date(),
      endTime: new Date(Date.now() - 5000), // 5 seconds ago
      status: 'PENDING',
    },
  });
  console.log(`Created Pending Action ${action.id}`);

  // 3. Simulate 2 Workers trying to process SAME action
  console.log('Simulating 2 concurrent workers attempting to lock...');

  const worker1 = processActionSimulated(action.id, 'Worker 1');
  const worker2 = processActionSimulated(action.id, 'Worker 2');

  const results = await Promise.all([worker1, worker2]);

  const successes = results.filter((r) => r === true).length;
  const failures = results.filter((r) => r === false).length;

  console.log(`\nResults:`);
  console.log(`- Successes (Lock Acquired): ${successes}`);
  console.log(`- Failures (Lock Denied): ${failures}`);

  if (successes === 1 && failures === 1) {
    console.log('✅ PASS: Only one worker processed the action.');
  } else {
    console.log('❌ FAIL: Incorrect processing count.');
  }

  // Cleanup
  await prisma.actionQueue.deleteMany();
  await prisma.building.deleteMany();
  await prisma.resources.deleteMany();
  await prisma.village.deleteMany();
  await prisma.user.deleteMany();
}

async function processActionSimulated(
  actionId: number,
  workerName: string,
): Promise<boolean> {
  // Use the EXACT same logic as ActionWorkerService
  const updateResult = await prisma.actionQueue.updateMany({
    where: {
      id: actionId,
      status: 'PENDING', // Optimistic Lock
    },
    data: {
      status: 'PROCESSING',
    },
  });

  if (updateResult.count > 0) {
    console.log(`[${workerName}] ACQUIRED lock! Processing...`);
    return true;
  } else {
    console.log(`[${workerName}] Failed to acquire lock (already taken).`);
    return false;
  }
}

void runConcurrencyTest()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
