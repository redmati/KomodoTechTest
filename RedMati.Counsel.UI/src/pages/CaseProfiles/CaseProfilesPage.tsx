import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { caseProfilesApi } from '../../api/caseProfiles';
import { Badge, statusToBadgeVariant } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PageSpinner } from '../../components/ui/Spinner';
import { format } from 'date-fns';

export function CaseProfilesPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['case-profiles'],
    queryFn: caseProfilesApi.list,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Case Profiles</h1>
        <Link to="/case-profiles/new">
          <Button>+ New Profile</Button>
        </Link>
      </div>

      {isLoading && <PageSpinner />}
      {isError && <p className="text-sm text-red-600">Failed to load case profiles.</p>}

      {!isLoading && !isError && data?.length === 0 && (
        <div className="py-16 text-center text-gray-400 text-sm">
          No case profiles yet.{' '}
          <Link to="/case-profiles/new" className="text-primary-600 hover:underline">
            Create one
          </Link>
          .
        </div>
      )}

      {data && data.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((profile) => (
            <Link
              key={profile.id}
              to={`/case-profiles/${profile.id}`}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:border-primary-300 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-primary-700">
                    {profile.studentName}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{profile.schoolYear}</p>
                </div>
                <Badge
                  label={profile.status}
                  variant={statusToBadgeVariant(profile.status)}
                />
              </div>

              <div className="space-y-1 text-xs text-gray-500">
                <p>
                  <span className="font-medium text-gray-600">Owner:</span>{' '}
                  {profile.owner?.fullName ?? '—'}
                </p>
                <p>
                  <span className="font-medium text-gray-600">Source:</span>{' '}
                  {profile.sourceType === 'REFERRAL' ? 'Referral' : 'Manual'}
                </p>
                <p>
                  <span className="font-medium text-gray-600">Created:</span>{' '}
                  {format(new Date(profile.createdAt), 'dd MMM yyyy')}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
