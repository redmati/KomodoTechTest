import { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { caseNotesApi } from '../../api/caseNotes';
import { Textarea } from '../../components/ui/Textarea';
import { Button } from '../../components/ui/Button';
import { PageSpinner } from '../../components/ui/Spinner';
import { useAuthStore } from '../../store/authStore';

const schema = z.object({
  content: z.string().min(1, 'Note content is required'),
});

export function CaseNotePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const { data: note, isLoading, isError } = useQuery({
    queryKey: ['case-note', id],
    queryFn: () => caseNotesApi.getById(Number(id)),
    enabled: Boolean(id),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<{ content: string }>({
    resolver: zodResolver(schema),
    defaultValues: { content: '' },
  });

  // Populate form once note loads
  useEffect(() => {
    if (note) {
      reset({ content: note.content });
    }
  }, [note, reset]);

  const updateMutation = useMutation({
    mutationFn: (content: string) => caseNotesApi.update(Number(id), content),
    onSuccess: (updated) => {
      qc.setQueryData(['case-note', id], updated);
      reset({ content: updated.content });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => caseNotesApi.delete(Number(id)),
    onSuccess: () => {
      if (note?.profileId) {
        navigate(`/case-profiles/${note.profileId}`);
      } else {
        navigate('/case-profiles');
      }
    },
  });

  if (isLoading) return <PageSpinner />;
  if (isError || !note) {
    return <p className="text-red-600 text-sm">Case note not found.</p>;
  }

  const isAuthor = note.authorId === currentUser?.id;

  return (
    <div className="max-w-2xl">
      <Link
        to={`/case-profiles/${note.profileId}`}
        className="text-sm text-primary-600 hover:text-primary-800 mb-4 inline-block"
      >
        ← Back to Case Profile
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Case Note</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {note.profile?.studentName && (
              <span>
                {note.profile.studentName} ·{' '}
              </span>
            )}
            {note.author?.fullName ?? 'Unknown author'} ·{' '}
            {format(new Date(note.createdAt), 'dd MMM yyyy, HH:mm')}
            {note.updatedAt !== note.createdAt && (
              <span className="text-gray-400">
                {' '}(edited {format(new Date(note.updatedAt), 'dd MMM yyyy')})
              </span>
            )}
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit(({ content }) => updateMutation.mutate(content))}
        className="space-y-4"
        noValidate
      >
        <Textarea
          label="Note"
          rows={12}
          disabled={!isAuthor}
          {...register('content')}
          error={errors.content?.message}
        />

        {!isAuthor && (
          <p className="text-xs text-gray-400">
            You can view this note but only the author can edit it.
          </p>
        )}

        {isAuthor && (
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => deleteMutation.mutate()}
              loading={deleteMutation.isPending}
            >
              Delete Note
            </Button>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => reset({ content: note.content })}
                disabled={!isDirty}
              >
                Discard
              </Button>
              <Button
                type="submit"
                size="sm"
                loading={updateMutation.isPending}
                disabled={!isDirty}
              >
                Save Changes
              </Button>
            </div>
          </div>
        )}

        {updateMutation.isError && (
          <p className="text-sm text-red-600">
            {updateMutation.error?.message ?? 'Failed to save note.'}
          </p>
        )}
      </form>
    </div>
  );
}
