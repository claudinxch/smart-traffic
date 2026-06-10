import { cn } from "@/utils/cn";
import type { Scenario } from "@/types/traffic";

interface ScenarioSelectorProps {
  current: Scenario;
  onChange: (scenario: Scenario) => void;
  disabled?: boolean;
}

const SCENARIOS: { value: Scenario; label: string; description: string; tag: string }[] = [
  { value: "cross",              label: "Cruzamento",          description: "Interseção urbana padrão com vias de prioridade igual.",      tag: "Balanceado"   },
  { value: "t_intersection",     label: "Entroncamento",       description: "Junção em T — via sul ausente.",                              tag: "3 Vias"       },
  { value: "main_road_priority", label: "Via Principal",       description: "Eixo N/S possui tempo de verde estendido.",                   tag: "Prioridade"   },
  { value: "heavy_traffic",      label: "Tráfego Intenso",     description: "Norte e sul pré-carregados com alto volume de veículos.",     tag: "Teste de carga" },
];

export function ScenarioSelector({ current, onChange, disabled }: ScenarioSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {SCENARIOS.map((s) => {
        const active = current === s.value;
        return (
          <button
            key={s.value}
            disabled={disabled}
            onClick={() => onChange(s.value)}
            className={cn(
              "flex flex-col gap-1 p-3 rounded-xl border text-left transition-colors cursor-pointer",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
              "disabled:pointer-events-none disabled:opacity-40",
              active
                ? "border-indigo-400 bg-indigo-50"
                : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
            )}
          >
            <div className="flex items-center justify-between">
              <span className={cn("text-xs font-semibold", active ? "text-indigo-700" : "text-zinc-700")}>
                {s.label}
              </span>
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded font-medium",
                active ? "bg-indigo-100 text-indigo-600" : "bg-zinc-100 text-zinc-500"
              )}>
                {s.tag}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">{s.description}</p>
          </button>
        );
      })}
    </div>
  );
}