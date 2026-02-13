import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import DisplayCards from "@/components/ui/display-cards";
import { StepCard } from '@/components/shared/StepCard';
import { Wand2, Shield, ArrowRight, Monitor, Database, Globe, Layers, TrendingUp, CalendarDays } from 'lucide-react';
import DatabaseWithRestApi from '@/components/ui/database-with-rest-api';



const steps = [
  {
    number: 1,
    title: 'Draft & Enhance',
    description: 'Input your idea. Our AI Studio generates captions, hashtags, and summaries instantly.',
  },
  {
    number: 2,
    title: 'Deep Moderation',
    description: 'Local AI models (NudeNet + CLIP) analyze content for safety and compliance locally.',
  },
  {
    number: 3,
    title: 'Localize & Schedule',
    description: 'Translate to 8+ Indian languages and schedule for Twitter, LinkedIn, & Instagram.',
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 lg:py-32">
          <div className="container-wide">
            <div className="max-w-3xl mx-auto text-center animate-slide-up">
              <h1 className="text-4xl lg:text-6xl font-bold mb-6 tracking-tight">
                Content Room 
              </h1>
              <p className="text-lg lg:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
                Create, moderate, and schedule content with intelligent AI assistance. 
                Streamline your workflow and reach audiences in their native language.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild variant="hero" size="xl">
                  <Link to="/register">
                    Get Started
                    <ArrowRight className="h-5 w-5 ml-1" />
                  </Link>
                </Button>
                <Button asChild variant="hero-outline" size="xl">
                  <Link to="/login">Login</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 border-t border-primary/10">
          <div className="container-wide">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                Everything You Need for Content Excellence
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                A complete suite of AI-powered tools to transform how your team creates and manages content.
              </p>
            </div>
            <div className="flex min-h-[400px] w-full items-center justify-center py-10">
              <div className="w-full max-w-3xl">
                <DisplayCards cards={[
                  {
                    icon: <TrendingUp className="size-5 text-blue-300" />,
                    title: "Competitor Intel",
                    description: "Analyze strategies & gaps",
                    date: "New",
                    iconClassName: "text-blue-500",
                    titleClassName: "text-blue-500",
                    className: "[grid-area:stack] hover:-translate-y-10 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
                  },
                  {
                    icon: <CalendarDays className="size-5 text-purple-300" />,
                    title: "Content Calendar",
                    description: "AI-planned schedule",
                    date: "Featured",
                    iconClassName: "text-purple-500",
                    titleClassName: "text-purple-500",
                    className: "[grid-area:stack] translate-x-12 translate-y-10 hover:-translate-y-1 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
                  },
                  {
                    icon: <Shield className="size-5 text-emerald-400" />,
                    title: "Smart Moderation",
                    description: "Automated safety checks",
                    date: "Real-time",
                    iconClassName: "text-emerald-500",
                    titleClassName: "text-emerald-500",
                    className: "[grid-area:stack] translate-x-24 translate-y-20 hover:translate-y-10",
                  },
                ]} />
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 border-t border-primary/10">
          <div className="container-wide">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                Workflow
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                From idea to publishing, streamlined instructions.
              </p>
            </div>
            <div className="max-w-2xl mx-auto space-y-8">
              {steps.map((step) => (
                <StepCard
                  key={step.number}
                  number={step.number}
                  title={step.title}
                  description={step.description}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Powered by Technology Section */}
        <section className="py-20 border-t border-primary/10">
          <div className="container-wide">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl lg:text-4xl font-bold mb-6">
                  Intelligent Architecture
                </h2>
                <p className="text-lg text-muted-foreground mb-8">
                  Built with a powerful ensemble of AI models and a robust backend to ensure seamless data exchange and processing.
                </p>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary mt-1">
                      <Database className="size-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Secure Data Flow</h3>
                      <p className="text-muted-foreground">Encrypted REST APIs handling your content securely.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                     <div className="p-2 rounded-lg bg-primary/10 text-primary mt-1">
                      <Globe className="size-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Local Intelligence</h3>
                      <p className="text-muted-foreground">Offline-first moderation and translation engines.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-center">
                <div className="p-6 rounded-2xl bg-muted/30 border border-primary/10 w-full flex justify-center">
                  <DatabaseWithRestApi 
                    title="ContentOS Engine"
                    circleText="API"
                    badgeTexts={{
                      first: "Studio",
                      second: "Safety",
                      third: "Lang",
                      fourth: "Social"
                    }}
                    buttonTexts={{
                      first: "FastAPI",
                      second: "React"
                    }}
                  />
                </div>
              </div>
             </div>
          </div>
        </section>

        {/* Dashboard Preview Section */}
        <section className="py-20 border-t border-primary/10">
          <div className="container-wide">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                Powerful Dashboard
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Manage all your content operations from a single, intuitive interface.
              </p>
            </div>
            <div className="max-w-4xl mx-auto">
              <div className="aspect-video rounded-2xl border border-primary/10 bg-card shadow-large flex items-center justify-center">
                <div className="text-center">
                  <div className="h-16 w-16 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto mb-4">
                    <Wand2 className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">Dashboard Preview</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 border-t border-primary/10">
          <div className="container-wide">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                Ready to Transform Your Content Workflow?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Join teams who are already using Content Room to streamline their content operations.
              </p>
              <Button asChild variant="hero" size="xl">
                <Link to="/register">
                  Get Started Free
                  <ArrowRight className="h-5 w-5 ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
