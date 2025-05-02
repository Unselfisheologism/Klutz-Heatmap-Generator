import { Header } from '@/components/header';
import { AttentionAnalyzer } from '@/components/attention-analyzer';

export default function Home() {
  return (
    // Add relative positioning and isolation context
    <div className="flex flex-col min-h-screen relative isolate">
      <Header />
      {/* Adjusted padding for better spacing on mobile and larger screens */}
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 z-10"> {/* Ensure main content has higher z-index than glows */}
        <AttentionAnalyzer />
      </main>
      <footer className="py-4 text-center text-xs sm:text-sm text-muted-foreground z-10"> {/* Ensure footer content has higher z-index, responsive text size */}
        © 2025 Klutz. All rights reserved. {/* Updated footer text */}
      </footer>
    </div>
  );
}
