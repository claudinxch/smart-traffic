import { Activity, Server, AlertTriangle, CheckCircle, XCircle, Wifi } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { simulateFailure, restorePrimary } from "@/services/api";
import type { SystemStatus } from "@/types/traffic";
import { cn } from "@/utils/cn";
import { useState } from "react";

interface SystemStatusBarProps {
  primaryStatus: (SystemStatus & { reachable: boolean; active_connections: number }) | null;
  backupStatus: (SystemStatus & { reachable: boolean; active_connections: number }) | null;
  activeNode: "primary" | "backup";
  failoverActive: boolean;
  primaryConnected: boolean;
  backupConnected: boolean;
  onRestore: () => void;
}

function NodePill({ label, reachable, wsConnected, isActive, failoverOccurred, connections }: {
  label: string;
  reachable: boolean | null;
  wsConnected: boolean;
  isActive: boolean;
  failoverOccurred?: boolean;
  connections?: number;
}) {
  return (
    <div className={cn(
      "flex items-center gap-2.5 px-3 py-1.5 rounded-lg border transition-colors",
      isActive ? "border-indigo-300 bg-indigo-50" : "border-zinc-200 bg-white"
    )}>
      <Server className={cn("w-3.5 h-3.5", isActive ? "text-indigo-500" : "text-zinc-400")} />
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <span className={cn("text-xs font-semibold", isActive ? "text-zinc-800" : "text-zinc-500")}>
            {label}
          </span>
          {isActive && <Badge variant="indigo" className="text-[10px] py-0 px-1.5">ativo</Badge>}
          {failoverOccurred && <Badge variant="yellow" className="text-[10px] py-0 px-1.5">promovido</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className={cn("w-1.5 h-1.5 rounded-full", reachable === null ? "bg-zinc-300" : reachable ? "bg-green-500" : "bg-red-500")} />
            <span className="text-[10px] text-zinc-400">
              {reachable === null ? "desconhecido" : reachable ? "online" : "offline"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Wifi className={cn("w-2.5 h-2.5", wsConnected ? "text-green-500" : "text-zinc-300")} />
            <span className="text-[10px] text-zinc-400">ws</span>
          </div>
          {connections !== undefined && (
            <span className="text-[10px] text-zinc-400">{connections} con.</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function SystemStatusBar({ primaryStatus, backupStatus, activeNode, failoverActive, primaryConnected, backupConnected, onRestore }: SystemStatusBarProps) {
  const [loading, setLoading] = useState<string | null>(null);

  async function handle(key: string, fn: () => Promise<void>) {
    setLoading(key);
    try { await fn(); } finally { setLoading(null); }
  }

  return (
    <div className="flex flex-col gap-0">
      {failoverActive && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-yellow-50 border-b border-yellow-200">
          <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
          <span className="text-xs text-yellow-800 font-medium">
            Failover ativo — o nó backup agora é o primário. Sistema operando normalmente.
          </span>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto border-yellow-300 text-yellow-800 hover:bg-yellow-100"
            disabled={loading !== null}
            onClick={() => { onRestore(); handle("restore", restorePrimary); }}
          >
            Restaurar Primário
          </Button>
        </div>
      )}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-200 bg-white shadow-sm">
        <div className="flex items-center gap-1.5 mr-2">
          <Activity className="w-4 h-4 text-indigo-500" />
          <span className="text-sm font-semibold text-zinc-800 tracking-tight">Smart Traffic</span>
          <span className="text-xs text-zinc-400 ml-1">Sistema de Controle</span>
        </div>
        <Separator orientation="vertical" className="h-5" />
        <div className="flex items-center gap-2">
          <NodePill label="Primário :8000" reachable={primaryStatus?.reachable ?? null} wsConnected={primaryConnected} isActive={activeNode === "primary"} connections={primaryStatus?.active_connections} />
          <NodePill label="Backup :8001" reachable={backupStatus?.reachable ?? null} wsConnected={backupConnected} isActive={activeNode === "backup"} failoverOccurred={backupStatus?.failover_occurred} connections={backupStatus?.active_connections} />
        </div>
        <div className="ml-auto flex items-center gap-2">
          {!failoverActive && (
            <Button variant="outline" size="sm" disabled={loading !== null || !primaryStatus?.reachable} onClick={() => handle("fail", simulateFailure)}>
              <XCircle className="w-3 h-3" />
              Simular Falha
            </Button>
          )}
          {failoverActive && primaryStatus?.reachable && (
            <div className="flex items-center gap-1.5 text-xs text-green-600">
              <CheckCircle className="w-3.5 h-3.5" />
              Primário acessível
            </div>
          )}
        </div>
      </div>
    </div>
  );
}