import { useEffect, useRef, useState } from 'react';

const ALERT_POOL = [
  {
    severity: 'critical',
    device: 'sw-core-07',
    issue: 'Uplink latency spike detected',
    source: 'observium',
    status: 'open',
    since: 'just now',
  },
  {
    severity: 'warning',
    device: 'rfid-door-north-03',
    issue: 'Controller heartbeat delayed',
    source: 'observium',
    status: 'open',
    since: 'just now',
  },
  {
    severity: 'info',
    device: 'awx-cluster',
    issue: 'Playbook sync completed',
    source: 'awx',
    status: 'open',
    since: 'just now',
  },
];

export function useAlertSocket({ enabled = true, intervalMs = 12000 } = {}) {
  const [latestAlert, setLatestAlert] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const pointer = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setIsConnected(false);
      return undefined;
    }

    setIsConnected(true);

    const timer = setInterval(() => {
      const next = ALERT_POOL[pointer.current % ALERT_POOL.length];
      pointer.current += 1;

      setLatestAlert({
        ...next,
        id: `ws-alert-${Date.now()}-${pointer.current}`,
      });
    }, intervalMs);

    return () => {
      clearInterval(timer);
      setIsConnected(false);
    };
  }, [enabled, intervalMs]);

  return { latestAlert, isConnected };
}
