import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/shared/EmptyState';
import { useToast } from '@/hooks/use-toast';
import { Languages, ArrowRight, Loader2, Copy, Check, RefreshCw, Sparkles, Globe } from 'lucide-react';
import { translationAPI, APIError } from '@/services/api';

interface Language {
  code: string;
  name: string;
  native?: string;
}

// Indian languages only (9 Indian languages + English)
const INDIAN_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'hi', name: 'Hindi', native: 'हिंदी' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ' },
];

export default function Translation() {
  const { toast } = useToast();
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('auto');
  const [targetLanguage, setTargetLanguage] = useState('hi');
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [provider, setProvider] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [languages, setLanguages] = useState<Language[]>(INDIAN_LANGUAGES);

  useEffect(() => {
    // Fetch supported languages from backend
    const fetchLanguages = async () => {
      try {
        const response = await translationAPI.getLanguages();
        if (response.languages && response.languages.length > 0) {
          setLanguages(response.languages);
        }
      } catch (error) {
        // Use default languages
        console.log('Using default languages');
      }
    };
    fetchLanguages();
  }, []);

  const handleTranslate = async () => {
    if (!sourceText.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter text to translate',
        variant: 'destructive',
      });
      return;
    }

    setIsTranslating(true);
    try {
      const response = await translationAPI.translate(
        sourceText.trim(),
        targetLanguage,
        sourceLanguage === 'auto' ? undefined : sourceLanguage
      );
      
      setTranslatedText(response.translated_text);
      setDetectedLanguage(response.source_language);
      setProvider(response.provider);
      
      toast({
        title: 'Translation complete',
        description: `Translated using ${response.provider}`,
      });
    } catch (error) {
      const apiError = error as APIError;
      toast({
        title: 'Translation failed',
        description: apiError.message || 'Failed to translate text',
        variant: 'destructive',
      });
    } finally {
      setIsTranslating(false);
    }
  };

  const handleDetectLanguage = async () => {
    if (!sourceText.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter text to detect language',
        variant: 'destructive',
      });
      return;
    }

    setIsDetecting(true);
    try {
      const response = await translationAPI.detectLanguage(sourceText.trim());
      setDetectedLanguage(response.language);
      setSourceLanguage(response.language);
      
      const langName = languages.find(l => l.code === response.language)?.name || response.language;
      toast({
        title: 'Language detected',
        description: `Detected: ${langName} (${Math.round(response.confidence * 100)}% confidence)`,
      });
    } catch (error) {
      const apiError = error as APIError;
      toast({
        title: 'Detection failed',
        description: apiError.message || 'Failed to detect language',
        variant: 'destructive',
      });
    } finally {
      setIsDetecting(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(translatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: 'Copied!',
      description: 'Translation copied to clipboard',
    });
  };

  const handleSwapLanguages = () => {
    if (sourceLanguage !== 'auto' && translatedText) {
      const tempLang = sourceLanguage;
      setSourceLanguage(targetLanguage);
      setTargetLanguage(tempLang);
      setSourceText(translatedText);
      setTranslatedText('');
    }
  };

  const handleClear = () => {
    setSourceText('');
    setTranslatedText('');
    setDetectedLanguage(null);
    setProvider('');
    setSourceLanguage('auto');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <Globe className="h-6 w-6 text-primary" />
              Translation
            </h2>
            <p className="text-muted-foreground">
              Translate your content across 50+ languages using AWS Translate with free fallbacks.
            </p>
          </div>
          {provider && (
            <div className="flex items-center gap-2 text-sm bg-muted/50 px-3 py-1.5 rounded-full border">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Provider:</span>
              <span className="font-medium">{provider}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Source Text */}
          <Card className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Source Text</CardTitle>
                  <CardDescription>Enter text to translate</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">
                        <span className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          Auto Detect
                        </span>
                      </SelectItem>
                      {languages.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          <span className="flex items-center gap-2">
                            {lang.name}
                            {lang.native && lang.native !== lang.name && (
                              <span className="text-muted-foreground text-xs">({lang.native})</span>
                            )}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDetectLanguage}
                    disabled={isDetecting || !sourceText.trim()}
                  >
                    {isDetecting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Languages className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder="Enter text to translate..."
                className="min-h-[200px] resize-none"
                maxLength={5000}
              />
              <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                <span>{sourceText.length}/5000 characters</span>
                {detectedLanguage && sourceLanguage === 'auto' && (
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Detected: {languages.find(l => l.code === detectedLanguage)?.name || detectedLanguage}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Translated Text */}
          <Card className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Translation</CardTitle>
                  <CardDescription>Translated content appears here</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          <span className="flex items-center gap-2">
                            {lang.name}
                            {lang.native && lang.native !== lang.name && (
                              <span className="text-muted-foreground text-xs">({lang.native})</span>
                            )}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    disabled={!translatedText}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {translatedText ? (
                <div className="min-h-[200px] p-3 bg-muted/30 rounded-md border">
                  <p className="whitespace-pre-wrap">{translatedText}</p>
                </div>
              ) : (
                <div className="min-h-[200px] flex items-center justify-center">
                  <EmptyState
                    title="No translation yet"
                    description="Enter text and click Translate"
                    icon={<Languages className="h-8 w-8" />}
                  />
                </div>
              )}
              {translatedText && (
                <div className="flex items-center justify-end mt-2 text-xs text-muted-foreground">
                  <span>{translatedText.length} characters</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            onClick={handleSwapLanguages}
            disabled={sourceLanguage === 'auto' || !translatedText}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Swap Languages
          </Button>
          
          <Button
            onClick={handleTranslate}
            disabled={isTranslating || !sourceText.trim()}
            className="gap-2 min-w-[140px]"
          >
            {isTranslating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Translating...
              </>
            ) : (
              <>
                <ArrowRight className="h-4 w-4" />
                Translate
              </>
            )}
          </Button>
          
          <Button
            variant="ghost"
            onClick={handleClear}
            disabled={!sourceText && !translatedText}
          >
            Clear All
          </Button>
        </div>

        {/* Provider Info */}
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Languages className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h4 className="font-medium mb-1">Translation Service</h4>
                <p className="text-sm text-muted-foreground">
                  Uses <strong>AWS Translate</strong> as the primary provider with <strong>Google Translate</strong> (via deep-translator) 
                  as a free fallback. Supports 75+ languages with high accuracy for professional content translation.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
