import { Eye } from 'lucide-react';

export function Header() {
  return (
    <header className="border-b">
      {/* Adjusted padding for responsiveness */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center gap-2">
        <Eye className="h-5 w-5 sm:h-6 sm:w-6 text-primary" /> {/* Responsive icon size */}
        <h1 className="text-lg sm:text-xl font-semibold text-foreground">Klutz Content Heatmap</h1> {/* Changed title, Responsive text size */}
      </div>
    </header>
  );
}
