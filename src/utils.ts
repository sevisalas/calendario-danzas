import type { AttendanceStatus, DanceEvent } from './types';

export function formatStatus(status: AttendanceStatus): string {
  return status;
}

export function formatDateLabel(date: string): string {
  const parsed = parseIsoDate(date);
  if (!parsed) {
    return date;
  }

  return `${parsed.getDate().toString().padStart(2, '0')}/${(parsed.getMonth() + 1).toString().padStart(2, '0')}/${parsed.getFullYear()}`;
}

export function parseIsoDate(date: string): Date | null {
  if (!date) {
    return null;
  }

  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isEventPending(event: DanceEvent, today = new Date()): boolean {
  if (!event.active || event.finished) {
    return false;
  }

  const parsedEventDate = parseIsoDate(event.date);
  if (!parsedEventDate) {
    return false;
  }

  const todayDate = new Date(today);
  todayDate.setHours(0, 0, 0, 0);
  parsedEventDate.setHours(0, 0, 0, 0);

  return parsedEventDate >= todayDate;
}

export function compareEvents(a: DanceEvent, b: DanceEvent): number {
  return getEventDateTime(a).getTime() - getEventDateTime(b).getTime();
}

export function getEventDateTime(event: DanceEvent): Date {
  const dateTime = new Date(`${event.date}T${event.time || '00:00'}:00`);
  return Number.isNaN(dateTime.getTime()) ? new Date(0) : dateTime;
}

export function getEventStateLabel(event: DanceEvent): string {
  if (event.finished) {
    return 'Finalizado';
  }

  if (!event.active) {
    return 'Desactivado';
  }

  return 'Activo';
}

export function getAttendanceSummary(attendances: Array<{ status: AttendanceStatus }>) {
  return {
    yes: attendances.filter((item) => item.status === 'Sí').length,
    no: attendances.filter((item) => item.status === 'No').length,
    maybe: attendances.filter((item) => item.status === 'Quizás').length,
  };
}
