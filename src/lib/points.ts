export const materialPoints: { [key: string]: number } = {
  battery: 50,
  plastic: 40,
  glass: 30,
  metal: 20,
  aluminum: 20,
  paper: 10,
  cardboard: 10,
  unrecyclable: 10,
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
  return 5;
}
