import { useEffect, useRef, useState } from 'react';

const TASK_POOL = [
  { actor: 'User-01', action: 'created VM request', target: 'vm-soc-analytics-09', status: 'running', time: 'just now' },
  { actor: 'User-02', action: 'granted RFID access', target: 'Door SOC Main Door', status: 'completed', time: 'just now' },
  { actor: 'User-03', action: 'acknowledged alert', target: 'sw-core-07 latency', status: 'completed', time: 'just now' },
];

export function useTaskSocket({ enabled = true, intervalMs = 15000 } = {}) {
  const [latestTask, setLatestTask] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const pointer = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setIsConnected(false);
      return undefined;
    }

    setIsConnected(true);

    const timer = setInterval(() => {
      const next = TASK_POOL[pointer.current % TASK_POOL.length];
      pointer.current += 1;

      setLatestTask({
        ...next,
        id: `ws-task-${Date.now()}-${pointer.current}`,
      });
    }, intervalMs);

    return () => {
      clearInterval(timer);
      setIsConnected(false);
    };
  }, [enabled, intervalMs]);

  return { latestTask, isConnected };
}
