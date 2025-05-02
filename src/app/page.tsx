import { Header } from '@/components/header';
import { AttentionAnalyzer } from '@/components/attention-analyzer';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <AttentionAnalyzer />
      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground">
        Built with Next.js and Puter.js AI {/* Updated footer text */}
      </footer>
    </div>
  );
}
