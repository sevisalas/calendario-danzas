import { useEffect, useState } from 'react';
import type { Attendance, DanceEvent, Member } from '../types';
import { formatDateLabel, formatStatus, getAttendanceSummary } from '../utils';

interface EventCardProps {
  event: DanceEvent;
  attendances: Attendance[];
  members: Member[];
  summary: ReturnType<typeof getAttendanceSummary>;
  onUpdateAttendance: () => void;
  onViewInscritos: () => void;
}

export function EventCard({
  event,
  attendances,
  members,
  summary,
  onUpdateAttendance,
  onViewInscritos,
}: EventCardProps) {
  const [hasPosterError, setHasPosterError] = useState(false);
  const memberNames = attendances
    .map((attendance) => members.find((member) => member.id === attendance.memberId)?.name)
    .filter(Boolean) as string[];
  const shouldShowPoster = Boolean(event.imageUrl) && !hasPosterError;

  useEffect(() => {
    setHasPosterError(false);
  }, [event.imageUrl]);

  return (
    <article className="event-card">
      <div className="event-card-content">
        <div className="event-main">
          <div className="event-card-header">
            <div>
              <p className="event-date">{formatDateLabel(event.date)} · {event.time}</p>
              <h2>{event.title}</h2>
              <p className="event-place">{event.location}</p>
            </div>
            <span className={`pill ${event.clothingRequired ? 'pill-yes' : 'pill-no'}`}>
              {event.clothingRequired ? 'Indumentaria requerida' : 'Sin indumentaria'}
            </span>
          </div>

          <div className="event-meta">
            <p><strong>Observaciones:</strong> {event.notes || 'Sin observaciones'}</p>
          </div>

          <div className="counts-row">
            <div className="count-box"><span>Sí</span><strong>{summary.yes}</strong></div>
            <div className="count-box"><span>Quizás</span><strong>{summary.maybe}</strong></div>
            <div className="count-box"><span>No</span><strong>{summary.no}</strong></div>
          </div>

          <div className="event-actions">
            <button className="primary-action" onClick={onUpdateAttendance}>Actualizar mi asistencia</button>
            <button className="secondary-action" onClick={onViewInscritos}>Ver inscritos</button>
          </div>

          {memberNames.length > 0 && (
            <div className="mini-list">
              <p className="mini-title">Respuestas registradas</p>
              <p>
                {attendances.slice(0, 4).map((attendance) => {
                  const member = members.find((item) => item.id === attendance.memberId);
                  return `${member?.name ?? 'Miembro'}: ${formatStatus(attendance.status)}`;
                }).join(', ')}
                {memberNames.length > 4 ? '...' : ''}
              </p>
            </div>
          )}
        </div>

        {shouldShowPoster && (
          <div className="event-poster">
            <img
              src={event.imageUrl}
              alt={`Cartel de ${event.title}`}
              onError={() => setHasPosterError(true)}
            />
          </div>
        )}
      </div>
    </article>
  );
}
