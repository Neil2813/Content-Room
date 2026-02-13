import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage, languages } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Moon, Sun, Bell, Mail, AlertTriangle, User, Palette, Share2, 
  Loader2, Twitter, Instagram, Linkedin, CheckCircle, XCircle,
  RefreshCw, Link2, Unlink, Eye, EyeOff, AlertCircle
} from 'lucide-react';
import { socialConnectAPI, PlatformStatus, APIError } from '@/services/api';

export default function Settings() {
  const navigate = useNavigate();
  const { user, logout, updateProfile } = useAuth();
  const { language, setLanguage } = useLanguage();
  const { toast } = useToast();
  
  // Profile state
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  
  // Appearance state - load from localStorage
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    // Default to dark mode (true) unless explicitly set to 'false'
    return saved !== 'false';
  });
  
  // Notification state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);

  // Platform connection state
  const userId = user?.id ? parseInt(user.id) : 1;
  const [platformsLoading, setPlatformsLoading] = useState(true);
  const [platformError, setPlatformError] = useState<string | null>(null);
  const [twitterStatus, setTwitterStatus] = useState<PlatformStatus | null>(null);
  const [instagramStatus, setInstagramStatus] = useState<PlatformStatus | null>(null);
  const [linkedinStatus, setLinkedinStatus] = useState<PlatformStatus | null>(null);
  
  // Twitter modal state
  const [showTwitterModal, setShowTwitterModal] = useState(false);
  const [twitterUsername, setTwitterUsername] = useState('');
  const [twitterEmail, setTwitterEmail] = useState('');
  const [twitterPassword, setTwitterPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [twitterCookies, setTwitterCookies] = useState('');

  // Apply dark mode on mount and when isDarkMode changes
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  // Fetch platform status on mount
  useEffect(() => {
    fetchPlatformStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPlatformStatus = async () => {
    setPlatformsLoading(true);
    setPlatformError(null);
    
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
        setPlatformError(err.message);
      } else {
        setPlatformError('Failed to load platform status');
      }
    } finally {
      setPlatformsLoading(false);
    }
  };

  const handleProfileSave = async () => {
    setIsProfileLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    updateProfile({ name, email });
    toast({
      title: 'Profile updated',
      description: 'Your changes have been saved successfully.',
    });
    setIsProfileLoading(false);
  };

  const handleThemeToggle = (checked: boolean) => {
    setIsDarkMode(checked);
    document.documentElement.classList.toggle('dark', checked);
    localStorage.setItem('darkMode', String(checked));
    toast({
      title: 'Theme updated',
      description: `Switched to ${checked ? 'dark' : 'light'} mode.`,
    });
  };

  const handleDeleteAccount = () => {
    logout();
    toast({
      title: 'Account deleted',
      description: 'Your account has been permanently deleted.',
    });
    navigate('/');
  };

  // Twitter handlers
  const handleTwitterConnect = () => setShowTwitterModal(true);
  
  const handleTwitterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twitterUsername || !twitterEmail || !twitterPassword) return;

    setIsConnecting(true);
    setPlatformError(null);
    
    try {
      await socialConnectAPI.twitter.connect(twitterUsername, twitterEmail, twitterPassword, userId);
      toast({ title: 'Twitter/X connected successfully!' });
      setShowTwitterModal(false);
      setTwitterUsername('');
      setTwitterEmail('');
      setTwitterPassword('');
      await fetchPlatformStatus();
    } catch (err) {
      if (err instanceof APIError) {
        setPlatformError(err.message);
      } else {
        setPlatformError('Failed to connect Twitter');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleTwitterCookieSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twitterCookies) return;

    try {
      let cookies;
      try {
        cookies = JSON.parse(twitterCookies);
      } catch {
        setPlatformError('Invalid JSON format');
        return;
      }

      setIsConnecting(true);
      setPlatformError(null);
      
      await socialConnectAPI.twitter.connectCookies(cookies, userId);
      toast({ title: 'Twitter/X connected via cookies!' });
      setShowTwitterModal(false);
      setTwitterCookies('');
      await fetchPlatformStatus();
    } catch (err) {
      if (err instanceof APIError) {
        setPlatformError(err.message);
      } else {
        setPlatformError('Failed to connect via cookies');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleTwitterDisconnect = async () => {
    try {
      await socialConnectAPI.twitter.disconnect(userId);
      toast({ title: 'Twitter/X disconnected' });
      await fetchPlatformStatus();
    } catch (err) {
      setPlatformError('Failed to disconnect Twitter');
    }
  };

  // Listen for popup messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Create a trusted origin check if needed, for now accept * for local dev
      // if (event.origin !== window.location.origin) return;

      if (event.data?.type === 'INSTAGRAM_CONNECTED' || event.data?.type === 'LINKEDIN_CONNECTED') {
        if (event.data.success) {
          toast({ 
            title: event.data.type === 'INSTAGRAM_CONNECTED' ? 'Instagram Connected' : 'LinkedIn Connected',
            description: 'Your account has been successfully connected.'
          });
          fetchPlatformStatus();
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInstagramConnect = async () => {
    try {
      // Don't pass redirect URI - let backend use default from .env
      const { url } = await socialConnectAPI.instagram.getConnectUrl(userId);
      window.open(url, '_blank', 'width=600,height=700');
    } catch {
      setPlatformError('Failed to get Instagram connect URL');
    }
  };

  const handleInstagramDisconnect = async () => {
    try {
      await socialConnectAPI.instagram.disconnect(userId);
      toast({ title: 'Instagram disconnected' });
      await fetchPlatformStatus();
    } catch {
      setPlatformError('Failed to disconnect Instagram');
    }
  };

  const handleLinkedinConnect = async () => {
    try {
      // Don't pass redirect URI - let backend use default from .env
      const { url } = await socialConnectAPI.linkedin.getConnectUrl(userId);
      window.open(url, '_blank', 'width=600,height=700');
    } catch {
      setPlatformError('Failed to get LinkedIn connect URL');
    }
  };

  const handleLinkedinDisconnect = async () => {
    try {
      await socialConnectAPI.linkedin.disconnect(userId);
      toast({ title: 'LinkedIn disconnected' });
      await fetchPlatformStatus();
    } catch {
      setPlatformError('Failed to disconnect LinkedIn');
    }
  };

  const PlatformRow = ({ 
    name, 
    icon, 
    color, 
    status, 
    onConnect, 
    onDisconnect 
  }: { 
    name: string; 
    icon: React.ReactNode; 
    color: string; 
    status: PlatformStatus | null;
    onConnect: () => void;
    onDisconnect: () => void;
  }) => {
    const isConnected = status?.connected || false;
    const isConfigured = status?.configured || false;

    return (
      <div className="flex items-center justify-between py-4 border-b border-border/50 last:border-0">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl ${color} flex items-center justify-center`}>
            {icon}
          </div>
          <div>
            <p className="font-medium">{name}</p>
            <p className="text-xs text-muted-foreground">
              {isConnected ? 'Connected' : isConfigured ? 'Not connected' : <span className="text-destructive">Not configured (See .env)</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <Button variant="ghost" size="sm" onClick={onDisconnect} className="text-destructive">
                <Unlink className="h-4 w-4 mr-1" />
                Disconnect
              </Button>
            </>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onConnect}
              disabled={!isConfigured}
            >
              <Link2 className="h-4 w-4 mr-1" />
              Connect
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in max-w-3xl">
        <div>
          <h2 className="text-2xl font-bold mb-2">Settings</h2>
          <p className="text-muted-foreground">
            Manage your account, appearance, and connected platforms.
          </p>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Appearance</span>
            </TabsTrigger>

            <TabsTrigger value="danger" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Account</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Personal Information</CardTitle>
                <CardDescription>Update your account details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="profile-name">Full Name</Label>
                  <Input
                    id="profile-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-email">Email Address</Label>
                  <Input
                    id="profile-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Interface Language</Label>
                  <Select value={language} onValueChange={(value: typeof language) => setLanguage(value)}>
                    <SelectTrigger id="language" className="w-full sm:w-64">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="hero" onClick={handleProfileSave} disabled={isProfileLoading}>
                  {isProfileLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Profile
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Theme</CardTitle>
                <CardDescription>Customize how the application looks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isDarkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                    <div>
                      <Label htmlFor="dark-mode" className="text-sm font-medium">
                        Dark Mode
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Switch between light and dark themes
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="dark-mode"
                    checked={isDarkMode}
                    onCheckedChange={handleThemeToggle}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notifications</CardTitle>
                <CardDescription>Configure how you receive notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5" />
                    <div>
                      <Label htmlFor="email-notifications" className="text-sm font-medium">
                        Email Notifications
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Receive updates via email
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bell className="h-5 w-5" />
                    <div>
                      <Label htmlFor="push-notifications" className="text-sm font-medium">
                        Push Notifications
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Receive browser notifications
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="push-notifications"
                    checked={pushNotifications}
                    onCheckedChange={setPushNotifications}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>



          {/* Danger Zone Tab */}
          <TabsContent value="danger" className="space-y-4">
            <Card className="border-destructive/30">
              <CardHeader>
                <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
                <CardDescription>Irreversible account actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <div>
                      <p className="text-sm font-medium">Delete Account</p>
                      <p className="text-xs text-muted-foreground">
                        Permanently delete your account and all data
                      </p>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        Delete Account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your
                          account and remove all your data from our servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteAccount}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete Account
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

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
                Enter your Twitter credentials. We use Twikit for secure connection.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="credentials" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="credentials">Credentials</TabsTrigger>
                  <TabsTrigger value="cookies">Cookies (Advanced)</TabsTrigger>
                </TabsList>

                <TabsContent value="credentials">
                  <form onSubmit={handleTwitterSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="twitter-username">Username</Label>
                      <Input
                        id="twitter-username"
                        placeholder="@username"
                        value={twitterUsername}
                        onChange={(e) => setTwitterUsername(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                       {/* Email & Password fields */}
                      <Label htmlFor="twitter-email">Email</Label>
                      <Input
                        id="twitter-email"
                        type="email"
                        placeholder="you@example.com"
                        value={twitterEmail}
                        onChange={(e) => setTwitterEmail(e.target.value)}
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
                </TabsContent>

                <TabsContent value="cookies">
                  <form onSubmit={handleTwitterCookieSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="twitter-cookies">Paste Cookies JSON</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Use "EditThisCookie" extension to export cookies as JSON. This bypasses Cloudflare/2FA.
                      </p>
                      <textarea
                        id="twitter-cookies"
                        className="flex min-h-[150px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono text-xs"
                        placeholder='[{"domain": ".twitter.com", "name": "auth_token", "value": "..."}]'
                        value={twitterCookies}
                        onChange={(e) => setTwitterCookies(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Button
                        type="submit"
                        variant="hero"
                        disabled={!twitterCookies || isConnecting}
                        className="flex-1"
                      >
                        {isConnecting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        Import & Connect
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
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
