import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { referralsApi } from '../../api/referrals';
import { Tabs } from '../../components/ui/Tabs';
import { Badge, statusToBadgeVariant } from '../../components/ui/Badge';
import { PageSpinner } from '../../components/ui/Spinner';
import type { ReferralStatus } from '../../types';
import { format } from 'date-fns';

type TabKey = 'PENDING' | 'ASSIGNED' | 'CLOSED' | 'DELETED';

const TABS = [
  { key: 'PENDING' as TabKey, label: 'Unassigned' },
  { key: 'ASSIGNED' as TabKey, label: 'Assigned' },
  { key: 'CLOSED' as TabKey, label: 'Past' },
  { key: 'DELETED' as TabKey, label: 'Deleted' },
];

export function ReferralsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('PENDING');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['referrals', activeTab],
    queryFn: () => referralsApi.list(activeTab as ReferralStatus),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Referrals</h1>
      </div>

      <Tabs
        tabs={TABS.map((t) => ({ ...t, count: activeTab === t.key ? data?.length : undefined }))}
        active={activeTab}
        onChange={(k) => setActiveTab(k as TabKey)}
      />

      <div className="mt-4">
        {isLoading && <PageSpinner />}

        {isError && (
          <p className="text-sm text-red-600">Failed to load referrals. Please try again.</p>
        )}

        {!isLoading && !isError && data?.length === 0 && (
          <div className="py-16 text-center text-gray-400 text-sm">
            No {TABS.find((t) => t.key === activeTab)?.label.toLowerCase()} referrals.
          </div>
        )}

        {data && data.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Year
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Referred by
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {r.studentName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.schoolYear}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {r.referrerName || '—'}
                      {r.referrerRole && (
                        <span className="ml-1 text-xs text-gray-400 capitalize">
                          ({r.referrerRole})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        label={r.status}
                        variant={statusToBadgeVariant(r.status)}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {format(new Date(r.createdAt), 'dd MMM yyyy')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/referrals/${r.id}`}
                        className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
