import { useCallback, useEffect, useState } from 'react';
import type { Group } from '@/types';
import { groupsService } from '@/services/groups.service';
import { getApiErrorMessage } from '@/lib/api-error';

interface UseGroupsOptions {
  createdByMe?: boolean;
}

interface UseGroupsResult {
  groups: Group[];
  loading: boolean;
  error: string;
  reload: () => Promise<void>;
}

export function useGroups(options: UseGroupsOptions = {}): UseGroupsResult {
  const { createdByMe = false } = options;

  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await groupsService.getGroups({ createdByMe });
      setGroups(data);
    } catch (err: unknown) {
      setGroups([]);
      setError(getApiErrorMessage(err, 'Impossible de charger les groupes.'));
    }
    setLoading(false);
  }, [createdByMe]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    groups,
    loading,
    error,
    reload: load,
  };
}
