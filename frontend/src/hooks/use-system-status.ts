import { useEffect, useState } from "react";
import { getStatus, PRIMARY, BACKUP } from "@/services/api";
import type { SystemStatus } from "@/types/traffic";

interface NodeStatus extends SystemStatus {
  active_connections: number;
  reachable: boolean;
}

interface SystemStatusState {
  primary: NodeStatus | null;
  backup: NodeStatus | null;
}

const POLL_INTERVAL = 5000;

export function useSystemStatus() {
  const [status, setStatus] = useState<SystemStatusState>({
    primary: null,
    backup: null,
  });

  useEffect(() => {
    async function poll() {
      const [primary, backup] = await Promise.allSettled([
        getStatus(PRIMARY),
        getStatus(BACKUP),
      ]);

      setStatus({
        primary:
          primary.status === "fulfilled"
            ? { ...primary.value, reachable: true }
            : null,
        backup:
          backup.status === "fulfilled"
            ? { ...backup.value, reachable: true }
            : null,
      });
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return status;
}