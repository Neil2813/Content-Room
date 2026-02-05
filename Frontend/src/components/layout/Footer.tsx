import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t border-primary/10 bg-background">
      <div className="container-wide py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">CF</span>
              </div>
              <span className="font-semibold text-lg">ContentFlow</span>
            </div>
            <p className="text-sm text-muted-foreground">
              AI-powered content creation, moderation, and scheduling for modern teams.
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/" className="hover:text-foreground transition-colors">Features</Link></li>
              <li><Link to="/" className="hover:text-foreground transition-colors">Pricing</Link></li>
              <li><Link to="/" className="hover:text-foreground transition-colors">Security</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/" className="hover:text-foreground transition-colors">About</Link></li>
              <li><Link to="/" className="hover:text-foreground transition-colors">Blog</Link></li>
              <li><Link to="/" className="hover:text-foreground transition-colors">Careers</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/" className="hover:text-foreground transition-colors">Privacy</Link></li>
              <li><Link to="/" className="hover:text-foreground transition-colors">Terms</Link></li>
              <li><Link to="/" className="hover:text-foreground transition-colors">Cookie Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-primary/10">
          <p className="text-sm text-muted-foreground text-center">
            © {new Date().getFullYear()} ContentFlow. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
