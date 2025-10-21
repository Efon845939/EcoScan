'use client';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  Gift,
  Coffee,
  ShoppingCart,
  Ticket,
  Shirt,
  Footprints,
  Loader2,
} from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';
import { useFirebase, useUser, useDoc, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useState } from 'react';


type RewardsSectionProps = {
  userPoints: number;
  onBack: () => void;
};

type Reward = {
    id: string;
    title: string;
    partner: string;
    cost: number;
    icon: React.ElementType;
    imageId: string;
}

const rewards: Reward[] = [
  {
    id: 'free_coffee',
    title: 'Free Coffee',
    partner: 'The Daily Grind',
    cost: 500,
    icon: Coffee,
    imageId: 'reward-partner-1',
  },
  {
    id: 'groceries_5_off',
    title: '$5 Off Groceries',
    partner: 'Green Grocer',
    cost: 900,
    icon: ShoppingCart,
    imageId: 'reward-partner-2',
  },
  {
    id: 'clothes_10_off',
    title: '$10 Off Clothes',
    partner: 'Eco Threads',
    cost: 1200,
    icon: Shirt,
    imageId: 'reward-partner-3',
  },
  {
    id: 'movie_ticket',
    title: 'Free Movie Ticket',
    partner: 'Cineplex Green',
    cost: 1600,
    icon: Ticket,
    imageId: 'reward-partner-4',
  },
  {
    id: 'shoes_15_off',
    title: '$15 Off Shoes',
    partner: 'Sustainable Soles',
    cost: 2000,
    icon: Footprints,
    imageId: 'reward-partner-5',
  },
];

export function RewardsSection({ userPoints, onBack }: RewardsSectionProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { firestore } = useFirebase();
  const { user } = useUser();
  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  
  const handleRedeemClick = (reward: Reward) => {
    if (userPoints < reward.cost) {
       toast({
        variant: 'destructive',
        title: t('toast_not_enough_points_title'),
        description: t('toast_not_enough_points_description', { points: reward.cost }),
      });
      return;
    }
    setSelectedReward(reward);
    setShowConfirmDialog(true);
  };

  const confirmRedeem = () => {
    if (!selectedReward || !userProfileRef) return;
    setIsRedeeming(true);

    const cost = selectedReward.cost;
    const title = t(`rewards.${selectedReward.id}.title`);

    updateDocumentNonBlocking(userProfileRef, { totalPoints: userPoints - cost });
    toast({
        title: t('toast_reward_redeemed_title'),
        description: t('toast_reward_redeemed_description', { title }),
    });

    setIsRedeeming(false);
    setShowConfirmDialog(false);
    setSelectedReward(null);
  };

  return (
    <>
    <Card className="w-full">
      <CardHeader>
        <div className="relative flex items-center justify-center">
          <Button
            variant="ghost"
            size="sm"
            className="absolute left-0"
            onClick={onBack}
          >
            <ChevronLeft className="mr-2 h-4 w-4" /> {t('camera_back_button')}
          </Button>
          <CardTitle className="font-headline text-2xl flex items-center gap-2">
            <Gift className="h-6 w-6 text-primary" />
            {t('rewards_title')}
          </CardTitle>
        </div>
        <CardDescription className="text-center pt-2">
          {t('rewards_description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rewards.map((reward) => {
          const tReward = t(`rewards.${reward.id}`, { returnObjects: true }) as {title: string, partner: string};
          const placeholder = PlaceHolderImages.find(p => p.id === reward.imageId);
          return (
            <Card key={reward.id} className="flex items-center p-4">
              <div className="flex-shrink-0 mr-4">
                <Image 
                    src={placeholder?.imageUrl || `https://picsum.photos/seed/${reward.id}/64/64`}
                    alt={tReward.title}
                    width={64}
                    height={64}
                    className="rounded-md object-cover"
                    data-ai-hint={placeholder?.imageHint}
                />
              </div>
              <div className="flex-grow">
                <h3 className="font-semibold">{tReward.title}</h3>
                <p className="text-sm text-muted-foreground">{tReward.partner}</p>
                <p className="text-sm font-bold text-primary">{reward.cost} {t('header_points')}</p>
              </div>
              <Button onClick={() => handleRedeemClick(reward)} disabled={userPoints < reward.cost}>{t('rewards_redeem_button')}</Button>
            </Card>
          )
        })}
      </CardContent>
       <CardFooter>
          <p className="text-xs text-muted-foreground text-center w-full" dangerouslySetInnerHTML={{ __html: t('guide_points_disclaimer') }} />
       </CardFooter>
    </Card>
    
     <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('toast_reward_confirm_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('toast_reward_confirm_description', {cost: selectedReward?.cost, title: selectedReward ? t(`rewards.${selectedReward.id}.title`) : '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRedeeming}>{t('toast_reward_confirm_cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRedeem} disabled={isRedeeming}>
              {isRedeeming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('rewards_redeem_button')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
