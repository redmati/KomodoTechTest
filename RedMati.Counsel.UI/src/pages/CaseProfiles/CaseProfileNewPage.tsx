import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { caseProfilesApi } from '../../api/caseProfiles';
import { referralsApi } from '../../api/referrals';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import type { CreateCaseProfileFormData } from '../../types';

const schema = z.object({
  studentName: z.string().min(1, 'Student name is required'),
  schoolYear: z.string().min(1, 'School year is required'),
  sourceType: z.enum(['MANUAL', 'REFERRAL']),
  sourceReferralId: z.coerce.number().optional(),
});

const SCHOOL_YEAR_OPTIONS = [
  'Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12', 'Year 13',
].map((y) => ({ value: y, label: y }));

export function CaseProfileNewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromReferralId = searchParams.get('referralId');

  // Pre-fetch referral data if navigated from a referral
  const { data: referral } = useQuery({
    queryKey: ['referral', fromReferralId],
    queryFn: () => referralsApi.getById(Number(fromReferralId)),
    enabled: Boolean(fromReferralId),
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateCaseProfileFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      studentName: referral?.studentName ?? '',
      schoolYear: referral?.schoolYear ?? '',
      sourceType: fromReferralId ? 'REFERRAL' : 'MANUAL',
      sourceReferralId: fromReferralId ? Number(fromReferralId) : undefined,
    },
  });

  const sourceType = watch('sourceType');

  const mutation = useMutation({
    mutationFn: (data: CreateCaseProfileFormData) => caseProfilesApi.create(data),
    onSuccess: (profile) => navigate(`/case-profiles/${profile.id}`),
  });

  return (
    <div className="max-w-lg">
      <Link
        to="/case-profiles"
        className="text-sm text-primary-600 hover:text-primary-800 mb-4 inline-block"
      >
        ← Back to Case Profiles
      </Link>

      <h1 className="text-xl font-semibold text-gray-900 mb-6">New Case Profile</h1>

      <form
        onSubmit={handleSubmit((d) => mutation.mutate(d))}
        className="bg-white rounded-xl border border-gray-200 p-6 space-y-4"
        noValidate
      >
        <Input
          label="Student name *"
          {...register('studentName')}
          error={errors.studentName?.message}
        />

        <Select
          label="School year *"
          options={SCHOOL_YEAR_OPTIONS}
          placeholder="Select year group"
          {...register('schoolYear')}
          error={errors.schoolYear?.message}
        />

        <Select
          label="Source"
          options={[
            { value: 'MANUAL', label: 'Created manually' },
            { value: 'REFERRAL', label: 'From a referral' },
          ]}
          {...register('sourceType')}
          error={errors.sourceType?.message}
        />

        {sourceType === 'REFERRAL' && (
          <Input
            label="Referral ID"
            type="number"
            {...register('sourceReferralId')}
            error={errors.sourceReferralId?.message}
            defaultValue={fromReferralId ?? ''}
          />
        )}

        {mutation.isError && (
          <p className="text-sm text-red-600">
            {mutation.error?.message ?? 'Failed to create profile.'}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Create Profile
          </Button>
        </div>
      </form>
    </div>
  );
}
