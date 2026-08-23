import { Queue } from 'bullmq';
const queue = new Queue('evaluations', { connection: { host: '127.0.0.1', port: 6379 } });
async function check() {
  const active = await queue.getActive();
  console.log('Active jobs:', active.map(j => ({id: j.id, data: j.data})));
  const failed = await queue.getFailed();
  console.log('Failed jobs:', failed.map(j => ({id: j.id, reason: j.failedReason})));
  process.exit(0);
}
check();
