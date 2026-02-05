import { useState, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/shared/EmptyState';
import { Upload, FileText, Image, Music, Video, Wand2, Hash, FileSignature, Loader2, Sparkles, Copy, Check } from 'lucide-react';
import { creationAPI, APIError } from '@/services/api';

type ContentType = 'text' | 'image' | 'audio' | 'video' | null;

interface GeneratedContent {
  caption?: string;
  summary?: string;
  hashtags?: string[];
  provider?: string;
}

export default function Studio() {
  const [selectedType, setSelectedType] = useState<ContentType>(null);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingType, setProcessingType] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const contentTypes = [
    { type: 'text' as const, icon: FileText, label: 'Text', description: 'Articles, posts, captions' },
    { type: 'image' as const, icon: Image, label: 'Image', description: 'Photos, graphics' },
    { type: 'audio' as const, icon: Music, label: 'Audio', description: 'Podcasts, recordings' },
    { type: 'video' as const, icon: Video, label: 'Video', description: 'Clips, reels' },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      // For non-text content, we could transcribe or describe it first
      // For now, user can enter description for the content
    }
  };

  const handleGenerate = async (generationType: 'caption' | 'summary' | 'hashtags') => {
    if (!inputText.trim()) return;
    
    setIsProcessing(true);
    setProcessingType(generationType);
    setError(null);
    
    try {
      let result;
      
      switch (generationType) {
        case 'caption':
          const captionRes = await creationAPI.generateCaption(inputText, selectedType || 'text');
          result = { caption: captionRes.result, provider: captionRes.provider };
          break;
        case 'summary':
          const summaryRes = await creationAPI.generateSummary(inputText);
          result = { summary: summaryRes.result, provider: summaryRes.provider };
          break;
        case 'hashtags':
          const hashtagsRes = await creationAPI.generateHashtags(inputText, 8);
          result = { hashtags: hashtagsRes.hashtags, provider: hashtagsRes.provider };
          break;
      }

      setGeneratedContent((prev) => ({
        ...prev,
        ...result,
      }));
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError('Failed to generate content. Please try again.');
      }
      console.error('Generation error:', err);
    } finally {
      setIsProcessing(false);
      setProcessingType(null);
    }
  };

  const handleGenerateAll = async () => {
    if (!inputText.trim()) return;
    
    setIsProcessing(true);
    setProcessingType('all');
    setError(null);
    
    try {
      // Generate all content types in parallel
      const [captionRes, summaryRes, hashtagsRes] = await Promise.all([
        creationAPI.generateCaption(inputText, selectedType || 'text'),
        creationAPI.generateSummary(inputText),
        creationAPI.generateHashtags(inputText, 8),
      ]);

      setGeneratedContent({
        caption: captionRes.result,
        summary: summaryRes.result,
        hashtags: hashtagsRes.hashtags,
        provider: captionRes.provider,
      });
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError('Failed to generate content. Please try again.');
      }
      console.error('Generation error:', err);
    } finally {
      setIsProcessing(false);
      setProcessingType(null);
    }
  };

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSave = () => {
    // In production, this would save to the database
    setGeneratedContent(null);
    setInputText('');
    setSelectedType(null);
    setUploadedFile(null);
  };

  const handleClear = () => {
    setGeneratedContent(null);
    setError(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold mb-2">Creator Studio</h2>
          <p className="text-muted-foreground">
            Upload content and generate AI-powered captions, summaries, and hashtags.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive">
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Content Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Content Type</CardTitle>
            <CardDescription>Choose the type of content you want to process</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {contentTypes.map(({ type, icon: Icon, label, description }) => (
                <button
                  key={type}
                  onClick={() => {
                    setSelectedType(type);
                    setUploadedFile(null);
                  }}
                  className={`p-4 rounded-xl border transition-all text-left ${
                    selectedType === type
                      ? 'border-primary bg-primary/5 shadow-soft'
                      : 'border-primary/10 hover:border-primary/30 hover:bg-primary/5'
                  }`}
                >
                  <Icon className="h-6 w-6 mb-2" />
                  <span className="text-sm font-medium block">{label}</span>
                  <span className="text-xs text-muted-foreground">{description}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Input Area */}
        {selectedType && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upload {selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}</CardTitle>
              <CardDescription>
                {selectedType === 'text' 
                  ? 'Enter or paste your text content below'
                  : `Upload your ${selectedType} file and add a description`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedType !== 'text' && (
                <div 
                  className="border-2 border-dashed border-primary/20 rounded-xl p-8 text-center hover:border-primary/40 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept={
                      selectedType === 'image' ? 'image/*' :
                      selectedType === 'audio' ? 'audio/*' :
                      selectedType === 'video' ? 'video/*' : '*'
                    }
                    onChange={handleFileUpload}
                  />
                  {uploadedFile ? (
                    <>
                      <Check className="h-10 w-10 mx-auto mb-4 text-primary" />
                      <p className="text-sm font-medium mb-2">{uploadedFile.name}</p>
                      <p className="text-xs text-muted-foreground">Click to change file</p>
                    </>
                  ) : (
                    <>
                      <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Drag and drop your {selectedType} file here
                      </p>
                      <Button variant="outline" size="sm">
                        Browse files
                      </Button>
                    </>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="content">
                  {selectedType === 'text' ? 'Content' : 'Description / Context'}
                </Label>
                <Textarea
                  id="content"
                  placeholder={
                    selectedType === 'text'
                      ? 'Enter your text content here...'
                      : 'Describe your content for better AI generation...'
                  }
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  rows={6}
                  className="resize-none"
                />
              </div>

              {/* Generation Actions */}
              <div className="flex flex-wrap gap-3 pt-4">
                <Button
                  variant="hero"
                  onClick={handleGenerateAll}
                  disabled={isProcessing || !inputText.trim()}
                >
                  {processingType === 'all' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Generate All
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleGenerate('caption')}
                  disabled={isProcessing || !inputText.trim()}
                >
                  {processingType === 'caption' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
                  Caption
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleGenerate('summary')}
                  disabled={isProcessing || !inputText.trim()}
                >
                  {processingType === 'summary' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSignature className="h-4 w-4 mr-2" />}
                  Summary
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleGenerate('hashtags')}
                  disabled={isProcessing || !inputText.trim()}
                >
                  {processingType === 'hashtags' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Hash className="h-4 w-4 mr-2" />}
                  Hashtags
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Generated Outputs */}
        {generatedContent && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Generated Content</CardTitle>
                  <CardDescription>
                    Review and save your AI-generated content
                    {generatedContent.provider && (
                      <span className="ml-2 text-xs bg-primary/10 px-2 py-0.5 rounded">
                        via {generatedContent.provider}
                      </span>
                    )}
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={handleClear}>
                  Clear
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {generatedContent.caption && (
                <div className="p-4 rounded-xl bg-primary/5 group">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">Caption</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-8"
                      onClick={() => handleCopy(generatedContent.caption!, 'caption')}
                    >
                      {copiedField === 'caption' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{generatedContent.caption}</p>
                </div>
              )}
              {generatedContent.summary && (
                <div className="p-4 rounded-xl bg-primary/5 group">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">Summary</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-8"
                      onClick={() => handleCopy(generatedContent.summary!, 'summary')}
                    >
                      {copiedField === 'summary' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{generatedContent.summary}</p>
                </div>
              )}
              {generatedContent.hashtags && generatedContent.hashtags.length > 0 && (
                <div className="p-4 rounded-xl bg-primary/5 group">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">Hashtags</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-8"
                      onClick={() => handleCopy(generatedContent.hashtags!.join(' '), 'hashtags')}
                    >
                      {copiedField === 'hashtags' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {generatedContent.hashtags.map((tag, index) => (
                      <span key={index} className="text-sm px-3 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors cursor-pointer">
                        {tag.startsWith('#') ? tag : `#${tag}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <Button variant="hero" onClick={handleSave}>
                Save Content
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!selectedType && (
          <EmptyState
            icon={<Wand2 className="h-8 w-8" />}
            title="No content selected"
            description="Select a content type above to start generating AI-powered captions, summaries, and hashtags."
          />
        )}
      </div>
    </DashboardLayout>
  );
}
