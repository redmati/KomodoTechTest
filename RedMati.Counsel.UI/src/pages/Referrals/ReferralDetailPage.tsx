import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { referralsApi } from '../../api/referrals';
import { caseProfilesApi } from '../../api/caseProfiles';
import { Badge, statusToBadgeVariant } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal, ModalActions } from '../../components/ui/Modal';
import { Textarea } from '../../components/ui/Textarea';
import { PageSpinner } from '../../components/ui/Spinner';
import { useAuthStore } from '../../store/authStore';

const deleteSchema = z.object({
  reason: z.string().min(5, 'Please provide a reason (at least 5 characters)'),
});

export function ReferralDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  const { data: referral, isLoading, isError } = useQuery({
    queryKey: ['referral', id],
    queryFn: () => referralsApi.getById(Number(id)),
    enabled: Boolean(id),
  });

  const {
    register: regDelete,
    handleSubmit: handleDeleteSubmit,
    formState: { errors: deleteErrors },
    reset: resetDelete,
  } = useForm<{ reason: string }>({
    resolver: zodResolver(deleteSchema),
  });

  const assignMutation = useMutation({
    mutationFn: () => referralsApi.assign(Number(id), currentUser!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['referral', id] });
      qc.invalidateQueries({ queryKey: ['referrals'] });
      setAssignModalOpen(false);
    },
  });

  const unassignMutation = useMutation({
    mutationFn: () => referralsApi.unassign(Number(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['referral', id] });
      qc.invalidateQueries({ queryKey: ['referrals'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (reason: string) => referralsApi.remove(Number(id), reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['referrals'] });
      navigate('/referrals');
    },
  });

  const createProfileMutation = useMutation({
    mutationFn: () =>
      caseProfilesApi.create({
        studentName: referral!.studentName,
        schoolYear: referral!.schoolYear,
        sourceType: 'REFERRAL',
        sourceReferralId: referral!.id,
      }),
    onSuccess: (profile) => {
      navigate(`/case-profiles/${profile.id}`);
    },
  });

  if (isLoading) return <PageSpinner />;
  if (isError || !referral) {
    return <p className="text-red-600 text-sm">Referral not found.</p>;
  }

  const isAssignedToMe = referral.assignedTo === currentUser?.id;
  const isPending = referral.status === 'PENDING';
  const isAssigned = referral.status === 'ASSIGNED';

  return (
    <div className="max-w-2xl">
      {/* Back */}
      <Link to="/referrals" className="text-sm text-primary-600 hover:text-primary-800 mb-4 inline-block">
        ← Back to Referrals
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{referral.studentName}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{referral.schoolYear}</p>
        </div>
        <Badge label={referral.status} variant={statusToBadgeVariant(referral.status)} />
      </div>

      {/* Details card */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 mb-6">
        <Row label="Student" value={referral.studentName} />
        <Row label="School year" value={referral.schoolYear} />
        <Row label="Consent given" value={referral.studentConsent ? 'Yes' : 'No'} />
        <Row
          label="Referred by"
          value={
            referral.referrerName
              ? `${referral.referrerName} (${referral.referrerRole ?? 'unknown role'})`
              : '—'
          }
        />
        <Row
          label="Reason"
          value={<span className="whitespace-pre-wrap">{referral.reason}</span>}
        />
        <Row
          label="Submitted"
          value={format(new Date(referral.createdAt), 'dd MMM yyyy, HH:mm')}
        />
        {referral.assignedToUser && (
          <Row label="Assigned to" value={referral.assignedToUser.fullName} />
        )}
        {referral.status === 'DELETED' && referral.deletedReason && (
          <Row label="Deletion reason" value={referral.deletedReason} />
        )}
      </div>

      {/* Actions */}
      {(isPending || isAssigned) && (
        <div className="flex flex-wrap gap-3">
          {isPending && (
            <Button onClick={() => setAssignModalOpen(true)}>
              Assign to me
            </Button>
          )}
          {isAssigned && isAssignedToMe && (
            <Button
              variant="secondary"
              onClick={() => unassignMutation.mutate()}
              loading={unassignMutation.isPending}
            >
              Unassign
            </Button>
          )}
          {(isPending || isAssigned) && (
            <Button
              variant="primary"
              onClick={() => createProfileMutation.mutate()}
              loading={createProfileMutation.isPending}
            >
              Create Case Profile
            </Button>
          )}
          {isPending && (
            <Button variant="danger" onClick={() => setDeleteModalOpen(true)}>
              Delete Referral
            </Button>
          )}
        </div>
      )}

      {/* Assign confirmation */}
      <Modal
        isOpen={assignModalOpen}
        title="Assign referral"
        onClose={() => setAssignModalOpen(false)}
        footer={
          <ModalActions
            onCancel={() => setAssignModalOpen(false)}
            onConfirm={() => assignMutation.mutate()}
            confirmLabel="Assign to me"
            loading={assignMutation.isPending}
          />
        }
      >
        <p className="text-sm text-gray-600">
          Assign this referral for <strong>{referral.studentName}</strong> to yourself?
        </p>
      </Modal>

      {/* Delete with reason */}
      <Modal
        isOpen={deleteModalOpen}
        title="Delete referral"
        onClose={() => {
          setDeleteModalOpen(false);
          resetDelete();
        }}
        footer={
          <ModalActions
            onCancel={() => setDeleteModalOpen(false)}
            confirmVariant="danger"
            confirmLabel="Delete"
            loading={deleteMutation.isPending}
          />
        }
      >
        <form
          id="delete-referral-form"
          onSubmit={handleDeleteSubmit((d) => deleteMutation.mutate(d.reason))}
          className="space-y-4"
        >
          <p className="text-sm text-gray-600">
            Please provide a reason for deleting this referral. This action cannot be undone.
          </p>
          <Textarea
            label="Reason *"
            placeholder="Enter reason for deletion…"
            {...regDelete('reason')}
            error={deleteErrors.reason?.message}
          />
          <Button type="submit" variant="danger" loading={deleteMutation.isPending} className="w-full">
            Confirm Delete
          </Button>
        </form>
      </Modal>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="px-5 py-3 flex gap-4">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide w-32 shrink-0 mt-0.5">
        {label}
      </span>
      <span className="text-sm text-gray-800">{value}</span>
    </div>
  );
}
