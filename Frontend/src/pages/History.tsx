import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  History as HistoryIcon,
  FileText,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Loader2,
  Filter,
  ArrowUpRight,
  AlertTriangle,
  Shield,
  Send,
} from 'lucide-react';
import { historyAPI, HistoryItem as APIHistoryItem, HistoryStats, APIError } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

type HistoryItemType = 'content' | 'scheduled';
type TimeFilter = 'all' | 'today' | 'week' | 'month';

interface HistoryItem {
  id: number;
  type: HistoryItemType;
  title: string;
  description?: string;
  status: string;
  statusColor: string;
  icon: typeof FileText;
  date: string;
  platform?: string;
  safetyScore?: number;
}

const statusColors: Record<string, string> = {
  draft: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  moderated: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  translated: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  scheduled: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  queued: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  published: 'bg-green-500/20 text-green-400 border-green-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
  cancelled: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  safe: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  warning: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  unsafe: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const getStatusColor = (status: string): string => {
  return statusColors[status.toLowerCase()] || statusColors.draft;
};

export default function History() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [historyItems, setHistoryItems] = useState<APIHistoryItem[]>([]);
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | 'content' | 'scheduled'>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');

  const fetchHistory = async () => {
    // Don't fetch if not authenticated
    if (!isAuthenticated) {
      setError('Please log in to view your history.');
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const [historyResponse, statsResponse] = await Promise.all([
        historyAPI.getHistory(
          typeFilter === 'all' ? undefined : typeFilter,
          timeFilter === 'all' ? undefined : timeFilter
        ),
        historyAPI.getStats(),
      ]);
      setHistoryItems(historyResponse.items);
      setStats(statsResponse);
    } catch (err) {
      if (err instanceof APIError) {
        if (err.status === 401) {
          setError('Please log in to view your history.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to load history');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Wait for auth to finish loading before fetching
    if (!authLoading) {
      fetchHistory();
    }
  }, [authLoading, isAuthenticated, typeFilter, timeFilter]);

  // Transform API history items to display format
  const combinedHistory: HistoryItem[] = historyItems.map((item) => ({
    id: item.id,
    type: item.item_type as HistoryItemType,
    title: item.title,
    description: item.description,
    status: item.status,
    statusColor: getStatusColor(item.status),
    icon: item.item_type === 'content' 
      ? (item.status === 'moderated' ? Shield : FileText)
      : (item.status === 'published' ? Send : Calendar),
    date: item.created_at,
    platform: item.platform,
    safetyScore: item.safety_score,
  }));

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'published':
      case 'safe':
      case 'moderated':
        return <CheckCircle className="h-3 w-3" />;
      case 'failed':
      case 'unsafe':
        return <XCircle className="h-3 w-3" />;
      case 'queued':
      case 'pending':
        return <Clock className="h-3 w-3" />;
      case 'warning':
        return <AlertTriangle className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };


  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <HistoryIcon className="h-6 w-6 text-primary" />
              Activity History
            </h2>
            <p className="text-muted-foreground">
              Track all your content and scheduling activity in one place.
            </p>
          </div>
          <Button variant="outline" size="icon" onClick={fetchHistory} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Content</p>
                  <p className="text-2xl font-bold">{stats?.total_content || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Scheduled</p>
                  <p className="text-2xl font-bold">{stats?.total_scheduled || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <Send className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Published</p>
                  <p className="text-2xl font-bold">{stats?.published_count || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Moderated</p>
                  <p className="text-2xl font-bold">{stats?.moderated_count || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Filter:</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={typeFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTypeFilter('all')}
                >
                  All
                </Button>
                <Button
                  variant={typeFilter === 'content' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTypeFilter('content')}
                >
                  <FileText className="h-3 w-3 mr-1" />
                  Content
                </Button>
                <Button
                  variant={typeFilter === 'scheduled' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTypeFilter('scheduled')}
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  Scheduled
                </Button>
              </div>
              <div className="h-4 w-px bg-border mx-2" />
              <div className="flex gap-2">
                {(['all', 'today', 'week', 'month'] as TimeFilter[]).map((t) => (
                  <Button
                    key={t}
                    variant={timeFilter === t ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setTimeFilter(t)}
                    className="capitalize"
                  >
                    {t === 'all' ? 'All Time' : t === 'today' ? 'Today' : t === 'week' ? 'This Week' : 'This Month'}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* History List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : combinedHistory.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <EmptyState
                icon={<HistoryIcon className="h-10 w-10 text-muted-foreground" />}
                title="No history yet"
                description="Your content creation and scheduling activity will appear here."
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <CardDescription>
                Showing {combinedHistory.length} items
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {combinedHistory.map((item) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-soft transition-all group"
                  >
                    {/* Icon */}
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      item.type === 'content' ? 'bg-blue-500/10' : 'bg-purple-500/10'
                    }`}>
                      <item.icon className={`h-5 w-5 ${
                        item.type === 'content' ? 'text-blue-400' : 'text-purple-400'
                      }`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.title}</p>
                          {item.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                              {item.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant="outline" className={`${item.statusColor} border text-xs`}>
                            {getStatusIcon(item.status)}
                            <span className="ml-1 capitalize">{item.status}</span>
                          </Badge>
                          {item.platform && (
                            <Badge variant="secondary" className="text-xs capitalize">
                              {item.platform}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(item.date)}
                        </span>
                        <Badge variant="outline" className="text-xs capitalize">
                          {item.type}
                        </Badge>
                        {item.safetyScore !== undefined && (
                          <span className="flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            Safety: {(item.safetyScore * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
