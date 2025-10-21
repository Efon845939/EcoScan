const MATERIAL_POINTS: Record<string, number> = {
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
  const lowerMaterial = material.toLowerCase();
  for (const key in MATERIAL_POINTS) {
    if (lowerMaterial.includes(key)) {
      return MATERIAL_POINTS[key];
    }
  }
  return 3; // Default points for other materials
}
