import { useState } from "react";
import { Car, PersonStanding, Minus, RotateCcw } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { postEvent } from "@/services/api";
import type { Direction, IntersectionState } from "@/types/traffic";

interface ControlPanelProps {
  state: IntersectionState;
  activeBase?: string;
}

const DIRECTION_LABEL: Record<Direction, string> = {
  north: "Norte",
  south: "Sul",
  east: "Leste",
  west: "Oeste",
};

export function ControlPanel({ state, activeBase }: ControlPanelProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const activeDirections = state.lights.map((l) => l.direction as Direction);

  async function handle(key: string, fn: () => Promise<void>) {
    setLoading(key);
    try { await fn(); } finally { setLoading(null); }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Simulação de Veículos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-1">
            {activeDirections.map((dir) => (
              <div key={dir} className="flex items-center justify-between py-1.5">
                <span className="text-xs text-zinc-500 w-14">{DIRECTION_LABEL[dir]}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs tabular-nums text-zinc-400 w-6 text-right">
                    {state.queues[dir] ?? 0}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={loading !== null}
                    onClick={() => handle(`arrive-${dir}`, () => postEvent("vehicle_arrived", dir, activeBase))}
                  >
                    <Car className="w-3 h-3" />
                    +1
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={loading !== null || (state.queues[dir] ?? 0) === 0}
                    onClick={() => handle(`remove-${dir}`, () => postEvent("vehicle_removed", dir, activeBase))}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pedestre</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-1">
            {state.pedestrian_active ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={loading !== null}
                onClick={() => handle("ped-clear", () => postEvent("pedestrian_cleared", undefined, activeBase))}
              >
                <RotateCcw className="w-3 h-3" />
                Liberar Travessia
              </Button>
            ) : (
              activeDirections.map((dir) => (
                <Button
                  key={dir}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  disabled={loading !== null}
                  onClick={() => handle(`ped-${dir}`, () => postEvent("pedestrian_request", dir, activeBase))}
                >
                  <PersonStanding className="w-3 h-3" />
                  Travessia {DIRECTION_LABEL[dir]}
                </Button>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}