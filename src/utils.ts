import { spinner } from '@reuters-graphics/clack';
import pLimit from 'p-limit';

export const sleep = (time: number) => new Promise((r) => setTimeout(r, time));

export const spinLoop = (startLabel: string, stopLabel = '✓') => {
  return async <T>(
    items: T[],
    promised: (item: T) => Promise<unknown>,
    minimumRuntime = process.env.VITEST ? 0 : 1500,
    maxConcurrents = 5
  ) => {
    const limit = pLimit(maxConcurrents);
    const s = spinner(minimumRuntime);
    s.start(startLabel);
    try {
      const results = await Promise.all(
        items.map((i) => limit(() => promised(i)))
      );
      await s.stop(stopLabel);
      return results;
    } catch (error) {
      await s.stop('Something went wrong.', 2);
      throw error;
    }
  };
};
