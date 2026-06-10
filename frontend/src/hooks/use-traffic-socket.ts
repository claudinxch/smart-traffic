import { useEffect, useRef, useState, useCallback } from "react";
import type { IntersectionState, SystemStatus, TrafficEvent, WsMessage } from "@/types/traffic";
import { PRIMARY, BACKUP } from "@/services/api";

const WS_PRIMARY = PRIMARY.replace("http", "ws") + "/ws";
const WS_BACKUP = BACKUP.replace("http", "ws") + "/ws";

const RECONNECT_DELAY = 3000;

export interface TrafficSocketState {
  intersection: IntersectionState | null;
  systemStatus: SystemStatus | null;
  backupStatus: SystemStatus | null;
  events: TrafficEvent[];
  activeNode: "primary" | "backup";
  primaryConnected: boolean;
  backupConnected: boolean;
  failoverActive: boolean;
}

export function useTrafficSocket() {
  const [state, setState] = useState<TrafficSocketState>({
    intersection: null,
    systemStatus: null,
    backupStatus: null,
    events: [],
    activeNode: "primary",
    primaryConnected: false,
    backupConnected: false,
    failoverActive: false,
  });

  const primaryWs = useRef<WebSocket | null>(null);
  const backupWs = useRef<WebSocket | null>(null);
  const primaryReconnect = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backupReconnect = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeNodeRef = useRef<"primary" | "backup">("primary");

  const pushEvent = useCallback((event: TrafficEvent) => {
    setState((prev) => ({
      ...prev,
      events: [event, ...prev.events].slice(0, 100),
    }));
  }, []);

  const connectPrimary = useCallback(() => {
    if (primaryWs.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_PRIMARY);
    primaryWs.current = ws;

    ws.onopen = () => {
      setState((prev) => ({ ...prev, primaryConnected: true }));
    };

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data) as WsMessage;
      if (activeNodeRef.current !== "primary") return;

      setState((prev) => applyMessage(prev, msg, "primary"));
      if (msg.type === "event") {
        pushEvent(msg.data as TrafficEvent);
      }
    };

    ws.onclose = () => {
      setState((prev) => ({ ...prev, primaryConnected: false }));
      primaryReconnect.current = setTimeout(connectPrimary, RECONNECT_DELAY);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [pushEvent]);

  const connectBackup = useCallback(() => {
    if (backupWs.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_BACKUP);
    backupWs.current = ws;

    ws.onopen = () => {
      setState((prev) => ({ ...prev, backupConnected: true }));
    };

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data) as WsMessage;

      if (msg.type === "system_status") {
        const status = msg.data as SystemStatus & {
          failover?: boolean;
          health_fail_count?: number;
        };

        setState((prev) => {
          const next = { ...prev, backupStatus: status };

          if (status.failover && !prev.failoverActive) {
            activeNodeRef.current = "backup";
            next.activeNode = "backup";
            next.failoverActive = true;
          }

          return next;
        });
      }

      if (activeNodeRef.current !== "backup") return;

      setState((prev) => applyMessage(prev, msg, "backup"));
      if (msg.type === "event") {
        pushEvent(msg.data as TrafficEvent);
      }
    };

    ws.onclose = () => {
      setState((prev) => ({ ...prev, backupConnected: false }));
      backupReconnect.current = setTimeout(connectBackup, RECONNECT_DELAY);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [pushEvent]);

  useEffect(() => {
    connectPrimary();
    connectBackup();

    return () => {
      if (primaryReconnect.current) clearTimeout(primaryReconnect.current);
      if (backupReconnect.current) clearTimeout(backupReconnect.current);
      primaryWs.current?.close();
      backupWs.current?.close();
    };
  }, [connectPrimary, connectBackup]);

  const resetFailover = useCallback(() => {
    activeNodeRef.current = "primary";
    setState((prev) => ({
      ...prev,
      activeNode: "primary",
      failoverActive: false,
    }));
  }, []);

  return { ...state, resetFailover };
}

function applyMessage(
  prev: TrafficSocketState,
  msg: WsMessage,
  _node: "primary" | "backup"
): TrafficSocketState {
  switch (msg.type) {
    case "state_update":
      return { ...prev, intersection: msg.data as IntersectionState };
    case "system_status":
      return { ...prev, systemStatus: msg.data as SystemStatus };
    default:
      return prev;
  }
}