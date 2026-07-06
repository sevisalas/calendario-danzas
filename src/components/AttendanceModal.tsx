import { useEffect, useState, type FormEvent } from 'react';
import type { Attendance, AttendanceFormStatus, DanceEvent, Member } from '../types';
import { formatDateLabel, formatStatus, getAttendanceSummary } from '../utils';

interface AttendanceModalProps {
  event: DanceEvent;
  currentMember: Member;
  members: Member[];
  attendances?: Attendance[];
  mode?: 'edit' | 'view';
  onClose: () => void;
  onSave: (attendance: Attendance) => Promise<void>;
  onRemove?: (eventId: string, memberId: string) => Promise<void>;
  isSaving?: boolean;
}

export function AttendanceModal({
  event,
  currentMember,
  members,
  attendances = [],
  mode = 'edit',
  onClose,
  onSave,
  onRemove,
  isSaving = false,
}: AttendanceModalProps) {
  const [status, setStatus] = useState<AttendanceFormStatus>('En blanco');
  const [comment, setComment] = useState('');

  useEffect(() => {
    const selectedAttendance = attendances.find((attendance) => attendance.memberId === currentMember.id);
    if (selectedAttendance) {
      setStatus(selectedAttendance.status as AttendanceFormStatus);
      setComment(selectedAttendance.comment);
    } else {
      setStatus('En blanco');
      setComment('');
    }
  }, [attendances, currentMember.id]);

  const visibleAttendances = attendances.filter(
    (attendance) => attendance.status === 'Sí' || attendance.status === 'No' || attendance.status === 'Quizás',
  ).sort((a, b) => {
    const memberA = members.find((member) => member.id === a.memberId)?.name ?? '';
    const memberB = members.find((member) => member.id === b.memberId)?.name ?? '';
    return memberA.localeCompare(memberB);
  });
  const summary = getAttendanceSummary(visibleAttendances);

  const handleSubmit = (formEvent: FormEvent) => {
    formEvent.preventDefault();

    if (status === 'En blanco') {
      void onRemove?.(event.id, currentMember.id);
      return;
    }

    const payload: Attendance = {
      id: attendances.find((attendance) => attendance.memberId === currentMember.id)?.id ?? crypto.randomUUID(),
      eventId: event.id,
      memberId: currentMember.id,
      status,
      comment,
      updatedAt: new Date().toISOString(),
    };

    void onSave(payload);
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Asistencia</p>
            <h3>{event.title}</h3>
            <p className="modal-subtitle">{formatDateLabel(event.date)} · {event.time}</p>
          </div>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        {mode === 'view' ? (
          <div className="modal-body">
            <p className="modal-copy">Respuestas registradas para este evento.</p>
            <div className="counts-row compact-counts">
              <div className="count-box"><span>Sí</span><strong>{summary.yes}</strong></div>
              <div className="count-box"><span>Quizás</span><strong>{summary.maybe}</strong></div>
              <div className="count-box"><span>No</span><strong>{summary.no}</strong></div>
            </div>
            {visibleAttendances.length === 0 ? (
              <p className="empty-state">Todavía no hay respuestas para este evento.</p>
            ) : (
              <ul className="inscrito-list">
                {visibleAttendances.map((attendance) => {
                  const member = members.find((item) => item.id === attendance.memberId);
                  return (
                    <li key={attendance.id}>
                      <div className="inscrito-row">
                        <strong>{member?.name ?? 'Miembro'}</strong>
                        <span className={`status-badge status-${attendance.status === 'Sí' ? 'yes' : attendance.status === 'No' ? 'no' : 'maybe'}`}>
                          {formatStatus(attendance.status)}
                        </span>
                      </div>
                      {attendance.comment && <p>{attendance.comment}</p>}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : (
          <form className="modal-body" onSubmit={handleSubmit}>
            <div className="read-only-field">
              <span>Evento</span>
              <strong>{event.title}</strong>
              <small>{formatDateLabel(event.date)} · {event.time}</small>
            </div>

            <div className="read-only-field">
              <span>Estás respondiendo como</span>
              <strong>{currentMember.name}</strong>
            </div>

            <label>
              Asistencia
              <select value={status} onChange={(event) => setStatus(event.target.value as AttendanceFormStatus)}>
                <option value="Sí">Sí</option>
                <option value="No">No</option>
                <option value="Quizás">Quizás</option>
                <option value="En blanco">En blanco</option>
              </select>
            </label>

            <label>
              Comentario opcional
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                rows={3}
                disabled={status === 'En blanco'}
                placeholder={status === 'En blanco' ? 'Se eliminará la respuesta guardada' : 'Ej. llego un poco más tarde'}
              />
            </label>

            <div className="modal-actions">
              <button type="button" className="secondary-btn" onClick={onClose} disabled={isSaving}>Cancelar</button>
              <button type="submit" className="primary-btn" disabled={isSaving}>
                {isSaving ? 'Guardando...' : status === 'En blanco' ? 'Eliminar respuesta' : 'Guardar asistencia'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
