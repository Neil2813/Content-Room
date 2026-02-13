import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/shared/EmptyState';
import { Calendar, Clock, Plus, Trash2, Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { schedulerAPI, ScheduledPost, APIError } from '@/services/api';

export default function Scheduler() {
  const [searchParams] = useSearchParams();
  const contentIdParam = searchParams.get('contentId');
  const contentId = useMemo(() => {
    if (!contentIdParam) return undefined;
    const n = parseInt(contentIdParam, 10);
    return Number.isNaN(n) ? undefined : n;
  }, [contentIdParam]);

  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    scheduledDate: '',
    scheduledTime: '',
    platform: '',
  });

  // Fetch posts on mount
  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedPosts = await schedulerAPI.listPosts();
      setPosts(fetchedPosts);
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError('Failed to load scheduled posts');
      }
      console.error('Fetch posts error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSchedule = async () => {
    if (!newPost.title || !newPost.scheduledDate || !newPost.scheduledTime) return;

    setIsSubmitting(true);
    setError(null);
    
    try {
      // Combine date and time into ISO format
      const scheduledAt = new Date(`${newPost.scheduledDate}T${newPost.scheduledTime}`).toISOString();
      
      const createdPost = await schedulerAPI.createPost({
        title: newPost.title,
        description: newPost.content || undefined,
        scheduled_at: scheduledAt,
        platform: newPost.platform || undefined,
        content_id: contentId,
      });

      setPosts([...posts, createdPost]);
      setNewPost({ title: '', content: '', scheduledDate: '', scheduledTime: '', platform: '' });
      setIsCreating(false);
      setSuccessMessage('Post scheduled successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      if (err instanceof APIError) {
        // Check for moderation failure
        if (err.data && typeof err.data === 'object' && 'error' in err.data) {
          const errorData = err.data as { error: string; message?: string; reason?: string };
          if (errorData.error === 'moderation_failed' || errorData.error === 'text_moderation_failed') {
            setError(`Content rejected: ${errorData.reason || errorData.message}`);
          } else {
            setError(err.message);
          }
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to schedule post');
      }
      console.error('Schedule error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await schedulerAPI.cancelPost(id);
      setPosts(posts.filter((post) => post.id !== id));
      setSuccessMessage('Post cancelled successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError('Failed to cancel post');
      }
      console.error('Delete error:', err);
    }
  };

  const formatDateTime = (isoString: string) => {
    const dateObj = new Date(isoString);
    return dateObj.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'queued':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-500/10 text-blue-600 border border-blue-500/20">
            <Clock className="h-3 w-3" />
            Queued
          </span>
        );
      case 'published':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            <CheckCircle className="h-3 w-3" />
            Published
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-rose-500/10 text-rose-600 border border-rose-500/20">
            <AlertCircle className="h-3 w-3" />
            Failed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
            {status}
          </span>
        );
    }
  };

  const platforms = [
    { value: '', label: 'All Platforms' },
    { value: 'twitter', label: 'Twitter/X' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'facebook', label: 'Facebook' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">Content Scheduler</h2>
            <p className="text-muted-foreground">
              Plan and schedule your content for publishing.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchPosts} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {!isCreating && (
              <Button variant="hero" onClick={() => setIsCreating(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Schedule Post
              </Button>
            )}
          </div>
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

        {/* Create New Post */}
        {isCreating && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Schedule New Post</CardTitle>
              <CardDescription>
                Set up a new post to be published at a specific time. Content will be moderated before scheduling.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="post-title">Title *</Label>
                <Input
                  id="post-title"
                  placeholder="Enter post title"
                  value={newPost.title}
                  onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="post-content">Content (optional)</Label>
                <Textarea
                  id="post-content"
                  placeholder="Enter post content"
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  rows={4}
                  className="resize-none"
                />
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="post-date">Date *</Label>
                  <Input
                    id="post-date"
                    type="date"
                    value={newPost.scheduledDate}
                    onChange={(e) => setNewPost({ ...newPost, scheduledDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="post-time">Time *</Label>
                  <Input
                    id="post-time"
                    type="time"
                    value={newPost.scheduledTime}
                    onChange={(e) => setNewPost({ ...newPost, scheduledTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="post-platform">Platform</Label>
                  <select
                    id="post-platform"
                    value={newPost.platform}
                    onChange={(e) => setNewPost({ ...newPost, platform: e.target.value })}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    aria-label="Select platform for post"
                  >
                    {platforms.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="hero"
                  onClick={handleSchedule}
                  disabled={!newPost.title || !newPost.scheduledDate || !newPost.scheduledTime || isSubmitting}
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Schedule
                </Button>
                <Button variant="outline" onClick={() => setIsCreating(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upcoming Posts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Scheduled Posts</CardTitle>
            <CardDescription>Your content queue ({posts.length} posts)</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : posts.length > 0 ? (
              <div className="space-y-3">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="flex items-start justify-between p-4 rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{post.title}</h4>
                        {getStatusBadge(post.status)}
                        {post.ai_optimized && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary">
                            AI Optimized
                          </span>
                        )}
                      </div>
                      {post.description && (
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {post.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <Clock className="h-3 w-3" />
                          {formatDateTime(post.scheduled_at)}
                        </span>
                        {post.platform && (
                          <span className="capitalize">📱 {post.platform}</span>
                        )}
                      </div>
                    </div>
                    {post.status === 'queued' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(post.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Calendar className="h-8 w-8" />}
                title="No scheduled posts"
                description="Click 'Schedule Post' to plan your first piece of content."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
