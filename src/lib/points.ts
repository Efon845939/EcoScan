export const materialPoints: { [key: string]: number } = {
  battery: 30,
  plastic: 18,
  glass: 14,
  metal: 12,
  aluminum: 12,
  paper: 8,
  cardboard: 8,
  unrecyclable: 4,
};

export function getPointsForMaterial(material: string): number {
  if (!material) return 0;
  const lowerMaterial = material.toLowerCase();

  for (const key in materialPoints) {
    if (lowerMaterial.includes(key)) {
      return materialPoints[key];
    }
  }

  // Default points if no specific material is matched
  return 3;
}
