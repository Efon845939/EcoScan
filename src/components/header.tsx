import { Recycle, BookOpen, Settings } from 'lucide-react';
import { Button } from './ui/button';
import type { Step } from './app-container';
import { useTranslation } from '@/hooks/use-translation';

type HeaderProps = {
  onNavigate: (step: Step) => void;
  onShowSettings: () => void;
};

export function Header({ onNavigate, onShowSettings }: HeaderProps) {
  const { t } = useTranslation();
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div
          className="mr-4 flex cursor-pointer items-center transition-opacity hover:opacity-80"
          onClick={() => onNavigate('scan')}
          aria-label="Back to home"
        >
          <Recycle className="h-8 w-8 text-primary" />
          <span className="ml-3 text-xl font-bold font-headline">{t('header_title')}</span>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <Button variant="ghost" size="icon" onClick={onShowSettings}>
              <Settings />
              <span className="sr-only">Settings</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
