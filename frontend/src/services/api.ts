import type { Direction, EventType, IntersectionState, Scenario, SystemStatus, TrafficEvent } from "@/types/traffic";

const PRIMARY = "http://localhost:8000";
const BACKUP = "http://localhost:8001";

function activeBase(): string {
  return PRIMARY;
}

async function request<T>(base: string, path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function getState(base = activeBase()): Promise<IntersectionState> {
  return request<IntersectionState>(base, "/traffic/state");
}

export async function getEvents(limit = 50, base = activeBase()): Promise<TrafficEvent[]> {
  return request<TrafficEvent[]>(base, `/traffic/events?limit=${limit}`);
}

export async function postEvent(
  event_type: EventType,
  direction?: Direction,
  base = activeBase()
): Promise<void> {
  await request(base, "/traffic/events", {
    method: "POST",
    body: JSON.stringify({ event_type, direction: direction ?? null, payload: {} }),
  });
}

export async function changeScenario(scenario: Scenario, base = activeBase()): Promise<void> {
  await request(base, "/traffic/scenario", {
    method: "POST",
    body: JSON.stringify({ scenario }),
  });
}

export async function getStatus(base: string): Promise<SystemStatus & { active_connections: number }> {
  return request(base, "/status");
}

export async function simulateFailure(): Promise<void> {
  await request(PRIMARY, "/simulate-failure", { method: "POST" });
}

export async function restorePrimary(): Promise<void> {
  await request(PRIMARY, "/restore", { method: "POST" });
}

export { PRIMARY, BACKUP };