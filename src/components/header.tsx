import { Recycle, Award, BookOpen } from 'lucide-react';
import { Button } from './ui/button';
import type { Step } from './app-container';

type HeaderProps = {
  points: number;
  onNavigate: (step: Step) => void;
};

export function Header({ points, onNavigate }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div
          className="mr-4 flex cursor-pointer items-center transition-opacity hover:opacity-80"
          onClick={() => onNavigate('scan')}
          aria-label="Back to home"
        >
          <Recycle className="h-8 w-8 text-primary" />
          <span className="ml-3 text-xl font-bold font-headline">EcoScan Rewards</span>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <div className="flex items-center space-x-2 rounded-full border bg-card px-4 py-2 shadow-sm">
            <Award className="h-6 w-6 text-yellow-500" />
            <span className="text-lg font-bold">{points}</span>
            <span className="text-sm text-muted-foreground hidden sm:inline-block">Points</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onNavigate('guide')}>
              <BookOpen className="mr-2" />
              Guide
          </Button>
        </div>
      </div>
    </header>
  );
}
