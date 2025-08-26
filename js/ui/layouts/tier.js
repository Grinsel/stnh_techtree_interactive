// Compute tier-based positions for a list of nodes
export function layoutByTier(nodesArr, width, height, { nodeWidth, nodeHeight }, { padX = 100, padY = 20 } = {}) {
  const tiers = {};
  const tierPositions = {};
  for (const node of nodesArr) {
    const tier = node.tier || 0;
    if (!tiers[tier]) {
      tiers[tier] = [];
    }
    tiers[tier].push(node);
  }

  const tierKeys = Object.keys(tiers).map(Number).sort((a, b) => a - b);
  const numTiers = tierKeys.length;
  const tierWidth = (width - (numTiers - 1) * padX) / numTiers;

  for (let i = 0; i < tierKeys.length; i++) {
    const tier = tierKeys[i];
    const tierNodes = tiers[tier];
    const tierX = i * (tierWidth + padX) + tierWidth / 2;
    tierPositions[tier] = tierX;

    const totalTierHeight = tierNodes.length * (nodeHeight + padY) - padY;
    const startY = (height - totalTierHeight) / 2;

    for (let j = 0; j < tierNodes.length; j++) {
      const node = tierNodes[j];
      node.x = tierX;
      node.y = startY + j * (nodeHeight + padY) + nodeHeight / 2;
    }
  }
  return tierPositions;
}
