import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { caseProfilesApi } from '../../api/caseProfiles';
import { appointmentsApi } from '../../api/appointments';
import { caseNotesApi } from '../../api/caseNotes';
import { usersApi } from '../../api/users';
import { Tabs } from '../../components/ui/Tabs';
import { Badge, statusToBadgeVariant } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal, ModalActions } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { PageSpinner } from '../../components/ui/Spinner';
import { useAuthStore } from '../../store/authStore';
import type {
  ScheduleAppointmentFormData,
  CreateCaseNoteFormData,
  AccessLevel,
} from '../../types';

type Tab = 'appointments' | 'notes' | 'permissions';

// ─── Schemas ────────────────────────────────────────────────────────────────

const appointmentSchema = z.object({
  profileId: z.number(),
  scheduledAt: z.string().min(1, 'Date and time is required'),
  durationMinutes: z.coerce.number().min(15, 'Minimum 15 minutes'),
});

const noteSchema = z.object({
  profileId: z.number(),
  appointmentId: z.coerce.number().optional(),
  content: z.string().min(1, 'Note content is required'),
});

const accessSchema = z.object({
  userId: z.coerce.number().min(1, 'User ID is required'),
  accessLevel: z.enum(['VIEW_ONLY', 'OWNER']),
});

const DURATION_OPTIONS = [
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function CaseProfileDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<Tab>('appointments');
  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [closeProfileModal, setCloseProfileModal] = useState(false);

  // ─── Queries ──────────────────────────────────────────────────────────────

  const profileQuery = useQuery({
    queryKey: ['case-profile', id],
    queryFn: () => caseProfilesApi.getById(Number(id)),
    enabled: Boolean(id),
  });

  const appointmentsQuery = useQuery({
    queryKey: ['appointments', 'profile', id],
    queryFn: () => appointmentsApi.list(),
    enabled: Boolean(id),
    select: (data) => data.filter((a) => a.profileId === Number(id)),
  });

  const notesQuery = useQuery({
    queryKey: ['case-notes', id],
    queryFn: () => caseNotesApi.list(Number(id)),
    enabled: Boolean(id),
  });

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
  });

  // ─── Mutations ────────────────────────────────────────────────────────────

  const createAppointmentForm = useForm<ScheduleAppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: { profileId: Number(id), durationMinutes: 60 },
  });

  const createAppointmentMutation = useMutation({
    mutationFn: (data: ScheduleAppointmentFormData) => appointmentsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments', 'profile', id] });
      setAppointmentModalOpen(false);
      createAppointmentForm.reset({ profileId: Number(id), durationMinutes: 60 });
    },
  });

  const createNoteForm = useForm<CreateCaseNoteFormData>({
    resolver: zodResolver(noteSchema),
    defaultValues: { profileId: Number(id) },
  });

  const createNoteMutation = useMutation({
    mutationFn: (data: CreateCaseNoteFormData) => caseNotesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['case-notes', id] });
      setNoteModalOpen(false);
      createNoteForm.reset({ profileId: Number(id) });
    },
  });

  const grantAccessForm = useForm<{ userId: number; accessLevel: AccessLevel }>({
    resolver: zodResolver(accessSchema),
    defaultValues: { accessLevel: 'VIEW_ONLY' },
  });

  const grantAccessMutation = useMutation({
    mutationFn: (data: { userId: number; accessLevel: AccessLevel }) =>
      caseProfilesApi.grantAccess(Number(id), data.userId, data.accessLevel),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['case-profile', id] });
      setAccessModalOpen(false);
      grantAccessForm.reset({ accessLevel: 'VIEW_ONLY' });
    },
  });

  const revokeAccessMutation = useMutation({
    mutationFn: (userId: number) => caseProfilesApi.revokeAccess(Number(id), userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['case-profile', id] }),
  });

  const closeProfileMutation = useMutation({
    mutationFn: () => caseProfilesApi.close(Number(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['case-profile', id] });
      setCloseProfileModal(false);
    },
  });

  const deleteAppointmentMutation = useMutation({
    mutationFn: (apptId: number) => appointmentsApi.delete(apptId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments', 'profile', id] }),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: number) => caseNotesApi.delete(noteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['case-notes', id] }),
  });

  // ─── Render ──────────────────────────────────────────────────────────────

  if (profileQuery.isLoading) return <PageSpinner />;
  if (profileQuery.isError || !profileQuery.data) {
    return <p className="text-red-600 text-sm">Case profile not found.</p>;
  }

  const profile = profileQuery.data;
  const isOwner = profile.ownerId === currentUser?.id;

  return (
    <div className="max-w-3xl">
      <Link
        to="/case-profiles"
        className="text-sm text-primary-600 hover:text-primary-800 mb-4 inline-block"
      >
        ← Back to Case Profiles
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{profile.studentName}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{profile.schoolYear}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge label={profile.status} variant={statusToBadgeVariant(profile.status)} />
          {isOwner && profile.status === 'ACTIVE' && (
            <Button variant="secondary" size="sm" onClick={() => setCloseProfileModal(true)}>
              Close Profile
            </Button>
          )}
        </div>
      </div>

      {/* Summary card */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 mb-6">
        <Row label="Owner" value={profile.owner?.fullName ?? '—'} />
        <Row
          label="Source"
          value={
            profile.sourceType === 'REFERRAL' && profile.sourceReferralId ? (
              <Link
                to={`/referrals/${profile.sourceReferralId}`}
                className="text-primary-600 hover:underline"
              >
                Referral #{profile.sourceReferralId}
              </Link>
            ) : (
              'Created manually'
            )
          }
        />
        <Row label="Created" value={format(new Date(profile.createdAt), 'dd MMM yyyy')} />
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { key: 'appointments', label: 'Appointments', count: appointmentsQuery.data?.length },
          { key: 'notes', label: 'Case Notes', count: notesQuery.data?.length },
          { key: 'permissions', label: 'Permissions' },
        ]}
        active={activeTab}
        onChange={(k) => setActiveTab(k as Tab)}
      />

      {/* ── Appointments tab ─────────────────────────────────────────────────── */}
      {activeTab === 'appointments' && (
        <div className="mt-4 space-y-3">
          {isOwner && profile.status === 'ACTIVE' && (
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setAppointmentModalOpen(true)}>
                + Schedule Appointment
              </Button>
            </div>
          )}

          {appointmentsQuery.data?.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-10">No appointments yet.</p>
          )}

          {appointmentsQuery.data?.map((appt) => (
            <div
              key={appt.id}
              className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {format(new Date(appt.scheduledAt), 'EEE dd MMM yyyy, HH:mm')}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{appt.durationMinutes} minutes</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge label={appt.status} variant={statusToBadgeVariant(appt.status)} />
                {isOwner && (
                  <button
                    onClick={() => deleteAppointmentMutation.mutate(appt.id)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Case Notes tab ───────────────────────────────────────────────────── */}
      {activeTab === 'notes' && (
        <div className="mt-4 space-y-3">
          {isOwner && profile.status === 'ACTIVE' && (
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setNoteModalOpen(true)}>
                + Add Note
              </Button>
            </div>
          )}

          {notesQuery.data?.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-10">No case notes yet.</p>
          )}

          {notesQuery.data?.map((note) => (
            <div
              key={note.id}
              className="bg-white rounded-xl border border-gray-200 px-5 py-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs text-gray-500">
                    {note.author?.fullName ?? 'Unknown'} —{' '}
                    {format(new Date(note.createdAt), 'dd MMM yyyy, HH:mm')}
                  </p>
                </div>
                <div className="flex gap-3">
                  <Link
                    to={`/case-notes/${note.id}`}
                    className="text-xs text-primary-600 hover:text-primary-800"
                  >
                    Edit
                  </Link>
                  {isOwner && (
                    <button
                      onClick={() => deleteNoteMutation.mutate(note.id)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-800 whitespace-pre-wrap line-clamp-3">
                {note.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Permissions tab ──────────────────────────────────────────────────── */}
      {activeTab === 'permissions' && (
        <div className="mt-4 space-y-4">
          {isOwner && (
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setAccessModalOpen(true)}>
                + Grant Access
              </Button>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {/* Owner row */}
            <div className="px-5 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {profile.owner?.fullName ?? '—'}
                </p>
                <p className="text-xs text-gray-500">{profile.owner?.email}</p>
              </div>
              <Badge label="OWNER" variant="active" />
            </div>

            {/* Granted access */}
            {profile.access
              ?.filter((a) => a.accessLevel !== 'OWNER')
              .map((a) => (
                <div key={a.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {a.user?.fullName ?? `User #${a.userId}`}
                    </p>
                    <p className="text-xs text-gray-500">{a.user?.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge label={a.accessLevel} variant="assigned" />
                    {isOwner && (
                      <button
                        onClick={() => revokeAccessMutation.mutate(a.userId)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              ))}

            {(!profile.access || profile.access.filter((a) => a.accessLevel !== 'OWNER').length === 0) && (
              <div className="px-5 py-4 text-xs text-gray-400 text-center">
                No additional access granted.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────────────────────── */}

      {/* Schedule appointment */}
      <Modal
        isOpen={appointmentModalOpen}
        title="Schedule Appointment"
        onClose={() => setAppointmentModalOpen(false)}
        footer={
          <ModalActions
            onCancel={() => setAppointmentModalOpen(false)}
            onConfirm={createAppointmentForm.handleSubmit((d) =>
              createAppointmentMutation.mutate(d),
            )}
            confirmLabel="Schedule"
            loading={createAppointmentMutation.isPending}
          />
        }
      >
        <form className="space-y-4" noValidate>
          <input
            type="hidden"
            value={Number(id)}
            {...createAppointmentForm.register('profileId', { valueAsNumber: true })}
          />
          <Input
            label="Date & Time *"
            type="datetime-local"
            {...createAppointmentForm.register('scheduledAt')}
            error={createAppointmentForm.formState.errors.scheduledAt?.message}
          />
          <Select
            label="Duration *"
            options={DURATION_OPTIONS}
            {...createAppointmentForm.register('durationMinutes')}
            error={createAppointmentForm.formState.errors.durationMinutes?.message}
          />
        </form>
      </Modal>

      {/* Add case note */}
      <Modal
        isOpen={noteModalOpen}
        title="Add Case Note"
        onClose={() => setNoteModalOpen(false)}
        size="lg"
        footer={
          <ModalActions
            onCancel={() => setNoteModalOpen(false)}
            onConfirm={createNoteForm.handleSubmit((d) => createNoteMutation.mutate(d))}
            confirmLabel="Save Note"
            loading={createNoteMutation.isPending}
          />
        }
      >
        <form className="space-y-4" noValidate>
          <input
            type="hidden"
            value={Number(id)}
            {...createNoteForm.register('profileId', { valueAsNumber: true })}
          />
          <Textarea
            label="Note *"
            rows={8}
            placeholder="Enter case note…"
            {...createNoteForm.register('content')}
            error={createNoteForm.formState.errors.content?.message}
          />
        </form>
      </Modal>

      {/* Grant access */}
      <Modal
        isOpen={accessModalOpen}
        title="Grant Access"
        onClose={() => setAccessModalOpen(false)}
        footer={
          <ModalActions
            onCancel={() => setAccessModalOpen(false)}
            onConfirm={grantAccessForm.handleSubmit((d) => grantAccessMutation.mutate(d))}
            confirmLabel="Grant"
            loading={grantAccessMutation.isPending}
          />
        }
      >
        <form className="space-y-4" noValidate>
          <Select
            label="Counsellor *"
            options={
              usersQuery.data?.map((u) => ({
                value: u.id,
                label: `${u.fullName} (${u.email})`,
              })) ?? []
            }
            placeholder="Select a counsellor"
            {...grantAccessForm.register('userId', { valueAsNumber: true })}
            error={grantAccessForm.formState.errors.userId?.message}
          />
          <Select
            label="Access Level *"
            options={[
              { value: 'VIEW_ONLY', label: 'View only' },
              { value: 'OWNER', label: 'Transfer ownership' },
            ]}
            {...grantAccessForm.register('accessLevel')}
            error={grantAccessForm.formState.errors.accessLevel?.message}
          />
          {grantAccessForm.watch('accessLevel') === 'OWNER' && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md p-2">
              Transferring ownership will remove your own access to this profile.
            </p>
          )}
        </form>
      </Modal>

      {/* Close profile confirmation */}
      <Modal
        isOpen={closeProfileModal}
        title="Close Case Profile"
        onClose={() => setCloseProfileModal(false)}
        footer={
          <ModalActions
            onCancel={() => setCloseProfileModal(false)}
            onConfirm={() => closeProfileMutation.mutate()}
            confirmLabel="Close Profile"
            confirmVariant="danger"
            loading={closeProfileMutation.isPending}
          />
        }
      >
        <p className="text-sm text-gray-600">
          Are you sure you want to close this case profile? Appointments can no longer be
          scheduled and no further notes can be added.
        </p>
      </Modal>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="px-5 py-3 flex gap-4">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide w-24 shrink-0 mt-0.5">
        {label}
      </span>
      <span className="text-sm text-gray-800">{value}</span>
    </div>
  );
}
