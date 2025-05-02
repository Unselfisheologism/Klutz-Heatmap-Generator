import { Header } from '@/components/header';
import { AttentionAnalyzer } from '@/components/attention-analyzer';

export default function Home() {
  return (
    // Add relative positioning and isolation context
    <div className="flex flex-col min-h-screen relative isolate">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 z-10"> {/* Ensure main content has higher z-index than glows */}
        <AttentionAnalyzer />
      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground z-10"> {/* Ensure footer content has higher z-index */}
        Built with Next.js and Puter.js AI {/* Updated footer text */}
      </footer>
    </div>
  );
}
