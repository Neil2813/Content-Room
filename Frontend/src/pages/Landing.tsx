import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { FeatureCard } from '@/components/shared/FeatureCard';
import { StepCard } from '@/components/shared/StepCard';
import { Wand2, Shield, Calendar, Globe, ArrowRight } from 'lucide-react';

const features = [
  {
    icon: <Wand2 className="h-6 w-6" />,
    title: 'AI Content Creation',
    description: 'Generate captions, summaries, and hashtags with advanced AI. Transform your content workflow.',
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: 'Smart Moderation',
    description: 'Automated content safety analysis with detailed scoring and flag detection.',
  },
  {
    icon: <Calendar className="h-6 w-6" />,
    title: 'Intelligent Scheduling',
    description: 'Plan and schedule your content across platforms with an intuitive calendar interface.',
  },
  {
    icon: <Globe className="h-6 w-6" />,
    title: 'Multilingual Support',
    description: 'Create and manage content in multiple Indian languages with native font support.',
  },
];

const steps = [
  {
    number: 1,
    title: 'Upload Your Content',
    description: 'Import text, images, audio, or video files to the platform.',
  },
  {
    number: 2,
    title: 'AI Processes & Enhances',
    description: 'Our AI generates captions, moderates content, and prepares optimized outputs.',
  },
  {
    number: 3,
    title: 'Schedule & Publish',
    description: 'Set your publishing schedule and let ContentFlow handle the rest.',
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
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <FeatureCard
                  key={index}
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                />
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 border-t border-primary/10">
          <div className="container-wide">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                How It Works
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Get started in minutes with our simple three-step process.
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

        {/* Screenshot Placeholder Section */}
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
                Join teams who are already using ContentFlow to streamline their content operations.
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
