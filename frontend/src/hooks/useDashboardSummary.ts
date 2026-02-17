import { useEffect, useMemo, useState } from 'react';
import type { Group } from '@/types';
import { dashboardService } from '@/services/dashboard.service';
import { getApiErrorMessage } from '@/lib/api-error';

interface DashboardSummary {
  totalBalance: number;
  groupsNotUpToDate: number;
  isUpToDate: boolean;
}

export interface DelayedGroupSummary {
  groupId: string;
  groupName: string;
  balance: number;
}

interface UseDashboardSummaryResult {
  summary: DashboardSummary;
  delayedGroups: DelayedGroupSummary[];
  loading: boolean;
  error: string;
}

function defaultSummary(): DashboardSummary {
  return {
    totalBalance: 0,
    groupsNotUpToDate: 0,
    isUpToDate: true,
  };
}

export function useDashboardSummary(groups: Group[], userId?: string): UseDashboardSummaryResult {
  const [summary, setSummary] = useState<DashboardSummary>(defaultSummary);
  const [delayedGroups, setDelayedGroups] = useState<DelayedGroupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const groupIds = useMemo(() => groups.map((group) => group.id), [groups]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!userId) {
        setSummary(defaultSummary());
        setDelayedGroups([]);
        setLoading(false);
        setError('');
        return;
      }

      if (groupIds.length === 0) {
        setSummary(defaultSummary());
        setDelayedGroups([]);
        setLoading(false);
        setError('');
        return;
      }

      setLoading(true);
      setError('');

      try {
        const dashboards = await Promise.all(groupIds.map((groupId) => dashboardService.getMemberDashboard(groupId)));

        if (cancelled) return;

        const balancesByGroup = dashboards.map((dashboard) =>
          dashboard.contributions.reduce(
            (sum, contribution) => sum + (contribution.balance?.balance ?? 0),
            0,
          ),
        );

        const totalBalance = balancesByGroup.reduce((sum, balance) => sum + balance, 0);
        const delayed = groups
          .map((group, index) => ({
            groupId: group.id,
            groupName: group.name,
            balance: balancesByGroup[index] ?? 0,
          }))
          .filter((item) => item.balance < 0);

        setSummary({
          totalBalance,
          groupsNotUpToDate: delayed.length,
          isUpToDate: totalBalance >= 0,
        });
        setDelayedGroups(delayed);
      } catch (error: unknown) {
        if (cancelled) return;
        setSummary(defaultSummary());
        setDelayedGroups([]);
        setError(getApiErrorMessage(error, 'Impossible de charger le résumé dashboard.'));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [groupIds, groups, userId]);

  return {
    summary,
    delayedGroups,
    loading,
    error,
  };
}
