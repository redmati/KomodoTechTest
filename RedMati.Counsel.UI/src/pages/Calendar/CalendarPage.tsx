import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday,
} from 'date-fns';
import { appointmentsApi } from '../../api/appointments';
import { caseProfilesApi } from '../../api/caseProfiles';
import { Modal, ModalActions } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Badge, statusToBadgeVariant } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PageSpinner } from '../../components/ui/Spinner';
import { useAuthStore } from '../../store/authStore';
import type { ScheduleAppointmentFormData } from '../../types';
import clsx from 'clsx';

const appointmentSchema = z.object({
  profileId: z.coerce.number().min(1, 'Case profile is required'),
  scheduledAt: z.string().min(1, 'Date and time is required'),
  durationMinutes: z.coerce.number().min(15),
});

const DURATION_OPTIONS = [
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
];

export function CalendarPage() {
  const { counsellorId } = useParams<{ counsellorId?: string }>();
  const currentUser = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const targetCounsellorId = counsellorId ? Number(counsellorId) : currentUser?.id;

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [prefillDate, setPrefillDate] = useState<string>('');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);

  // ─── Queries ──────────────────────────────────────────────────────────────

  const from = format(startOfMonth(currentMonth), "yyyy-MM-dd'T'00:00:00");
  const to = format(endOfMonth(currentMonth), "yyyy-MM-dd'T'23:59:59");

  const appointmentsQuery = useQuery({
    queryKey: ['appointments', 'calendar', targetCounsellorId, from, to],
    queryFn: () =>
      appointmentsApi.list({ counsellorId: targetCounsellorId, from, to }),
  });

  const profilesQuery = useQuery({
    queryKey: ['case-profiles'],
    queryFn: caseProfilesApi.list,
  });

  // ─── Schedule form ────────────────────────────────────────────────────────

  const form = useForm<ScheduleAppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: { durationMinutes: 60 },
  });

  const createMutation = useMutation({
    mutationFn: (data: ScheduleAppointmentFormData) => appointmentsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments', 'calendar'] });
      setScheduleModalOpen(false);
      form.reset({ durationMinutes: 60 });
    },
  });

  // ─── Calendar grid ────────────────────────────────────────────────────────

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  // Pad to full weeks
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });

  const appointments = appointmentsQuery.data ?? [];

  function getAppointmentsForDay(day: Date) {
    return appointments.filter((a) => isSameDay(new Date(a.scheduledAt), day));
  }

  function handleDayClick(day: Date) {
    const dateStr = format(day, "yyyy-MM-dd'T'09:00");
    setPrefillDate(dateStr);
    form.setValue('scheduledAt', dateStr);
    setScheduleModalOpen(true);
  }

  const selectedAppointment = appointments.find((a) => a.id === selectedAppointmentId);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">
          Calendar
          {counsellorId && (
            <span className="text-sm font-normal text-gray-500 ml-2">
              — Counsellor #{counsellorId}
            </span>
          )}
        </h1>
        <Button size="sm" onClick={() => setScheduleModalOpen(true)}>
          + Schedule Appointment
        </Button>
      </div>

      {/* Month navigation */}
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
          className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="text-base font-semibold text-gray-800 w-36 text-center">
          {format(currentMonth, 'MMMM yyyy')}
        </span>
        <button
          onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
          className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
          aria-label="Next month"
        >
          ›
        </button>
        <button
          onClick={() => setCurrentMonth(new Date())}
          className="ml-2 text-xs text-primary-600 hover:text-primary-800 font-medium"
        >
          Today
        </button>
      </div>

      {appointmentsQuery.isLoading && <PageSpinner />}

      {!appointmentsQuery.isLoading && (
        <>
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <div key={d} className="text-center text-xs font-medium text-gray-500 py-1.5">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 border-l border-t border-gray-200 rounded-xl overflow-hidden bg-white">
            {calDays.map((day) => {
              const dayAppts = getAppointmentsForDay(day);
              const isCurrentMonth = day.getMonth() === currentMonth.getMonth();

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => isCurrentMonth && handleDayClick(day)}
                  className={clsx(
                    'min-h-[90px] border-r border-b border-gray-200 p-1.5',
                    isCurrentMonth
                      ? 'cursor-pointer hover:bg-primary-50 transition-colors'
                      : 'bg-gray-50 cursor-default',
                  )}
                >
                  <span
                    className={clsx(
                      'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium mb-1',
                      isToday(day)
                        ? 'bg-primary-600 text-white'
                        : isCurrentMonth
                          ? 'text-gray-700'
                          : 'text-gray-300',
                    )}
                  >
                    {format(day, 'd')}
                  </span>

                  <div className="space-y-0.5">
                    {dayAppts.slice(0, 3).map((appt) => (
                      <button
                        key={appt.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAppointmentId(appt.id);
                        }}
                        className="w-full text-left text-xs bg-primary-100 text-primary-800 rounded px-1 py-0.5 truncate hover:bg-primary-200 transition-colors"
                      >
                        {format(new Date(appt.scheduledAt), 'HH:mm')}{' '}
                        {appt.profile?.studentName ?? `#${appt.profileId}`}
                      </button>
                    ))}
                    {dayAppts.length > 3 && (
                      <p className="text-xs text-gray-400 pl-1">+{dayAppts.length - 3} more</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Appointment detail popover */}
      <Modal
        isOpen={Boolean(selectedAppointmentId)}
        title="Appointment"
        onClose={() => setSelectedAppointmentId(null)}
        size="sm"
      >
        {selectedAppointment && (
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium text-gray-600">Student: </span>
              {selectedAppointment.profile?.studentName ?? '—'}
            </p>
            <p>
              <span className="font-medium text-gray-600">Date: </span>
              {format(new Date(selectedAppointment.scheduledAt), 'EEEE dd MMM yyyy, HH:mm')}
            </p>
            <p>
              <span className="font-medium text-gray-600">Duration: </span>
              {selectedAppointment.durationMinutes} min
            </p>
            <p className="flex items-center gap-2">
              <span className="font-medium text-gray-600">Status: </span>
              <Badge
                label={selectedAppointment.status}
                variant={statusToBadgeVariant(selectedAppointment.status)}
              />
            </p>
          </div>
        )}
      </Modal>

      {/* Schedule modal */}
      <Modal
        isOpen={scheduleModalOpen}
        title="Schedule Appointment"
        onClose={() => {
          setScheduleModalOpen(false);
          form.reset({ durationMinutes: 60 });
        }}
        footer={
          <ModalActions
            onCancel={() => {
              setScheduleModalOpen(false);
              form.reset({ durationMinutes: 60 });
            }}
            onConfirm={form.handleSubmit((d) => createMutation.mutate(d))}
            confirmLabel="Schedule"
            loading={createMutation.isPending}
          />
        }
      >
        <form className="space-y-4" noValidate>
          <Select
            label="Case Profile *"
            options={
              profilesQuery.data
                ?.filter((p) => p.status === 'ACTIVE')
                .map((p) => ({
                  value: p.id,
                  label: `${p.studentName} (${p.schoolYear})`,
                })) ?? []
            }
            placeholder="Select a case profile"
            {...form.register('profileId')}
            error={form.formState.errors.profileId?.message}
          />
          <Input
            label="Date & Time *"
            type="datetime-local"
            defaultValue={prefillDate}
            {...form.register('scheduledAt')}
            error={form.formState.errors.scheduledAt?.message}
          />
          <Select
            label="Duration *"
            options={DURATION_OPTIONS}
            {...form.register('durationMinutes')}
            error={form.formState.errors.durationMinutes?.message}
          />
        </form>
      </Modal>
    </div>
  );
}
