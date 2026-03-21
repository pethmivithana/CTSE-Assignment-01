const { sendHtmlEmail } = require('./emailService');

const MAX_ATTEMPTS = 4;
const queue = [];
let processing = false;

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runJob(job) {
  if (job.kind === 'email') {
    await sendHtmlEmail(job.to, job.subject, job.html);
  }
}

async function pump() {
  if (processing) return;
  processing = true;
  while (queue.length) {
    const job = queue.shift();
    try {
      await runJob(job);
    } catch (err) {
      console.error('[queue] job failed:', err.message);
      job.attempts = (job.attempts || 0) + 1;
      if (job.attempts < MAX_ATTEMPTS) {
        const backoff = Math.min(30000, 1000 * 2 ** job.attempts);
        setTimeout(() => queue.push(job), backoff);
      } else {
        console.error('[queue] job dropped after retries', job.kind);
      }
    }
    await delay(0);
  }
  processing = false;
}

exports.enqueueEmail = (payload) => {
  queue.push({ kind: 'email', attempts: 0, ...payload });
  setImmediate(pump);
};

exports.getQueueLength = () => queue.length;
