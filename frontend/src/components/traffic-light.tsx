import { cn } from "@/utils/cn";
import type { Signal, Direction } from "@/types/traffic";

interface TrafficLightProps {
  direction: Direction;
  signal: Signal;
  queue: number;
  pedestrianActive?: boolean;
}

const DIRECTION_LABEL: Record<Direction, string> = {
  north: "N",
  south: "S",
  east: "L",
  west: "O",
};

const SIGNAL_COLORS: Record<Signal, { active: string; glow: string; dim: string }> = {
  green:  { active: "bg-green-500",  glow: "shadow-[0_0_16px_4px_rgba(34,197,94,0.4)]",  dim: "bg-green-100"  },
  yellow: { active: "bg-yellow-400", glow: "shadow-[0_0_16px_4px_rgba(234,179,8,0.4)]",  dim: "bg-yellow-200" },
  red:    { active: "bg-red-500",    glow: "shadow-[0_0_16px_4px_rgba(239,68,68,0.4)]",  dim: "bg-red-100"    },
};

function Light({ color, active }: { color: Signal; active: boolean }) {
  const cfg = SIGNAL_COLORS[color];
  return (
    <div className={cn("w-7 h-7 rounded-full transition-all duration-300", active ? cn(cfg.active, cfg.glow) : cfg.dim)} />
  );
}

export function TrafficLight({ direction, signal, queue, pedestrianActive }: TrafficLightProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex flex-col items-center gap-1.5 bg-zinc-800 border border-zinc-700 rounded-2xl px-3 py-3 w-16">
        <Light color="red" active={signal === "red"} />
        <Light color="yellow" active={signal === "yellow"} />
        <Light color="green" active={signal === "green"} />
        {pedestrianActive && (
          <div className="absolute -right-1 -top-1 w-3 h-3 rounded-full bg-blue-400 shadow-[0_0_8px_2px_rgba(96,165,250,0.6)] animate-pulse" />
        )}
      </div>
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
          {DIRECTION_LABEL[direction]}
        </span>
        <div className={cn(
          "flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold transition-colors",
          queue === 0 ? "bg-zinc-100 text-zinc-400" : queue >= 8 ? "bg-red-100 text-red-700" : queue >= 4 ? "bg-yellow-100 text-yellow-700" : "bg-zinc-100 text-zinc-700"
        )}>
          {queue}
        </div>
      </div>
    </div>
  );
}