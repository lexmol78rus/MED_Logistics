type RetryTask = {
  id: string;
  label: string;
  run: () => Promise<void>;
  attempts: number;
};

const queue: RetryTask[] = [];
let processing = false;

export function enqueueRetry(label: string, run: () => Promise<void>): string {
  const id = `retry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  queue.push({ id, label, run, attempts: 0 });
  void drainQueue();
  return id;
}

export function getRetryQueueSize() {
  return queue.length;
}

async function drainQueue() {
  if (processing) return;
  processing = true;
  while (queue.length > 0) {
    const task = queue[0];
    task.attempts += 1;
    try {
      await task.run();
      queue.shift();
    } catch {
      if (task.attempts >= 3) {
        queue.shift();
      } else {
        await new Promise((r) => setTimeout(r, 1500 * task.attempts));
      }
    }
  }
  processing = false;
}
