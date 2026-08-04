export const buildAvatarUrl = (seed?: string) => {
  const safeSeed = seed && seed.trim().length > 0 ? seed : 'default';
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(safeSeed)}`;
};

export const resolveAvatar = (avatar: string | undefined, seed?: string) => {
  if (avatar && avatar.trim().length > 0) return avatar;
  return buildAvatarUrl(seed);
};
