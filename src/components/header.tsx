import { Eye } from 'lucide-react';

export function Header() {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex items-center gap-2">
        <Eye className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-semibold text-foreground">Attention Insights</h1>
      </div>
    </header>
  );
}
