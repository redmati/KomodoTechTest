import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { authApi } from '../../api/auth';
import { referralsApi } from '../../api/referrals';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Button } from '../../components/ui/Button';
import { PageSpinner } from '../../components/ui/Spinner';
import type { ReferralFormData } from '../../types';

const schema = z.object({
  studentName: z.string().min(1, 'Student name is required'),
  schoolYear: z.string().min(1, 'School year is required'),
  referrerName: z.string().optional().default(''),
  referrerRole: z
    .enum(['student', 'parent', 'teacher', 'other', ''])
    .optional()
    .default(''),
  reason: z.string().min(10, 'Please provide a reason (at least 10 characters)'),
  studentConsent: z.boolean().refine((v) => v === true, {
    message: 'Student consent is required to proceed',
  }),
});

const SCHOOL_YEAR_OPTIONS = [
  'Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12', 'Year 13',
].map((y) => ({ value: y, label: y }));

const REFERRER_ROLE_OPTIONS = [
  { value: 'student', label: 'Student' },
  { value: 'parent', label: 'Parent / Guardian' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'other', label: 'Other' },
];

export function ReferralFormPage() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const [submitted, setSubmitted] = useState(false);

  const tenantQuery = useQuery({
    queryKey: ['public-tenant', tenantCode],
    queryFn: () => authApi.getPublicTenant(tenantCode!),
    enabled: Boolean(tenantCode),
    retry: false,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ReferralFormData>({
    resolver: zodResolver(schema),
    defaultValues: { studentConsent: false },
  });

  const submitMutation = useMutation({
    mutationFn: (data: ReferralFormData) =>
      referralsApi.submitPublic(tenantCode!, data),
    onSuccess: () => setSubmitted(true),
  });

  if (!tenantCode) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Invalid referral link.
      </div>
    );
  }

  if (tenantQuery.isLoading) return <PageSpinner />;

  if (tenantQuery.isError) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        This referral link is not valid or has expired.
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-primary-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Referral submitted</h2>
          <p className="text-gray-500 text-sm">
            Thank you. A counsellor at {tenantQuery.data?.name} will review your referral shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-xl">
        {/* Header */}
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-600 mb-1">
            {tenantQuery.data?.name}
          </p>
          <h1 className="text-xl font-bold text-gray-900">Counselling Referral Form</h1>
          <p className="text-sm text-gray-500 mt-1">
            Please complete all required fields marked with *.
          </p>
        </div>

        <form
          onSubmit={handleSubmit((data) => submitMutation.mutate(data))}
          className="space-y-6"
          noValidate
        >
          {/* Student details */}
          <section>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Student Details *
            </h2>
            <div className="space-y-3">
              <Input
                label="Student name *"
                placeholder="Full name"
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
            </div>
          </section>

          {/* Referrer details */}
          <section>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Referrer Details (optional)
            </h2>
            <div className="space-y-3">
              <Input
                label="Your name"
                placeholder="Optional"
                {...register('referrerName')}
                error={errors.referrerName?.message}
              />
              <Select
                label="Your role"
                options={REFERRER_ROLE_OPTIONS}
                placeholder="Select role"
                {...register('referrerRole')}
                error={errors.referrerRole?.message}
              />
            </div>
          </section>

          {/* Reason */}
          <section>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Reason for Referral *
            </h2>
            <Textarea
              label="Please describe why this student is being referred *"
              placeholder="Provide as much detail as you feel comfortable sharing…"
              rows={5}
              {...register('reason')}
              error={errors.reason?.message}
            />
          </section>

          {/* Consent */}
          <section>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Student Consent *
            </h2>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                {...register('studentConsent')}
              />
              <span className="text-sm text-gray-700">
                The student is aware of and consents to this referral being made to the school
                counselling service.
              </span>
            </label>
            {errors.studentConsent && (
              <p className="form-field-error mt-1">{errors.studentConsent.message}</p>
            )}
          </section>

          {submitMutation.isError && (
            <p className="text-sm text-red-600">
              {submitMutation.error?.message ?? 'Something went wrong. Please try again.'}
            </p>
          )}

          <Button
            type="submit"
            loading={submitMutation.isPending}
            className="w-full"
            size="lg"
          >
            Submit Referral
          </Button>
        </form>
      </div>
    </div>
  );
}
