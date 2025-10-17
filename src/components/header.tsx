import { Recycle, Award } from 'lucide-react';

type HeaderProps = {
  points: number;
};

export function Header({ points }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 flex items-center">
          <Recycle className="h-8 w-8 text-primary" />
          <span className="ml-3 text-xl font-bold font-headline">EcoScan Rewards</span>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <div className="flex items-center space-x-2 rounded-full border bg-card px-4 py-2 shadow-sm">
            <Award className="h-6 w-6 text-yellow-500" />
            <span className="text-lg font-bold">{points}</span>
            <span className="text-sm text-muted-foreground hidden sm:inline-block">Points</span>
          </div>
        </div>
      </div>
    </header>
  );
}
