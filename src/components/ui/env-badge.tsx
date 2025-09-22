import * as React from "react";
import { Badge } from "./badge";
import type { Zone } from "@/store/types";

type EnvKey = "prd" | "nprd" | "dev" | "";

function normalizeEnvKey(raw?: string | null): EnvKey {
  const s = (raw || "").toString().trim().toLowerCase();
  if (["production", "prod", "prd"].includes(s)) return "prd";
  if (["nonprod", "non-production", "non production", "nprod", "nprd"].includes(s)) return "nprd";
  if (["dev", "development"].includes(s)) return "dev";
  return "";
}

function mapZoneEnvKey(z?: Zone | null): EnvKey {
  if (!z) return "";
  const raw = (z as any)?.account_facts?.environment ?? (z as any)?.environment ?? "";
  return normalizeEnvKey(raw);
}

function envBadgeVariant(env: EnvKey): "destructive" | "default" | "secondary" {
  return env === "prd" ? "destructive" : env === "nprd" ? "default" : "secondary";
}

type EnvBadgeProps = {
  env?: string | null;
  zone?: Zone | null;
  className?: string;
  title?: string;
};

export function EnvBadge({ env, zone, className, title }: EnvBadgeProps) {
  const key = env !== undefined ? normalizeEnvKey(env) : mapZoneEnvKey(zone);
  const variant = envBadgeVariant(key);
  const label = key || "-";
  return (
    <Badge variant={variant as any} className={className} title={title}>
      {label}
    </Badge>
  );
}
export default EnvBadge;
