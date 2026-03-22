import { persistenceRepositories } from '@/src/services/persistence/kvRepositories';
import { nanoid } from '@/src/utils/nanoid';

const DEFAULT_LOCALE = 'pt-BR';

export const getOrCreateMultiplayerClientId = async (): Promise<string> => {
  const profile = await persistenceRepositories.profile.getProfile();
  if (profile?.id) {
    return profile.id;
  }

  const nextId = `player-${nanoid(12)}`;
  await persistenceRepositories.profile.saveProfile({
    id: nextId,
    locale: profile?.locale ?? DEFAULT_LOCALE,
    avatar: profile?.avatar,
    displayName: profile?.displayName,
  });

  return nextId;
};
