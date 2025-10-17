import { GlassWater, Trash2, Factory, FileText, HelpCircle } from 'lucide-react';
import type { LucideProps } from 'lucide-react';

type MaterialIconProps = {
  material: string;
} & LucideProps;

export function MaterialIcon({ material, ...props }: MaterialIconProps) {
  if (!material) return <HelpCircle {...props} />;
  
  const lowerMaterial = material.toLowerCase();
  
  if (lowerMaterial.includes('plastic')) {
    return <Trash2 {...props} />;
  }
  if (lowerMaterial.includes('glass')) {
    return <GlassWater {...props} />;
  }
  if (lowerMaterial.includes('metal') || lowerMaterial.includes('aluminum')) {
    return <Factory {...props} />;
  }
  if (lowerMaterial.includes('paper') || lowerMaterial.includes('cardboard')) {
    return <FileText {...props} />;
  }
  
  return <HelpCircle {...props} />;
}
