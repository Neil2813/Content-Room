import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Calendar as CalendarIcon, Download } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '@/services/api';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

const ContentCalendar: React.FC = () => {
    const [month, setMonth] = useState('March');
    const [year, setYear] = useState('2026');
    const [niche, setNiche] = useState('');
    const [goals, setGoals] = useState('Engage with audience and promote services');
    const [loading, setLoading] = useState(false);
    const [calendar, setCalendar] = useState<string | null>(null);

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!niche) {
            toast.error("Please specify your niche.");
            return;
        }

        setLoading(true);
        setCalendar(null);

        try {
            const response = await api.calendar.generate({
                month,
                year: parseInt(year),
                niche,
                goals
            });
            setCalendar(response.calendar_markdown);
            toast.success("Calendar generated successfully!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate calendar. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = () => {
        if (!calendar) return;
        const blob = new Blob([calendar], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Content-Calendar-${month}-${year}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <DashboardLayout>
            <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">AI Content Calendar</h1>
                <p className="text-muted-foreground">
                    Generate a month-long content strategy tailored to Indian festivals and your niche.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
                <Card>
                    <CardHeader>
                        <CardTitle>Plan Your Month</CardTitle>
                        <CardDescription>Select the timeframe and goals.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleGenerate} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="month">Month</Label>
                                <Select value={month} onValueChange={setMonth}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Month" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {['January', 'February', 'March', 'April', 'May', 'June', 
                                          'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                                            <SelectItem key={m} value={m}>{m}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="year">Year</Label>
                                <Input 
                                    id="year" 
                                    type="number" 
                                    value={year} 
                                    onChange={(e) => setYear(e.target.value)} 
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="niche">My Niche</Label>
                                <Input 
                                    id="niche" 
                                    placeholder="e.g. Finance for Millennials" 
                                    value={niche}
                                    onChange={(e) => setNiche(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="goals">Content Goals</Label>
                                <Input 
                                    id="goals" 
                                    placeholder="e.g. Increase engagement" 
                                    value={goals}
                                    onChange={(e) => setGoals(e.target.value)}
                                />
                            </div>

                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        Generate Plan
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {calendar ? (
                    <Card className="h-full">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Your Calendar</CardTitle>
                            <Button variant="outline" size="sm" onClick={handleDownload}>
                                <Download className="mr-2 h-4 w-4" />
                                Download .md
                            </Button>
                        </CardHeader>
                        <CardContent className="max-h-[600px] overflow-y-auto">
                            <article className="prose prose-sm dark:prose-invert max-w-none prose-table:border-collapse prose-th:px-4 prose-th:py-2 prose-td:px-4 prose-td:py-2 prose-tr:border-b prose-th:text-primary prose-th:uppercase prose-th:text-xs prose-th:font-bold prose-th:bg-muted/50 rounded-lg border">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        table: ({ children }) => <table className="w-full text-sm">{children}</table>,
                                        thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
                                        tr: ({ children }) => <tr className="border-b transition-colors hover:bg-muted/50">{children}</tr>,
                                        th: ({ children }) => <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">{children}</th>,
                                        td: ({ children }) => <td className="p-4 align-middle">{children}</td>,
                                    }}
                                >
                                    {calendar}
                                </ReactMarkdown>
                            </article>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="flex items-center justify-center p-12 border-2 border-dashed rounded-lg bg-muted/50 h-full">
                        <div className="text-center space-y-2">
                            <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto" />
                            <h3 className="font-medium text-lg">No Calendar Generated</h3>
                            <p className="text-muted-foreground text-sm">
                                Fill in the details and click "Generate Plan" to see your AI-curated schedule.
                            </p>
                        </div>
                    </div>
                )}
            </div>
            </div>
        </DashboardLayout>
    );
};

export default ContentCalendar;
