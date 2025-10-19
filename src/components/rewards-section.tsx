import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Ticket, ChevronLeft, Film, Shirt, ShoppingBasket, Footprints as FootprintsIcon } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { useFirebase, useUser, updateDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';


const rewards = [
  {
    id: 1,
    title: 'Free Coffee',
    partner: 'The Daily Grind',
    points: 250,
    imageId: 'reward-partner-1',
    icon: Ticket,
  },
  {
    id: 2,
    title: '$5 Off Groceries',
    partner: 'Green Grocer',
    points: 600,
    imageId: 'reward-partner-2',
    icon: ShoppingBasket,
  },

  {
    id: 3,
    title: '$10 Off Clothes',
    partner: 'Eco Threads',
    points: 850,
    imageId: 'reward-partner-3',
    icon: Shirt,
  },
  {
    id: 4,
    title: 'Free Movie Ticket',
    partner: 'Cineplex Green',
    points: 1200,
    imageId: 'reward-partner-4',
    icon: Film,
  },
  {
    id: 5,
    title: '$15 Off Shoes',
    partner: 'Sustainable Soles',
    points: 1500,
    imageId: 'reward-partner-5',
    icon: FootprintsIcon,
  },
];

type RewardsSectionProps = {
  userPoints: number;
  onBack: () => void;
};

export function RewardsSection({ userPoints, onBack }: RewardsSectionProps) {
  const { toast } = useToast();
  const [redeemed, setRedeemed] = useState(false);
  const { firestore } = useFirebase();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );


  const handleRedeem = (reward: (typeof rewards)[0]) => {
    if (userPoints < reward.points) {
      toast({
        variant: 'destructive',
        title: 'Not enough points',
        description: `You need ${reward.points} points to redeem this reward.`,
      });
      return;
    }

    if (userProfileRef) {
      const newPoints = userPoints - reward.points;
      updateDocumentNonBlocking(userProfileRef, { totalPoints: newPoints });
      toast({
        title: 'Reward Redeemed!',
        description: `You've successfully redeemed "${reward.title}".`,
      });
      setRedeemed(true);
    }
  };

  if (redeemed) {
    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="font-headline pt-8 text-center text-2xl">Reward Claimed!</CardTitle>
                <CardDescription className="text-center">
                    Enjoy your discount. Thank you for your contribution!
                </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
                <Button onClick={onBack}>Back to Main Menu</Button>
            </CardContent>
        </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="relative flex items-center justify-center">
            <Button variant="ghost" size="sm" className="absolute left-0" onClick={onBack}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <CardTitle className="font-headline text-2xl">Redeem Your Points</CardTitle>
        </div>
        <CardDescription className="text-center pt-2">
          Use your points to get discounts at our partner stores.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rewards.map((reward) => {
          const partnerImage = PlaceHolderImages.find((p) => p.id === reward.imageId);
          const canRedeem = userPoints >= reward.points;
          return (
            <div
              key={reward.id}
              className="flex items-center justify-between rounded-lg border bg-card p-4 shadow-sm"
            >
              <div className="flex items-center gap-4">
                {partnerImage && (
                  <Image
                    src={partnerImage.imageUrl}
                    alt={partnerImage.description}
                    width={50}
                    height={50}
                    className="rounded-full"
                    data-ai-hint={partnerImage.imageHint}
                  />
                )}
                <div>
                  <p className="font-semibold">{reward.title}</p>
                  <p className="text-sm text-muted-foreground">{reward.partner}</p>
                </div>
              </div>
              <Button onClick={() => handleRedeem(reward)} disabled={!canRedeem}>
                <Ticket className="mr-2 h-4 w-4" />
                {reward.points} pts
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
