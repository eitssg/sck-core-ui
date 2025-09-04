import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useSelector } from "react-redux"
import type { RootState } from "@/store"
import { selectIsAuthenticated } from "@/store/slices/authSlice"

import { useReduxData } from "@/hooks/useReduxData"
import { useTheme } from "@/hooks/useTheme"
import { useToast } from "@/hooks/use-toast"

import { buildApiUrl, getAuthHeaders, API_CONFIG } from "@/lib/api-config"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

import {
  GitBranch,
  RefreshCw,
  Loader2,
  Building2,
  Search,
  Filter,
  Globe,
  Tag as TagIcon,
  Eye,
  Clock,
} from "lucide-react"

type Deployment = {
  id: string
  prn?: string
  client?: string
  portfolio?: string
  application?: string
  environment?: string
  region?: string
  status?: "released" | "not-released" | "failed" | "release-in-progress" | "teardown-in-progress" | string
  tag?: string
  created_at?: string
  last_activity?: string
}

type ApiResponse<T> = {
  data: T[] | T
  metadata?: {
    total?: number
    page?: number
    page_size?: number
    cursor?: string | null
  }
  message?: string
  status?: string
}

const statusOptions = [
  "released",
  "not-released",
  "failed",
  "release-in-progress",
  "teardown-in-progress",
] as const

function formatDate(v?: string) {
  if (!v) return "—"
  const d = new Date(v)
  return isNaN(d.getTime()) ? "—" : `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`
}

function statusVariant(s?: string): "default" | "secondary" | "destructive" | "outline" {
  switch (s) {
    case "released":
      return "default"
    case "failed":
      return "destructive"
    case "release-in-progress":
      return "secondary"
    case "teardown-in-progress":
      return "secondary"
    case "not-released":
      return "outline"
    default:
      return "outline"
  }
}

