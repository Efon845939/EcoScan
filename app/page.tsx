import { AppContainer } from '@/components/app-container';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';

export default function Home() {
  const heroImage = PlaceHolderImages.find((img) => img.id === 'hero');

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background">
      {heroImage && (
        <Image
          src={heroImage.imageUrl}
          alt={heroImage.description}
          fill
          priority
          className="absolute inset-0 z-0 h-full w-full object-cover opacity-10"
          data-ai-hint={heroImage.imageHint}
        />
      )}
      <div className="relative z-10 flex flex-1 flex-col">
        <AppContainer />
      </div>
    </div>
  );
}

    