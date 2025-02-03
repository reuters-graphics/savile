import { spinner } from '@clack/prompts';
import pLimit from 'p-limit';

export const sleep = (time: number) => new Promise((r) => setTimeout(r, time));

export const spinLoop = (startLabel: string, stopLabel = '✓') => {
  return async <T>(
    items: T[],
    promised: (item: T) => Promise<unknown>,
    mininmumRuntime = process.env.VITEST ? 0 : 1500,
    maxConcurrents = 5
  ) => {
    const limit = pLimit(maxConcurrents);
    const s = spinner();
    s.start(startLabel);
    const promises = items.map((i) => limit(() => promised(i)));
    const results = await Promise.all([...promises, sleep(mininmumRuntime)]);
    s.stop(stopLabel);
    return results.slice(0, -1);
  };
};
