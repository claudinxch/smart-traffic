export type Signal = "green" | "yellow" | "red";

export type Direction = "north" | "south" | "east" | "west";

export type Phase =
  | "NS_GREEN"
  | "NS_YELLOW"
  | "EW_GREEN"
  | "EW_YELLOW"
  | "ALL_RED";

export type Scenario =
  | "cross"
  | "t_intersection"
  | "main_road_priority"
  | "heavy_traffic";

export type EventType =
  | "vehicle_arrived"
  | "vehicle_removed"
  | "pedestrian_request"
  | "pedestrian_cleared"
  | "phase_changed"
  | "scenario_changed"
  | "failover"
  | "server_promoted";

export interface TrafficLight {
  direction: Direction;
  signal: Signal;
  queue: number;
}

export interface IntersectionState {
  scenario: Scenario;
  phase: Phase;
  phase_elapsed: number;
  lights: TrafficLight[];
  pedestrian_active: boolean;
  pedestrian_direction: Direction | null;
  active_directions: Direction[];
  queues: Record<Direction, number>;
}

export interface TrafficEvent {
  id?: number;
  event_type: EventType;
  direction: Direction | null;
  payload: Record<string, unknown>;
  created_at?: string;
}

export interface SystemStatus {
  role: "primary" | "backup";
  is_active: boolean;
  primary_alive: boolean;
  failover_occurred: boolean;
  active_connections?: number;
  simulated_failure?: boolean;
  health_fail_count?: number;
  health_fail_threshold?: number;
}

export type WsMessageType = "state_update" | "event" | "system_status" | "failover";

export interface WsMessage {
  type: WsMessageType;
  data: IntersectionState | TrafficEvent | SystemStatus | Record<string, unknown>;
}

export interface NodeInfo {
  url: string;
  wsUrl: string;
  role: "primary" | "backup";
  connected: boolean;
}