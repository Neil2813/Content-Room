import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Wand2, Shield, Calendar, BarChart3, ArrowRight, FileText, CheckCircle, Clock, AlertTriangle, Loader2, Server } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { analyticsAPI, DashboardMetrics, ProviderStats, APIError, checkBackendHealth } from '@/services/api';

const quickActions = [
  {
    icon: Wand2,
    title: 'Creator Studio',
    description: 'Generate AI-powered content',
    path: '/studio',
    color: 'text-violet-500 bg-violet-500/10',
  },
  {
    icon: Shield,
    title: 'Moderation',
    description: 'Analyze content safety',
    path: '/moderation',
    color: 'text-emerald-500 bg-emerald-500/10',
  },
  {
    icon: Calendar,
    title: 'Scheduler',
    description: 'Plan your content calendar',
    path: '/scheduler',
    color: 'text-blue-500 bg-blue-500/10',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    description: 'View performance metrics',
    path: '/analytics',
    color: 'text-amber-500 bg-amber-500/10',
  },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [providerStats, setProviderStats] = useState<ProviderStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      // Check backend health
      const isOnline = await checkBackendHealth();
      setBackendOnline(isOnline);
      
      if (isOnline) {
        try {
          const [dashboardData, providers] = await Promise.all([
            analyticsAPI.getDashboard(),
            analyticsAPI.getProviderStats(),
          ]);
          setMetrics(dashboardData);
          setProviderStats(providers);
        } catch (err) {
          console.error('Failed to load dashboard data:', err);
        }
      }
      
      setIsLoading(false);
    };

    loadData();
  }, []);

  const statCards = metrics ? [
    { icon: FileText, label: 'Total Content', value: metrics.total_content, color: 'text-blue-500' },
    { icon: CheckCircle, label: 'Safe Content', value: metrics.moderation_safe, color: 'text-emerald-500' },
    { icon: AlertTriangle, label: 'Flagged', value: metrics.moderation_flagged, color: 'text-amber-500' },
    { icon: Clock, label: 'Scheduled', value: metrics.scheduled_posts, color: 'text-purple-500' },
  ] : [];

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              Welcome{user?.name ? `, ${user.name}` : ''} to Content Room
            </h2>
            <p className="text-muted-foreground">
              Your AI-powered content workflow engine.
            </p>
          </div>
          
          {/* Backend Status */}

        </div>

        {/* Stats Overview */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : metrics ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map(({ icon: Icon, label, value, color }) => (
              <Card key={label} className="hover:shadow-soft transition-shadow">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${color}`} />
                    <div>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-xl font-bold">{value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}



        {/* Quick Actions */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Card key={action.path} className="hover:shadow-medium transition-all hover:scale-[1.02]">
              <CardHeader className="pb-2">
                <div className={`h-10 w-10 rounded-xl ${action.color} flex items-center justify-center mb-2`}>
                  <action.icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">{action.title}</CardTitle>
                <CardDescription className="text-sm">{action.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                  <Link to={action.path}>
                    <span className="text-sm font-medium">Open</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Getting Started */}
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>
              Follow these steps to make the most of Content Room
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4 p-4 rounded-xl bg-primary/5">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold flex-shrink-0">
                1
              </div>
              <div>
                <h4 className="font-medium mb-1">Upload your content</h4>
                <p className="text-sm text-muted-foreground">
                  Head to Creator Studio to upload text, images, audio, or video content.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-xl bg-primary/5">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold flex-shrink-0">
                2
              </div>
              <div>
                <h4 className="font-medium mb-1">Review moderation results</h4>
                <p className="text-sm text-muted-foreground">
                  Use the Moderation tool to ensure your content meets safety guidelines.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-xl bg-primary/5">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold flex-shrink-0">
                3
              </div>
              <div>
                <h4 className="font-medium mb-1">Schedule for publishing</h4>
                <p className="text-sm text-muted-foreground">
                  Set up your publishing calendar in the Scheduler.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
