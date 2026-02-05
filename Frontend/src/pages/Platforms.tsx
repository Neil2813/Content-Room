import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Twitter, Instagram, Linkedin, CheckCircle, XCircle, 
  Loader2, RefreshCw, ExternalLink, AlertCircle, Link2, Unlink, Eye, EyeOff
} from 'lucide-react';
import { socialConnectAPI, PlatformStatus, APIError } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

interface PlatformCardProps {
  name: string;
  icon: React.ReactNode;
  color: string;
  status: PlatformStatus | null;
  isLoading: boolean;
  authType: 'credentials' | 'oauth';
  note: string;
  onConnect: () => void;
  onDisconnect: () => void;
}

function PlatformCard({ 
  name, 
  icon, 
  color, 
  status, 
  isLoading, 
  authType, 
  note,
  onConnect, 
  onDisconnect 
}: PlatformCardProps) {
  const isConnected = status?.connected || false;
  const isConfigured = status?.configured || false;

  return (
    <Card className={`transition-all hover:shadow-soft ${isConnected ? 'border-emerald-500/30' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-12 w-12 rounded-xl ${color} flex items-center justify-center`}>
              {icon}
            </div>
            <div>
              <CardTitle className="text-lg">{name}</CardTitle>
              <CardDescription className="text-xs">
                {authType === 'credentials' ? 'Login with credentials' : 'OAuth authentication'}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <span className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
                <CheckCircle className="h-4 w-4" />
                Connected
              </span>
            ) : (
              <span className="flex items-center gap-1 text-muted-foreground text-sm">
                <XCircle className="h-4 w-4" />
                Not connected
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">{note}</p>
        
        <div className="flex gap-2">
          {isConnected ? (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onDisconnect}
              disabled={isLoading}
              className="text-destructive hover:text-destructive"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Unlink className="h-4 w-4 mr-1" />}
              Disconnect
            </Button>
          ) : (
            <Button 
              variant="hero" 
              size="sm"
              onClick={onConnect}
              disabled={isLoading || !isConfigured}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Link2 className="h-4 w-4 mr-1" />}
              Connect
            </Button>
          )}
        </div>
        
        {!isConfigured && !isConnected && (
          <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            API credentials not configured in backend
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function Platforms() {
  const { user } = useAuth();
  const userId = user?.id ? parseInt(user.id) : 1;
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [twitterStatus, setTwitterStatus] = useState<PlatformStatus | null>(null);
  const [instagramStatus, setInstagramStatus] = useState<PlatformStatus | null>(null);
  const [linkedinStatus, setLinkedinStatus] = useState<PlatformStatus | null>(null);
  
  // Twitter credentials modal state
  const [showTwitterModal, setShowTwitterModal] = useState(false);
  const [twitterUsername, setTwitterUsername] = useState('');
  const [twitterEmail, setTwitterEmail] = useState('');
  const [twitterPassword, setTwitterPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    fetchAllStatus();
  }, []);

  const fetchAllStatus = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const allStatus = await socialConnectAPI.getAllStatus(userId);
      
      setTwitterStatus({
        platform: 'twitter',
        configured: allStatus.platforms.twitter.configured,
        connected: allStatus.platforms.twitter.connected,
        auth_type: 'credentials',
        note: allStatus.platforms.twitter.note,
      });
      
      setInstagramStatus({
        platform: 'instagram',
        configured: allStatus.platforms.instagram.configured,
        connected: allStatus.platforms.instagram.connected,
        auth_type: 'oauth',
        note: allStatus.platforms.instagram.note,
      });
      
      setLinkedinStatus({
        platform: 'linkedin',
        configured: allStatus.platforms.linkedin.configured,
        connected: allStatus.platforms.linkedin.connected,
        auth_type: 'oauth',
        note: allStatus.platforms.linkedin.note,
      });
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError('Failed to load platform status');
      }
      console.error('Fetch status error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAllStatus();
    setIsRefreshing(false);
  };

  const handleTwitterConnect = () => {
    setShowTwitterModal(true);
  };

  const handleTwitterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twitterUsername || !twitterEmail || !twitterPassword) return;

    setIsConnecting(true);
    setError(null);
    
    try {
      await socialConnectAPI.twitter.connect(twitterUsername, twitterEmail, twitterPassword, userId);
      setSuccessMessage('Twitter/X connected successfully!');
      setShowTwitterModal(false);
      setTwitterUsername('');
      setTwitterEmail('');
      setTwitterPassword('');
      await fetchAllStatus();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError('Failed to connect Twitter');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleTwitterDisconnect = async () => {
    try {
      await socialConnectAPI.twitter.disconnect(userId);
      setSuccessMessage('Twitter/X disconnected');
      await fetchAllStatus();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError('Failed to disconnect Twitter');
      }
    }
  };

  const handleInstagramConnect = async () => {
    try {
      const { url } = await socialConnectAPI.instagram.getConnectUrl(userId, window.location.origin + '/platforms');
      window.open(url, '_blank', 'width=600,height=700');
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError('Failed to get Instagram connect URL');
      }
    }
  };

  const handleInstagramDisconnect = async () => {
    try {
      await socialConnectAPI.instagram.disconnect(userId);
      setSuccessMessage('Instagram disconnected');
      await fetchAllStatus();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError('Failed to disconnect Instagram');
      }
    }
  };

  const handleLinkedinConnect = async () => {
    try {
      const { url } = await socialConnectAPI.linkedin.getConnectUrl(userId, window.location.origin + '/platforms');
      window.open(url, '_blank', 'width=600,height=700');
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError('Failed to get LinkedIn connect URL');
      }
    }
  };

  const handleLinkedinDisconnect = async () => {
    try {
      await socialConnectAPI.linkedin.disconnect(userId);
      setSuccessMessage('LinkedIn disconnected');
      await fetchAllStatus();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError('Failed to disconnect LinkedIn');
      }
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">Platform Connections</h2>
            <p className="text-muted-foreground">
              Connect your social media accounts to publish content directly.
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh} 
            disabled={isRefreshing || isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Status
          </Button>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600">
            <p className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              {successMessage}
            </p>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive">
            <p className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </p>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Platform Cards */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Twitter/X */}
              <PlatformCard
                name="Twitter / X"
                icon={<Twitter className="h-6 w-6 text-white" />}
                color="bg-black"
                status={twitterStatus}
                isLoading={isConnecting}
                authType="credentials"
                note="Uses Twikit - no API key required! Just login with your credentials."
                onConnect={handleTwitterConnect}
                onDisconnect={handleTwitterDisconnect}
              />

              {/* Instagram */}
              <PlatformCard
                name="Instagram"
                icon={<Instagram className="h-6 w-6 text-white" />}
                color="bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400"
                status={instagramStatus}
                isLoading={false}
                authType="oauth"
                note="Requires Facebook/Instagram Business account for OAuth."
                onConnect={handleInstagramConnect}
                onDisconnect={handleInstagramDisconnect}
              />

              {/* LinkedIn */}
              <PlatformCard
                name="LinkedIn"
                icon={<Linkedin className="h-6 w-6 text-white" />}
                color="bg-[#0A66C2]"
                status={linkedinStatus}
                isLoading={false}
                authType="oauth"
                note="Requires LinkedIn Developer App for OAuth."
                onConnect={handleLinkedinConnect}
                onDisconnect={handleLinkedinDisconnect}
              />
            </div>

          </>
        )}

        {/* Twitter Credentials Modal */}
        {showTwitterModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md animate-slide-up">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-black flex items-center justify-center">
                    <Twitter className="h-4 w-4 text-white" />
                  </div>
                  Connect Twitter / X
                </CardTitle>
                <CardDescription>
                  Enter your Twitter credentials. We use Twikit for secure, direct connection.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleTwitterSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="twitter-username">Username</Label>
                    <Input
                      id="twitter-username"
                      placeholder="@username"
                      value={twitterUsername}
                      onChange={(e) => setTwitterUsername(e.target.value)}
                      autoComplete="username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="twitter-email">Email</Label>
                    <Input
                      id="twitter-email"
                      type="email"
                      placeholder="you@example.com"
                      value={twitterEmail}
                      onChange={(e) => setTwitterEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="twitter-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="twitter-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Your Twitter password"
                        value={twitterPassword}
                        onChange={(e) => setTwitterPassword(e.target.value)}
                        autoComplete="current-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1 h-7 w-7 p-0"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your credentials are used only to authenticate with Twitter.
                  </p>
                  <div className="flex gap-3 pt-2">
                    <Button
                      type="submit"
                      variant="hero"
                      disabled={!twitterUsername || !twitterEmail || !twitterPassword || isConnecting}
                      className="flex-1"
                    >
                      {isConnecting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Connect
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowTwitterModal(false)}
                      disabled={isConnecting}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
