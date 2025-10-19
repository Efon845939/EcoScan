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

// Aliases for common material names
const materialAliases: { [key: string]: string } = {
  'pet': 'plastic',
  'pete': 'plastic',
  'polyethylene terephthalate': 'plastic',
  'hdpe': 'plastic',
  'pvc': 'plastic',
  'ldpe': 'plastic',
  'pp': 'plastic',
  'ps': 'plastic',
  'steel': 'metal',
  'tin': 'metal',
};

export function getPointsForMaterial(material: string): number {
  if (!material) return 0;
  const lowerMaterial = material.toLowerCase().trim();

  // Check for an alias first
  if (materialAliases[lowerMaterial]) {
    const aliasedMaterial = materialAliases[lowerMaterial];
    return materialPoints[aliasedMaterial] || 3;
  }

  // Check for direct match or keyword in the points object
  for (const key in materialPoints) {
    if (lowerMaterial.includes(key)) {
      return materialPoints[key];
    }
  }

  // Default points if no specific material is matched
  return 3;
}

    