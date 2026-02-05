import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { 
  BarChart3, TrendingUp, FileText, Shield, Calendar, CheckCircle, 
  Loader2, RefreshCw, AlertCircle, Cpu, Server, Filter
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { analyticsAPI, DashboardMetrics, ModerationStats, ProviderStats, APIError } from '@/services/api';

export default function Analytics() {
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null);
  const [moderationStats, setModerationStats] = useState<ModerationStats | null>(null);
  const [providerStats, setProviderStats] = useState<ProviderStats | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllStats();
  }, [selectedPlatform]);

  const fetchAllStats = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [dashboard, moderation, providers] = await Promise.all([
        analyticsAPI.getDashboard(1, selectedPlatform),
        analyticsAPI.getModerationStats(1, selectedPlatform),
        analyticsAPI.getProviderStats(),
      ]);
      
      setDashboardMetrics(dashboard);
      setModerationStats(moderation);
      setProviderStats(providers);
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError('Failed to load analytics');
      }
      console.error('Analytics fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const metricCards = dashboardMetrics ? [
    { 
      icon: FileText, 
      label: 'Total Content', 
      value: formatNumber(dashboardMetrics.total_content),
      description: `${dashboardMetrics.content_this_week} this week`,
      color: 'text-blue-500 bg-blue-500/10',
    },
    { 
      icon: Shield, 
      label: 'Safe Content', 
      value: formatNumber(dashboardMetrics.moderation_safe),
      description: 'Passed moderation',
      color: 'text-emerald-500 bg-emerald-500/10',
    },
    { 
      icon: AlertCircle, 
      label: 'Flagged', 
      value: formatNumber(dashboardMetrics.moderation_flagged),
      description: 'Needs review',
      color: 'text-amber-500 bg-amber-500/10',
    },
    { 
      icon: Calendar, 
      label: 'Scheduled', 
      value: formatNumber(dashboardMetrics.scheduled_posts),
      description: `${dashboardMetrics.published_posts} published`,
      color: 'text-purple-500 bg-purple-500/10',
    },
  ] : [];

  const moderationBreakdown = moderationStats ? [
    { label: 'Safe', value: moderationStats.safe_count, color: 'bg-emerald-500' },
    { label: 'Warning', value: moderationStats.warning_count, color: 'bg-amber-500' },
    { label: 'Unsafe', value: moderationStats.unsafe_count, color: 'bg-rose-500' },
    { label: 'Escalated', value: moderationStats.escalated_count, color: 'bg-purple-500' },
  ] : [];

  const totalModerated = moderationStats?.total_moderated || 1;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">Analytics</h2>
            <p className="text-muted-foreground">
            Track your content performance and system metrics.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="All Platforms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="twitter">Twitter / X</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={fetchAllStats} 
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive">
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !dashboardMetrics && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Metric Cards */}
        {dashboardMetrics && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {metricCards.map(({ icon: Icon, label, value, description, color }) => (
              <Card key={label} className="hover:shadow-soft transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className={`h-12 w-12 rounded-xl ${color} flex items-center justify-center`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
                      <p className="text-2xl font-bold">{value}</p>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Moderation Stats */}
        {moderationStats && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Moderation Overview
              </CardTitle>
              <CardDescription>
                Content safety analysis breakdown • Avg Score: {moderationStats.average_safety_score}%
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Bar Chart */}
              <div className="space-y-3">
                {moderationBreakdown.map(({ label, value, color }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">{label}</span>
                      <span className="text-muted-foreground">{value} ({((value / totalModerated) * 100).toFixed(1)}%)</span>
                    </div>
                    <div className="h-3 bg-primary/10 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${color} transition-all duration-500`}
                        style={{ width: `${(value / totalModerated) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="flex items-center justify-between pt-4 border-t border-primary/10">
                <span className="text-sm font-medium">Total Moderated</span>
                <span className="text-2xl font-bold">{moderationStats.total_moderated}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Provider Stats */}
        {providerStats && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Current Providers */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Cpu className="h-5 w-5" />
                  Active AI Providers
                </CardTitle>
                <CardDescription>
                  Currently configured service providers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(providerStats.current_providers).map(([service, provider]) => (
                    <div key={service} className="flex items-center justify-between p-3 rounded-xl bg-primary/5">
                      <span className="font-medium capitalize">{service}</span>
                      <span className="text-sm px-3 py-1 rounded-full bg-primary/10">
                        {provider}
                      </span>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 pt-4 border-t border-primary/10">
                  <div className="flex items-center gap-2 text-sm">
                    <Server className="h-4 w-4" />
                    <span>AWS Configured:</span>
                    <span className={`font-medium ${providerStats.aws_configured ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {providerStats.aws_configured ? 'Yes' : 'No (using fallbacks)'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fallback Chain */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Fallback Chain
                </CardTitle>
                <CardDescription>
                  Provider priority order for each service
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(providerStats.fallback_chain).map(([service, providers]) => (
                    <div key={service}>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{service}</p>
                      <div className="flex flex-wrap gap-2">
                        {providers.map((provider, index) => (
                          <span 
                            key={provider}
                            className={`text-xs px-2 py-1 rounded ${
                              index === 0 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-primary/10'
                            }`}
                          >
                            {index + 1}. {provider}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Empty State for when no data */}
        {!isLoading && !dashboardMetrics && !error && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Content Performance</CardTitle>
              <CardDescription>Detailed breakdown of your content metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={<BarChart3 className="h-8 w-8" />}
                title="No data available"
                description="Analytics will appear here once you start creating and publishing content through the platform."
              />
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
