import { cn } from "@/utils/cn";
import { TrafficLight } from "./traffic-light";
import { Badge } from "./ui/badge";
import type { IntersectionState, Direction } from "@/types/traffic";

interface IntersectionViewProps {
  state: IntersectionState;
}

const PHASE_LABEL: Record<string, string> = {
  NS_GREEN:  "N/S Verde",
  NS_YELLOW: "N/S Amarelo",
  EW_GREEN:  "L/O Verde",
  EW_YELLOW: "L/O Amarelo",
  ALL_RED:   "Tudo Vermelho",
};

const PHASE_BADGE: Record<string, "green" | "yellow" | "red"> = {
  NS_GREEN: "green", EW_GREEN: "green",
  NS_YELLOW: "yellow", EW_YELLOW: "yellow",
  ALL_RED: "red",
};

const SCENARIO_LABEL: Record<string, string> = {
  cross:               "Cruzamento",
  t_intersection:      "Entroncamento",
  main_road_priority:  "Via Principal",
  heavy_traffic:       "Tráfego Intenso",
};

function lightsMap(state: IntersectionState): Record<string, { signal: "green" | "yellow" | "red"; queue: number }> {
  return Object.fromEntries(state.lights.map((l) => [l.direction, { signal: l.signal, queue: l.queue }]));
}

export function IntersectionView({ state }: IntersectionViewProps) {
  const lights = lightsMap(state);
  const hasNS = ["north", "south"].some((d) => d in lights);
  const hasEW = ["east", "west"].some((d) => d in lights);
  const elapsed = Math.floor(state.phase_elapsed);

  function light(dir: Direction) {
    const l = lights[dir];
    if (!l) return null;
    return (
      <TrafficLight
        key={dir}
        direction={dir}
        signal={l.signal}
        queue={l.queue}
        pedestrianActive={state.pedestrian_active && state.pedestrian_direction === dir}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-600">{SCENARIO_LABEL[state.scenario]}</span>
        <div className="flex items-center gap-2">
          <Badge variant={PHASE_BADGE[state.phase] ?? "default"}>
            {PHASE_LABEL[state.phase] ?? state.phase}
          </Badge>
          <span className="text-xs tabular-nums text-zinc-400">{elapsed}s</span>
        </div>
      </div>

      <div className="relative flex items-center justify-center select-none" style={{ minHeight: 280 }}>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-48 h-48">
            {hasNS && hasEW && (
              <>
                <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-12 bg-zinc-200 rounded-full opacity-60" />
                <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-12 bg-zinc-200 rounded-full opacity-60" />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-zinc-300 opacity-80 rounded-sm" />
              </>
            )}
            {hasNS && !hasEW && (
              <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-12 bg-zinc-200 rounded-full opacity-60" />
            )}
          </div>
        </div>

        <div className="relative grid grid-rows-3 grid-cols-3 gap-2 place-items-center w-64 h-64">
          <div />
          <div className="flex justify-center">{light("north")}</div>
          <div />
          <div className="flex justify-center">{light("west")}</div>
          <div className={cn(
            "w-12 h-12 rounded-lg border-2 flex items-center justify-center",
            state.pedestrian_active ? "border-blue-400 bg-blue-50" : "border-zinc-300 bg-zinc-100"
          )}>
            {state.pedestrian_active
              ? <span className="text-blue-500 text-lg">🚶</span>
              : <span className="text-zinc-400 text-xs font-mono">⊕</span>}
          </div>
          <div className="flex justify-center">{light("east")}</div>
          <div />
          <div className="flex justify-center">{light("south")}</div>
          <div />
        </div>
      </div>

      {state.pedestrian_active && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200">
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-xs text-blue-700">
            Travessia de pedestre ativa
            {state.pedestrian_direction ? ` — lado ${state.pedestrian_direction === "north" ? "norte" : state.pedestrian_direction === "south" ? "sul" : state.pedestrian_direction === "east" ? "leste" : "oeste"}` : ""}
          </span>
        </div>
      )}
    </div>
  );
}