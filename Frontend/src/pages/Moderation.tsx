import { useState, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/shared/EmptyState';
import { Shield, Upload, CheckCircle, AlertTriangle, XCircle, Loader2, FileImage, Music, Video, X, Cpu } from 'lucide-react';
import { moderationAPI, APIError, ModerationResponse, MultimodalModerationResponse } from '@/services/api';

interface ModerationResult {
  safetyScore: number;
  flags: string[];
  explanation: string;
  status: 'safe' | 'warning' | 'unsafe';
  decision: string;
  provider?: string;
  processingTime?: number;
  fileResults?: {
    image?: { is_safe: boolean; labels: string[] };
    audio?: { transcript: string; flags: string[] };
  };
}

export default function Moderation() {
  const [content, setContent] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ModerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
    }
  };

  const [videoFile, setVideoFile] = useState<File | null>(null);

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
    }
  };

  const transformResult = (
    apiResult: ModerationResponse | MultimodalModerationResponse,
    isMultimodal = false
  ): ModerationResult => {
    if (isMultimodal) {
      const multiRes = apiResult as MultimodalModerationResponse;
      const status: 'safe' | 'warning' | 'unsafe' = 
        multiRes.overall_safety_score >= 70 ? 'safe' :
        multiRes.overall_safety_score >= 40 ? 'warning' : 'unsafe';
      
      return {
        safetyScore: multiRes.overall_safety_score,
        flags: multiRes.combined_flags,
        explanation: `Multimodal content analyzed. Decision: ${multiRes.decision}`,
        status,
        decision: multiRes.decision,
        fileResults: {
          image: multiRes.results.image ? {
            is_safe: multiRes.results.image.is_safe,
            labels: multiRes.results.image.labels || [],
          } : undefined,
          audio: multiRes.results.audio ? {
            transcript: multiRes.results.audio.transcript || '',
            flags: multiRes.results.audio.flags || [],
          } : undefined,
        },
      };
    }

    const singleRes = apiResult as ModerationResponse;
    const status: 'safe' | 'warning' | 'unsafe' = 
      singleRes.safety_score >= 70 ? 'safe' :
      singleRes.safety_score >= 40 ? 'warning' : 'unsafe';
    
    return {
      safetyScore: singleRes.safety_score,
      flags: singleRes.flags,
      explanation: singleRes.explanation || `Content analyzed with ${(singleRes.confidence * 100).toFixed(0)}% confidence.`,
      status,
      decision: singleRes.decision,
      provider: singleRes.provider,
      processingTime: singleRes.processing_time_ms,
    };
  };

  const handleAnalyze = async () => {
    if (!content.trim() && !imageFile && !audioFile && !videoFile) return;

    setIsAnalyzing(true);
    setError(null);
    
    try {
      let apiResult;
      
      // Determine if we need multimodal analysis
      const hasMultipleInputs = (content.trim() ? 1 : 0) + (imageFile ? 1 : 0) + (audioFile ? 1 : 0) + (videoFile ? 1 : 0) > 1;
      
      if (hasMultipleInputs) {
        // Use multimodal endpoint
        apiResult = await moderationAPI.moderateMultimodal(
          content.trim() || undefined,
          imageFile || undefined,
          audioFile || undefined
        );
        setResult(transformResult(apiResult, true));
      } else if (videoFile) {
        // Video only - analyze frames using backend
        const videoRes = await moderationAPI.moderateVideo(videoFile);
        const status: 'safe' | 'warning' | 'unsafe' = 
          (videoRes.safety_score || 100) >= 70 ? 'safe' :
          (videoRes.safety_score || 100) >= 40 ? 'warning' : 'unsafe';
        
        const framesInfo = videoRes.video_info 
          ? `Analyzed ${videoRes.video_info.frames_analyzed} frames from ${videoRes.video_info.duration_seconds}s video.`
          : '';
        
        setResult({
          safetyScore: videoRes.safety_score || 100,
          flags: videoRes.flags || [],
          explanation: `Video "${videoFile.name}" analyzed. ${framesInfo}`,
          status,
          decision: videoRes.decision || 'ALLOW',
          provider: (videoRes as unknown as { provider?: string }).provider,
        });
      } else if (imageFile) {
        // Image only
        const imageRes = await moderationAPI.moderateImage(imageFile);
        setResult({
          safetyScore: imageRes.safety_score || 100,
          flags: (imageRes as unknown as { flags?: string[] }).flags || [],
          explanation: `Image "${imageFile.name}" analyzed.`,
          status: (imageRes as unknown as { is_safe?: boolean }).is_safe !== false ? 'safe' : 'unsafe',
          decision: (imageRes as unknown as { is_safe?: boolean }).is_safe !== false ? 'ALLOW' : 'FLAG',
        });
      } else if (audioFile) {
        // Audio only
        const audioRes = await moderationAPI.moderateAudio(audioFile);
        setResult({
          safetyScore: audioRes.safety_score || 100,
          flags: (audioRes as unknown as { flags?: string[] }).flags || [],
          explanation: audioRes.transcript 
            ? `Audio transcribed: "${audioRes.transcript.substring(0, 100)}${audioRes.transcript.length > 100 ? '...' : ''}"`
            : `Audio "${audioFile.name}" analyzed.`,
          status: 'safe',
          decision: (audioRes as unknown as { decision?: string }).decision || 'ALLOW',
        });
      } else {
        // Text only
        apiResult = await moderationAPI.moderateText(content);
        setResult(transformResult(apiResult));
      }
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError('Failed to analyze content. Please try again.');
      }
      console.error('Moderation error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClear = () => {
    setContent('');
    setResult(null);
    setError(null);
    setImageFile(null);
    setAudioFile(null);
    setVideoFile(null);
  };

  const getStatusIcon = (status: ModerationResult['status']) => {
    switch (status) {
      case 'safe':
        return <CheckCircle className="h-6 w-6 text-emerald-500" />;
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-amber-500" />;
      case 'unsafe':
        return <XCircle className="h-6 w-6 text-rose-500" />;
    }
  };

  const getStatusLabel = (status: ModerationResult['status']) => {
    switch (status) {
      case 'safe':
        return 'Content Approved';
      case 'warning':
        return 'Review Recommended';
      case 'unsafe':
        return 'Content Flagged';
    }
  };

  const getStatusColor = (status: ModerationResult['status']) => {
    switch (status) {
      case 'safe':
        return 'bg-emerald-500/10 border-emerald-500/20';
      case 'warning':
        return 'bg-amber-500/10 border-amber-500/20';
      case 'unsafe':
        return 'bg-rose-500/10 border-rose-500/20';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold mb-2">Content Moderation</h2>
          <p className="text-muted-foreground">
            Analyze your content for safety and policy compliance using AI.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive">
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Content to Analyze</CardTitle>
            <CardDescription>
              Enter text, upload images, audio, or video for comprehensive moderation analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="moderation-content">Text Content</Label>
              <Textarea
                id="moderation-content"
                placeholder="Enter the content you want to analyze..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                className="resize-none"
              />
            </div>

            {/* File Upload Areas */}
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Image Upload */}
              <div 
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
                  imageFile 
                    ? 'border-primary bg-primary/5' 
                    : 'border-primary/20 hover:border-primary/40'
                }`}
                onClick={() => imageInputRef.current?.click()}
              >
                <input
                  ref={imageInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
                {imageFile ? (
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageFile(null);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    <FileImage className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <p className="text-sm font-medium truncate">{imageFile.name}</p>
                  </div>
                ) : (
                  <>
                    <FileImage className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">Upload Image</p>
                    <Button variant="outline" size="sm">Browse</Button>
                  </>
                )}
              </div>

              {/* Audio Upload */}
              <div 
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
                  audioFile 
                    ? 'border-primary bg-primary/5' 
                    : 'border-primary/20 hover:border-primary/40'
                }`}
                onClick={() => audioInputRef.current?.click()}
              >
                <input
                  ref={audioInputRef}
                  type="file"
                  className="hidden"
                  accept="audio/*"
                  onChange={handleAudioUpload}
                />
                {audioFile ? (
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAudioFile(null);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    <Music className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <p className="text-sm font-medium truncate">{audioFile.name}</p>
                  </div>
                ) : (
                  <>
                    <Music className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">Upload Audio</p>
                    <Button variant="outline" size="sm">Browse</Button>
                  </>
                )}
              </div>
            </div>

            {/* Video Upload */}
            <div className="mt-4">
              <div 
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
                  videoFile 
                    ? 'border-primary bg-primary/5' 
                    : 'border-primary/20 hover:border-primary/40'
                }`}
                onClick={() => videoInputRef.current?.click()}
              >
                <input
                  ref={videoInputRef}
                  type="file"
                  className="hidden"
                  accept="video/*"
                  onChange={handleVideoUpload}
                />
                {videoFile ? (
                  <div className="relative inline-block">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        setVideoFile(null);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    <Video className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <p className="text-sm font-medium truncate">{videoFile.name}</p>
                  </div>
                ) : (
                  <>
                    <Video className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">Upload Video</p>
                    <p className="text-xs text-muted-foreground mb-2">(Video moderation extracts frames for analysis)</p>
                    <Button variant="outline" size="sm">Browse</Button>
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="hero"
                onClick={handleAnalyze}
                disabled={isAnalyzing || (!content.trim() && !imageFile && !audioFile && !videoFile)}
              >
                {isAnalyzing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Analyze Content
              </Button>
              {(content || result || imageFile || audioFile || videoFile) && (
                <Button variant="outline" onClick={handleClear}>
                  Clear All
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Moderation Results</CardTitle>
              <CardDescription>
                Analysis results for your submitted content
                {result.provider && (
                  <span className="ml-2 text-xs bg-primary/10 px-2 py-0.5 rounded inline-flex items-center gap-1">
                    <Cpu className="h-3 w-3" />
                    {result.provider}
                  </span>
                )}
                {result.processingTime && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({result.processingTime}ms)
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Status */}
              <div className={`flex items-center gap-4 p-4 rounded-xl border ${getStatusColor(result.status)}`}>
                {getStatusIcon(result.status)}
                <div className="flex-1">
                  <p className="font-semibold">{getStatusLabel(result.status)}</p>
                  <p className="text-sm text-muted-foreground">
                    Safety Score: {result.safetyScore}/100 • Decision: {result.decision}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{result.safetyScore}%</div>
                  <div className="text-xs text-muted-foreground">Safe</div>
                </div>
              </div>

              {/* Safety Score Bar */}
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Safety Meter</Label>
                <div className="mt-2 h-3 bg-primary/10 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      result.safetyScore >= 70 ? 'bg-emerald-500' :
                      result.safetyScore >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${result.safetyScore}%` }}
                  />
                </div>
              </div>

              {/* Flags */}
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Detected Flags</Label>
                <div className="mt-2">
                  {result.flags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {result.flags.map((flag, index) => (
                        <span
                          key={index}
                          className="text-sm px-3 py-1 rounded-lg bg-destructive/10 text-destructive border border-destructive/20"
                        >
                          {flag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No flags detected ✓</p>
                  )}
                </div>
              </div>

              {/* Explanation */}
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Analysis Details</Label>
                <p className="mt-2 text-sm p-4 rounded-xl bg-primary/5">
                  {result.explanation}
                </p>
              </div>

              {/* File-specific results */}
              {result.fileResults?.audio?.transcript && (
                <div>
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Audio Transcript</Label>
                  <p className="mt-2 text-sm p-4 rounded-xl bg-primary/5 italic">
                    "{result.fileResults.audio.transcript}"
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!result && !content && !imageFile && !audioFile && !videoFile && (
          <EmptyState
            icon={<Shield className="h-8 w-8" />}
            title="No content to analyze"
            description="Enter text or upload content above to run AI-powered moderation analysis."
          />
        )}
      </div>
    </DashboardLayout>
  );
}
