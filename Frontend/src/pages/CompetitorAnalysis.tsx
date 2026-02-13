import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Search, TrendingUp, AlertCircle, Lightbulb } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import api, { APIError } from '@/services/api';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

const CompetitorAnalysis: React.FC = () => {
    const [url, setUrl] = useState('');
    const [niche, setNiche] = useState('');
    const [loading, setLoading] = useState(false);
    const [analysis, setAnalysis] = useState<string | null>(null);

    const handleAnalyze = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url || !niche) {
            toast.error("Please provide both a URL and your niche.");
            return;
        }

        setLoading(true);
        setAnalysis(null);

        try {
            const response = await api.competitor.analyze(url, niche);
            setAnalysis(response.analysis);
            toast.success("Analysis complete!");
        } catch (error) {
            console.error(error);
            
            // Handle specific API errors
            if (error instanceof APIError) {
                if (error.status === 401) {
                    toast.error("Please log in to analyze competitors.");
                } else if (error.status === 403) {
                    toast.error("You don't have permission to access this feature.");
                } else {
                    toast.error(error.message || "Failed to analyze competitor. Please try again.");
                }
            } else {
                toast.error("Failed to analyze competitor. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Competitor Intelligence</h1>
                <p className="text-muted-foreground">
                    Analyze competitor profiles to find content gaps and opportunities for your niche.
                </p>
            </div>

            <Card className="max-w-3xl">
                <CardHeader>
                    <CardTitle>Analyze a Competitor</CardTitle>
                    <CardDescription>
                        Enter a public social media profile URL or blog link to uncover their strategy.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAnalyze} className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="url">Competitor URL</Label>
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                        id="url" 
                                        placeholder="https://twitter.com/competitor" 
                                        className="pl-9"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        disabled={loading}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="niche">My Niche</Label>
                                <Input 
                                    id="niche" 
                                    placeholder="e.g. Sustainable Fashion" 
                                    value={niche}
                                    onChange={(e) => setNiche(e.target.value)}
                                    disabled={loading}
                                />
                            </div>
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Analyzing Strategy...
                                </>
                            ) : (
                                <>
                                    <TrendingUp className="mr-2 h-4 w-4" />
                                    Identify Gaps & Opportunities
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {analysis && (
                <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
                    <Card className="lg:col-span-3 border-primary/20">
                        <CardHeader className="bg-primary/5">
                            <CardTitle className="flex items-center gap-2 text-primary">
                                <Lightbulb className="h-5 w-5" />
                                Strategic Insights
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <article className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-primary prose-a:text-blue-500">
                                <ReactMarkdown>{analysis}</ReactMarkdown>
                            </article>
                        </CardContent>
                    </Card>
                </div>
            )}
            </div>
        </DashboardLayout>
    );
};

export default CompetitorAnalysis;
