import { useEffect, useRef } from "react";
import { Car, PersonStanding, ArrowLeftRight, AlertTriangle, RefreshCw, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import type { TrafficEvent, EventType } from "@/types/traffic";
import { cn } from "@/utils/cn";

interface EventLogProps {
  events: TrafficEvent[];
}

const EVENT_META: Record<EventType, { label: string; icon: React.ReactNode; badge: "green" | "yellow" | "red" | "indigo" | "default" }> = {
  vehicle_arrived:    { label: "Veículo chegou",       icon: <Car className="w-3 h-3" />,            badge: "default" },
  vehicle_removed:    { label: "Veículo saiu",         icon: <Car className="w-3 h-3" />,            badge: "default" },
  pedestrian_request: { label: "Pedestre solicitou",   icon: <PersonStanding className="w-3 h-3" />, badge: "indigo"  },
  pedestrian_cleared: { label: "Travessia liberada",   icon: <PersonStanding className="w-3 h-3" />, badge: "default" },
  phase_changed:      { label: "Fase alterada",        icon: <ArrowLeftRight className="w-3 h-3" />, badge: "yellow"  },
  scenario_changed:   { label: "Cenário alterado",     icon: <RefreshCw className="w-3 h-3" />,      badge: "indigo"  },
  failover:           { label: "Failover",             icon: <AlertTriangle className="w-3 h-3" />,  badge: "red"     },
  server_promoted:    { label: "Servidor promovido",   icon: <Activity className="w-3 h-3" />,       badge: "yellow"  },
};

const DIRECTION_PT: Record<string, string> = {
  north: "norte", south: "sul", east: "leste", west: "oeste",
};

const PHASE_PT: Record<string, string> = {
  NS_GREEN: "N/S Verde", NS_YELLOW: "N/S Amarelo",
  EW_GREEN: "L/O Verde", EW_YELLOW: "L/O Amarelo",
  ALL_RED: "Tudo Vermelho",
};

function formatTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

function eventDescription(event: TrafficEvent): string {
  const parts: string[] = [];
  if (event.direction) parts.push(DIRECTION_PT[event.direction] ?? event.direction);
  if (event.payload?.phase) parts.push(PHASE_PT[String(event.payload.phase)] ?? String(event.payload.phase));
  if (event.payload?.scenario) parts.push(String(event.payload.scenario));
  return parts.join(" → ");
}

function EventRow({ event, index }: { event: TrafficEvent; index: number }) {
  const meta = EVENT_META[event.event_type] ?? { label: event.event_type, icon: <Activity className="w-3 h-3" />, badge: "default" as const };
  return (
    <div className={cn(
      "flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors",
      index === 0 && "bg-zinc-50",
      index > 0 && "hover:bg-zinc-50"
    )}>
      <div className="mt-0.5 text-zinc-400 shrink-0">{meta.icon}</div>
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Badge variant={meta.badge} className="shrink-0">{meta.label}</Badge>
          {eventDescription(event) && (
            <span className="text-xs text-zinc-500 truncate">{eventDescription(event)}</span>
          )}
        </div>
        {event.created_at && (
          <span className="text-xs text-zinc-400 tabular-nums">{formatTime(event.created_at)}</span>
        )}
      </div>
    </div>
  );
}

export function EventLog({ events }: EventLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  });

  useEffect(() => {
    if (isAtBottomRef.current) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Log de Eventos</CardTitle>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-zinc-400">Ao vivo</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <div ref={containerRef} className="h-full overflow-y-auto px-2 pb-3 flex flex-col gap-0.5" style={{ maxHeight: 360 }}>
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <Activity className="w-6 h-6 text-zinc-300" />
              <span className="text-xs text-zinc-400">Nenhum evento ainda. Inicie a simulação.</span>
            </div>
          ) : (
            events.map((event, i) => <EventRow key={`${event.id ?? i}-${i}`} event={event} index={i} />)
          )}
          <div ref={bottomRef} />
        </div>
      </CardContent>
    </Card>
  );
}