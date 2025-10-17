import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Ticket, ChevronLeft } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useToast } from '@/hooks/use-toast';

const rewards = [
  {
    id: 1,
    title: 'Free Coffee',
    partner: 'The Daily Grind',
    points: 50,
    imageId: 'reward-partner-1',
  },
  {
    id: 2,
    title: '10% Off Groceries',
    partner: 'Green Grocer',
    points: 150,
    imageId: 'reward-partner-2',
  },
  {
    id: 3,
    title: '$5 Off T-shirt',
    partner: 'Eco Threads',
    points: 200,
    imageId: 'reward-partner-3',
  },
];

export function RewardsSection({ onBack }: { onBack: () => void }) {
  const { toast } = useToast();

  const handleRedeem = (title: string) => {
    toast({
      title: 'Reward Redeemed!',
      description: `You've successfully redeemed "${title}".`,
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <Button variant="ghost" size="sm" className="absolute top-4 left-4" onClick={onBack}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Back to Scan
        </Button>
        <CardTitle className="font-headline pt-8 text-center text-2xl">Redeem Your Points</CardTitle>
        <CardDescription className="text-center">
          Use your points to get discounts at our partner stores.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rewards.map((reward) => {
          const partnerImage = PlaceHolderImages.find((p) => p.id === reward.imageId);
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
              <Button onClick={() => handleRedeem(reward.title)}>
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
