import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  FileText,
  CheckCircle,
  AlertTriangle,
  Clock,
  Loader2,
  Send,
  Shield,
  Calendar,
  Activity,
  Zap,
  ArrowUpRight,
  RefreshCw,
  PieChart,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { analyticsAPI, DashboardMetrics, ModerationStats, checkBackendHealth } from '@/services/api';
import { Link } from 'react-router-dom';

// Simple chart components
function ProgressBar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  color,
  trend,
  trendUp,
}: {
  icon: typeof FileText;
  label: string;
  value: number | string;
  subtext?: string;
  color: string;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <Card className="hover:shadow-soft transition-all hover:border-primary/30 group">
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start justify-between">
          <div className={`h-12 w-12 rounded-2xl ${color} flex items-center justify-center`}>
            <Icon className="h-6 w-6" />
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-medium ${trendUp ? 'text-green-500' : 'text-red-500'}`}>
              {trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {trend}
            </div>
          )}
        </div>
        <div className="mt-4">
          <p className="text-3xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground mt-1">{label}</p>
          {subtext && <p className="text-xs text-muted-foreground/70 mt-0.5">{subtext}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function DonutChart({ safe, warning, unsafe }: { safe: number; warning: number; unsafe: number }) {
  const total = safe + warning + unsafe;
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-muted-foreground text-sm">No data</p>
      </div>
    );
  }

  const safePercent = (safe / total) * 100;
  const warningPercent = (warning / total) * 100;
  const unsafePercent = (unsafe / total) * 100;

  // For a horizontal stacked bar visualization instead of donut (simpler)
  return (
    <div className="space-y-4">
      <div className="h-4 rounded-full overflow-hidden flex bg-muted">
        <div
          className="bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
          style={{ width: `${safePercent}%` }}
        />
        <div
          className="bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
          style={{ width: `${warningPercent}%` }}
        />
        <div
          className="bg-gradient-to-r from-red-500 to-red-400 transition-all duration-500"
          style={{ width: `${unsafePercent}%` }}
        />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="text-sm font-medium">{safePercent.toFixed(0)}%</span>
          </div>
          <p className="text-xs text-muted-foreground">Safe ({safe})</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            <span className="text-sm font-medium">{warningPercent.toFixed(0)}%</span>
          </div>
          <p className="text-xs text-muted-foreground">Warning ({warning})</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
            <span className="text-sm font-medium">{unsafePercent.toFixed(0)}%</span>
          </div>
          <p className="text-xs text-muted-foreground">Unsafe ({unsafe})</p>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [moderationStats, setModerationStats] = useState<ModerationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  const loadData = async () => {
    setIsLoading(true);

    const isOnline = await checkBackendHealth();
    setBackendOnline(isOnline);

    if (isOnline && isAuthenticated && user) {
      try {
        const userId = parseInt(user.id, 10) || 1;
        const [dashboardData, moderation] = await Promise.all([
          analyticsAPI.getDashboard(userId),
          analyticsAPI.getModerationStats(userId),
        ]);
        setMetrics(dashboardData);
        setModerationStats(moderation);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      }
    }

    setIsLoading(false);
  };

  useEffect(() => {
    // Wait for auth to finish loading before fetching data
    if (!authLoading) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, user?.id]);

  const totalModerated = moderationStats?.total_moderated || 0;
  const avgSafetyScore = moderationStats?.average_safety_score || 0;

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Analytics Dashboard
            </h2>
            <p className="text-muted-foreground">
              {user?.name ? `Welcome back, ${user.name}. ` : ''}Real-time insights into your content performance.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {backendOnline !== null && (
              <Badge variant={backendOnline ? 'default' : 'destructive'} className="gap-1">
                <div className={`h-2 w-2 rounded-full ${backendOnline ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                {backendOnline ? 'Online' : 'Offline'}
              </Badge>
            )}
            <Button variant="outline" size="icon" onClick={loadData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground">Loading analytics...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={FileText}
                label="Total Content"
                value={metrics?.total_content || 0}
                subtext={`${metrics?.content_this_week || 0} this week`}
                color="bg-blue-500/10 text-blue-500"
                trend="+12%"
                trendUp={true}
              />
              <StatCard
                icon={CheckCircle}
                label="Safe Content"
                value={metrics?.moderation_safe || 0}
                color="bg-emerald-500/10 text-emerald-500"
              />
              <StatCard
                icon={AlertTriangle}
                label="Flagged Content"
                value={metrics?.moderation_flagged || 0}
                color="bg-amber-500/10 text-amber-500"
              />
              <StatCard
                icon={Calendar}
                label="Scheduled Posts"
                value={metrics?.scheduled_posts || 0}
                subtext={`${metrics?.published_posts || 0} published`}
                color="bg-purple-500/10 text-purple-500"
              />
            </div>

            {/* Secondary Stats Row */}
            <div className="grid gap-4">
              {/* Moderation Overview */}
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-emerald-500" />
                        Content Moderation
                      </CardTitle>
                      <CardDescription>Safety analysis breakdown</CardDescription>
                    </div>
                    <Badge variant="outline" className="gap-1">
                      <PieChart className="h-3 w-3" />
                      {totalModerated} analyzed
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <DonutChart
                    safe={moderationStats?.safe_count || 0}
                    warning={moderationStats?.warning_count || 0}
                    unsafe={moderationStats?.unsafe_count || 0}
                  />
                  <div className="mt-6 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Average Safety Score</span>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                            style={{ width: `${avgSafetyScore * 100}%` }}
                          />
                        </div>
                        <span className="font-bold text-emerald-500">{(avgSafetyScore * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Content Pipeline Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Content Pipeline
                </CardTitle>
                <CardDescription>Track content through your workflow stages</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-6">
                  <ProgressBar
                    value={metrics?.total_content || 0}
                    max={Math.max(metrics?.total_content || 1, 100)}
                    color="bg-gradient-to-r from-blue-500 to-blue-400"
                    label="Total Created"
                  />
                  <ProgressBar
                    value={totalModerated}
                    max={Math.max(metrics?.total_content || 1, 100)}
                    color="bg-gradient-to-r from-emerald-500 to-emerald-400"
                    label="Moderated"
                  />
                  <ProgressBar
                    value={metrics?.scheduled_posts || 0}
                    max={Math.max(metrics?.total_content || 1, 100)}
                    color="bg-gradient-to-r from-purple-500 to-purple-400"
                    label="Scheduled"
                  />
                  <ProgressBar
                    value={metrics?.published_posts || 0}
                    max={Math.max(metrics?.scheduled_posts || 1, 100)}
                    color="bg-gradient-to-r from-green-500 to-green-400"
                    label="Published"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link to="/studio" className="group">
                <Card className="h-full hover:shadow-soft transition-all hover:border-primary/30 hover:scale-[1.02]">
                  <CardContent className="pt-6 pb-6">
                    <div className="h-10 w-10 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center mb-3">
                      <Zap className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold">Creator Studio</h3>
                    <p className="text-sm text-muted-foreground mt-1">Create & generate content</p>
                    <ArrowUpRight className="h-4 w-4 mt-3 text-muted-foreground group-hover:text-primary transition-colors" />
                  </CardContent>
                </Card>
              </Link>
              <Link to="/moderation" className="group">
                <Card className="h-full hover:shadow-soft transition-all hover:border-primary/30 hover:scale-[1.02]">
                  <CardContent className="pt-6 pb-6">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3">
                      <Shield className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold">Moderation</h3>
                    <p className="text-sm text-muted-foreground mt-1">Analyze content safety</p>
                    <ArrowUpRight className="h-4 w-4 mt-3 text-muted-foreground group-hover:text-primary transition-colors" />
                  </CardContent>
                </Card>
              </Link>
              <Link to="/scheduler" className="group">
                <Card className="h-full hover:shadow-soft transition-all hover:border-primary/30 hover:scale-[1.02]">
                  <CardContent className="pt-6 pb-6">
                    <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-3">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold">Scheduler</h3>
                    <p className="text-sm text-muted-foreground mt-1">Plan content calendar</p>
                    <ArrowUpRight className="h-4 w-4 mt-3 text-muted-foreground group-hover:text-primary transition-colors" />
                  </CardContent>
                </Card>
              </Link>
              <Link to="/history" className="group">
                <Card className="h-full hover:shadow-soft transition-all hover:border-primary/30 hover:scale-[1.02]">
                  <CardContent className="pt-6 pb-6">
                    <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
                      <Clock className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold">History</h3>
                    <p className="text-sm text-muted-foreground mt-1">View activity log</p>
                    <ArrowUpRight className="h-4 w-4 mt-3 text-muted-foreground group-hover:text-primary transition-colors" />
                  </CardContent>
                </Card>
              </Link>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
