import { useState } from "react";
import { useTrafficSocket } from "@/hooks/use-traffic-socket";
import { useSystemStatus } from "@/hooks/use-system-status";
import { SystemStatusBar } from "@/components/system-status-bar";
import { IntersectionView } from "@/components/intersection-view";
import { ControlPanel } from "@/components/control-panel";
import { EventLog } from "@/components/event-log";
import { ScenarioSelector } from "@/components/scenario-selector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { changeScenario, PRIMARY, BACKUP } from "@/services/api";
import type { Scenario } from "@/types/traffic";
import { Activity, Timer, Car, Users } from "lucide-react";
function StatCard({ label, value, icon, sub }: { label: string; value: string | number; icon: React.ReactNode; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-zinc-500">{label}</span>
            <span className="text-2xl font-bold text-zinc-800 tabular-nums leading-none">{value}</span>
            {sub && <span className="text-xs text-zinc-400">{sub}</span>}
          </div>
          <div className="text-zinc-300">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}
 
export default function Dashboard() {
  const socket = useTrafficSocket();
  const nodeStatus = useSystemStatus();
  const [scenarioLoading, setScenarioLoading] = useState(false);
 
  const { intersection, events, activeNode, failoverActive, primaryConnected, backupConnected, resetFailover } = socket;
  const activeBase = activeNode === "primary" ? PRIMARY : BACKUP;
 
  const totalVehicles = intersection ? Object.values(intersection.queues).reduce((a, b) => a + b, 0) : 0;
  const maxQueue = intersection ? Math.max(...Object.values(intersection.queues), 0) : 0;
 
  const phaseLabel: Record<string, string> = {
    NS_GREEN: "N/S Verde",
    NS_YELLOW: "N/S Amarelo",
    EW_GREEN: "L/O Verde",
    EW_YELLOW: "L/O Amarelo",
    ALL_RED: "Tudo Vermelho",
  };
 
  async function handleScenarioChange(scenario: Scenario) {
    setScenarioLoading(true);
    try { await changeScenario(scenario, activeBase); }
    finally { setScenarioLoading(false); }
  }
 
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <SystemStatusBar
        primaryStatus={nodeStatus.primary}
        backupStatus={nodeStatus.backup}
        activeNode={activeNode}
        failoverActive={failoverActive}
        primaryConnected={primaryConnected}
        backupConnected={backupConnected}
        onRestore={resetFailover}
      />
 
      <div className="flex-1 flex flex-col gap-6 px-6 py-6 max-w-screen-xl mx-auto w-full">
        <div className="grid grid-cols-4 gap-3">
          <StatCard
            label="Fase Ativa"
            value={intersection ? (phaseLabel[intersection.phase] ?? intersection.phase) : "—"}
            icon={<Activity className="w-5 h-5" />}
            sub={intersection ? `${Math.floor(intersection.phase_elapsed)}s decorridos` : undefined}
          />
          <StatCard label="Total de Veículos" value={totalVehicles} icon={<Car className="w-5 h-5" />} sub="em todas as faixas" />
          <StatCard label="Maior Fila" value={maxQueue} icon={<Users className="w-5 h-5" />} sub="veículos na faixa mais longa" />
          <StatCard label="Eventos" value={events.length} icon={<Timer className="w-5 h-5" />} sub="na sessão atual" />
        </div>
 
        <div className="grid grid-cols-12 gap-4 flex-1">
          <div className="col-span-3 flex flex-col gap-4">
            <Card className="flex-1">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Controles de Simulação</CardTitle>
                  {intersection && (
                    <Badge variant={intersection.pedestrian_active ? "indigo" : "default"}>
                      {intersection.pedestrian_active ? "Pedestre ativo" : "Sem pedestres"}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {intersection ? (
                  <ControlPanel state={intersection} activeBase={activeBase} />
                ) : (
                  <div className="flex items-center justify-center h-32">
                    <span className="text-xs text-zinc-400">Conectando...</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
 
          <div className="col-span-5 flex flex-col gap-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Cruzamento</CardTitle>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${primaryConnected || backupConnected ? "bg-green-500 animate-pulse" : "bg-red-400"}`} />
                    <span className="text-xs text-zinc-400">
                      {primaryConnected || backupConnected ? `ao vivo · ${activeNode}` : "desconectado"}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {intersection ? (
                  <IntersectionView state={intersection} />
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-zinc-200 border-t-indigo-500 animate-spin" />
                    <span className="text-xs text-zinc-400">Aguardando backend...</span>
                  </div>
                )}
              </CardContent>
            </Card>
 
            <Card>
              <CardHeader><CardTitle>Cenário</CardTitle></CardHeader>
              <CardContent>
                {intersection ? (
                  <ScenarioSelector current={intersection.scenario} onChange={handleScenarioChange} disabled={scenarioLoading} />
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-16 rounded-xl bg-zinc-100 animate-pulse" />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
 
          <div className="col-span-4 flex flex-col gap-4">
            <div className="flex-1">
              <EventLog events={events} />
            </div>
 
            <Card>
              <CardHeader><CardTitle>Arquitetura de Nós</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3 text-xs">
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${nodeStatus.primary?.reachable ? "bg-green-500" : "bg-red-400"}`} />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-zinc-700 font-medium">Primário :8000</span>
                      <span className="text-zinc-400">
                        {nodeStatus.primary?.reachable
                          ? `Ativo · ${nodeStatus.primary.active_connections} conexões WS`
                          : "Inacessível"}
                      </span>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${nodeStatus.backup?.reachable ? "bg-green-500" : "bg-zinc-300"}`} />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-zinc-700 font-medium">Backup :8001</span>
                      <span className="text-zinc-400">
                        {nodeStatus.backup?.reachable
                          ? failoverActive
                            ? "Promovido a primário · servindo tráfego"
                            : "Em espera · recebendo replicação"
                          : "Inacessível"}
                      </span>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center gap-2 pt-0.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${failoverActive ? "bg-yellow-400" : "bg-indigo-400"}`} />
                    <span className="text-zinc-500">
                      {failoverActive
                        ? "Modo failover · backup é autoritativo"
                        : "Operação normal · primário é autoritativo"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}