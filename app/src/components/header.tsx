
import { Recycle, Settings, Award, User, LogIn, BookCopy } from 'lucide-react';
import { Button } from './ui/button';
import type { Step } from './app-container';
import { useTranslation } from '@/hooks/use-translation';
import { useUser } from '@/firebase';

type HeaderProps = {
  points: number;
  onNavigate: (step: Step) => void;
  onShowSettings: () => void;
};

export function Header({ points, onNavigate, onShowSettings }: HeaderProps) {
  const { t } = useTranslation();
  const { user } = useUser();

  const isRealUser = user && !user.isAnonymous;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        {/* Logo / title */}
        <div
          className="mr-4 flex cursor-pointer items-center transition-opacity hover:opacity-80"
          onClick={() => onNavigate('scan')}
          aria-label="Back to home"
        >
          <Recycle className="h-8 w-8 text-primary" />
          <span className="ml-3 text-xl font-bold font-headline">
            {t('header_title')}
          </span>
        </div>

        <div className="flex flex-1 items-center justify-end space-x-2">
          {/* Points pill */}
          <div className="flex items-center space-x-2 rounded-full border bg-card px-4 py-2 shadow-sm">
            <Award className="h-6 w-6 text-yellow-500" />
            <span className="text-lg font-bold">{points}</span>
            <span className="text-sm text-muted-foreground hidden sm:inline-block">
              {t('header_points')}
            </span>
          </div>

          {/* Profile / Login */}
          {isRealUser ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onNavigate('profile')}
            >
              <User />
              <span className="sr-only">Profile</span>
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onNavigate('scan')}
            >
              <LogIn />
              <span className="sr-only">Sign In</span>
            </Button>
          )}

          {/* Guide Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onNavigate('guide')}
          >
            <BookCopy />
            <span className="sr-only">App Guide</span>
          </Button>
          
          {/* Settings */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onShowSettings}
          >
            <Settings />
            <span className="sr-only">Settings</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