export default function Deployments() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { isDark } = useTheme()

  // Auth guard
  const isAuthenticated = useSelector((s: RootState) => selectIsAuthenticated(s))
  useEffect(() => {
    if (!isAuthenticated) navigate("/login", { replace: true })
  }, [isAuthenticated, navigate])

  // Client context
  const { selectedClient, clients } = useReduxData()
  const currentClient = typeof selectedClient === "string" ? selectedClient : null
  const clientName = useMemo(() => {
    const items: any[] = Array.isArray((clients as any)?.items) ? (clients as any).items : []
    return items.find((c) => c.client === currentClient)?.client_name || currentClient || "—"
  }, [clients, currentClient])

  // Local UI state
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<string>("all")
  const [environment, setEnvironment] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  // Data state
  const [rows, setRows] = useState<Deployment[]>([])
  const [total, setTotal] = useState(0)

  // Track auto refresh
  const intervalRef = useRef<number | null>(null)

  // Derived environments from loaded rows (client-side)
  const envOptions = useMemo(() => {
    const set = new Set<string>()
    rows.forEach((r) => r.environment && set.add(r.environment))
    if (set.size === 0) return ["production", "staging", "development"]
    return Array.from(set)
  }, [rows])

  // Fetch deployments
  const fetchDeployments = useCallback(
    async (opts?: { resetPage?: boolean }) => {
      if (!currentClient) return
      if (opts?.resetPage) setPage(1)

      setLoading(true)
      try {
        const url = new URL(buildApiUrl(API_CONFIG.ENDPOINTS.API.DEPLOYMENTS))
        url.searchParams.set("client", currentClient)
        if (search.trim()) url.searchParams.set("q", search.trim())
        if (status !== "all") url.searchParams.set("status", status)
        if (environment !== "all") url.searchParams.set("environment", environment)
        url.searchParams.set("page", String(page))
        url.searchParams.set("limit", String(pageSize))

        const res = await fetch(url.toString(), {
          method: "GET",
          headers: getAuthHeaders(),
        })

        if (!res.ok) {
          let msg = `Failed to load deployments (HTTP ${res.status})`
          try {
            const j = await res.json()
            msg = j?.message || msg
          } catch {
            // ignore parse errors
          }
          throw new Error(msg)
        }

        const json = (await res.json()) as ApiResponse<Deployment>
        const list = Array.isArray(json.data) ? json.data : json.data ? [json.data] : []
        setRows(list)
        setTotal(json.metadata?.total ?? list.length)
        setLastRefresh(new Date())
      } catch (err) {
        toast({
          title: "Load failed",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    },
    [currentClient, search, status, environment, page, pageSize, toast]
  )

  // Initial + changes
  useEffect(() => {
    if (!currentClient) return
    fetchDeployments()
  }, [currentClient, page, pageSize]) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounce search/status/environment
  useEffect(() => {
    if (!currentClient) return
    const t = setTimeout(() => {
      fetchDeployments({ resetPage: true })
    }, 300)
    return () => clearTimeout(t)
  }, [search, status, environment, currentClient]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh handling
  useEffect(() => {
    if (autoRefresh && currentClient) {
      // refresh every 30s
      intervalRef.current = window.setInterval(() => fetchDeployments(), 30_000)
      return () => {
        if (intervalRef.current) window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [autoRefresh, currentClient, fetchDeployments])

  const manualRefresh = async () => {
    await fetchDeployments()
  }

  // Pretty helpers
  const emptyState = !loading && rows.length === 0

  if (!isAuthenticated) return null

  if (!currentClient) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium text-foreground">No Client Selected</h3>
              <p className="mt-1 text-sm text-muted-foreground">Please select a client from the header to view deployments.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Context banner */}
      <Card className="border-l-4 border-l-primary bg-primary/5">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <GitBranch className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase">Client</div>
                <div className="text-base font-semibold text-foreground">{clientName}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Last refresh: {lastRefresh ? lastRefresh.toLocaleTimeString() : "—"}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header + actions */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Deployments</h1>
          <p className="text-muted-foreground">Application releases and environments for {clientName}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Auto-refresh:</span>
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh((v) => !v)}
              className="text-xs"
            >
              {autoRefresh ? "ON" : "OFF"}
            </Button>
            {autoRefresh && <span className="text-xs text-muted-foreground">(30s)</span>}
          </div>
          <Button onClick={manualRefresh} disabled={loading} variant="outline" className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="shadow-soft">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4 text-primary" />
            Filters
          </CardTitle>
          <CardDescription>Search and narrow deployments by status and environment</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search PRN, application, portfolio, tag..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={status} onValueChange={(v) => setStatus(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {statusOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace(/-/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={environment} onValueChange={(v) => setEnvironment(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Environment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All environments</SelectItem>
                {envOptions.map((env) => (
                  <SelectItem key={env} value={env}>
                    {env}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Separator className="mt-2" />
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-muted-foreground">
              Showing page {page} • {rows.length} row{rows.length === 1 ? "" : "s"} • Total {total}
            </div>
            <div className="flex items-center gap-2">
              <Select value={String(pageSize)} onValueChange={(v) => setPageSize(parseInt(v))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 / page</SelectItem>
                  <SelectItem value="25">25 / page</SelectItem>
                  <SelectItem value="50">50 / page</SelectItem>
                  <SelectItem value="100">100 / page</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={rows.length < pageSize && total <= page * pageSize}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-medium">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-primary" />
              <span>Deployments ({total})</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : emptyState ? (
            <div className="text-center py-12">
              <GitBranch className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium text-foreground">No deployments found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Try adjusting filters or refreshing to fetch the latest data.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deployment</TableHead>
                  <TableHead>Application</TableHead>
                  <TableHead>Portfolio</TableHead>
                  <TableHead>Environment</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tag</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((d) => {
                  const idOrPrn = d.prn || d.id
                  return (
                    <TableRow key={d.id}>
                      <TableCell className="max-w-[260px]">
                        <div className="flex flex-col">
                          <span className="font-medium">{d.id}</span>
                          <span className="text-xs text-muted-foreground truncate">{d.prn || "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate">{d.application || "—"}</TableCell>
                      <TableCell className="max-w-[180px] truncate">{d.portfolio || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={d.environment === "production" ? "destructive" : "secondary"} className="gap-1">
                          <Globe className="h-3 w-3" />
                          {d.environment || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>{d.region || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(d.status)}>{(d.status || "unknown").replace(/-/g, " ")}</Badge>
                      </TableCell>
                      <TableCell>
                        {d.tag ? (
                          <Badge variant="outline" className="gap-1">
                            <TagIcon className="h-3 w-3" />
                            {d.tag}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{formatDate(d.last_activity || d.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant={isDark ? "secondary" : "outline"} size="sm" className="gap-2">
                          <Link to={`/deployments/${encodeURIComponent(idOrPrn)}`}
                          >
                            <Eye className="h-4 w-4" />
                            Details
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}