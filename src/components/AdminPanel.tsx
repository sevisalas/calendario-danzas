import { useState } from 'react';
import type { DanceEvent, Member } from '../types';
import { compareEvents, formatDateLabel, getEventStateLabel } from '../utils';
import { EventForm } from './EventForm';
import { MemberForm } from './MemberForm';

interface AdminPanelProps {
  isAdmin: boolean;
  members: Member[];
  events: DanceEvent[];
  onCreateEvent: (event: DanceEvent) => Promise<void>;
  onUpdateEvent: (event: DanceEvent) => Promise<void>;
  onDeleteEvent: (eventId: string) => Promise<void>;
  onUploadEventImage: (file: File) => Promise<string>;
  onCreateMember: (member: Member) => Promise<void>;
  onUpdateMember: (member: Member) => Promise<void>;
  onReloadData: () => Promise<void>;
  isSaving?: boolean;
  onClose: () => void;
}

export function AdminPanel({
  isAdmin,
  members,
  events,
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
  onUploadEventImage,
  onCreateMember,
  onUpdateMember,
  onReloadData,
  isSaving = false,
  onClose,
}: AdminPanelProps) {
  const [editingEvent, setEditingEvent] = useState<DanceEvent | null>(null);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [isEventFormOpen, setIsEventFormOpen] = useState(false);
  const [isMemberFormOpen, setIsMemberFormOpen] = useState(false);

  if (!isAdmin) {
    return null;
  }

  const sortedEvents = [...events].sort(compareEvents);
  const sortedMembers = [...members].sort((a, b) => {
    if (a.active !== b.active) {
      return a.active ? -1 : 1;
    }

    return a.name.localeCompare(b.name);
  });

  return (
    <section className="admin-panel">
      <div className="admin-header">
        <div>
          <h2>Administración</h2>
          <p className="admin-copy">Gestiona eventos, miembros y asistencias.</p>
        </div>
        <div className="inline-actions">
          <button className="secondary-btn" onClick={() => void onReloadData()} disabled={isSaving}>
            Recargar datos
          </button>
          <button className="secondary-btn" onClick={onClose} disabled={isSaving}>Cerrar</button>
        </div>
      </div>

      <div className="admin-grid">
        <div className="admin-card">
          <div className="admin-section-header">
            <h3>Eventos</h3>
            <button className="primary-btn" disabled={isSaving} onClick={() => {
              setEditingEvent(null);
              setIsEventFormOpen((value) => !value);
            }}>Crear evento</button>
          </div>
          {isEventFormOpen && (
            <EventForm
              initialEvent={editingEvent}
              onUploadImage={onUploadEventImage}
              onSubmit={async (event) => {
                if (editingEvent) {
                  await onUpdateEvent(event);
                } else {
                  await onCreateEvent(event);
                }
                setEditingEvent(null);
                setIsEventFormOpen(false);
              }}
              onCancel={() => {
                setEditingEvent(null);
                setIsEventFormOpen(false);
              }}
            />
          )}
          <ul className="list-stack">
            {sortedEvents.map((event) => (
              <li key={event.id}>
                <div>
                  <strong>{event.title}</strong>
                  <p>{formatDateLabel(event.date)} · {event.time}</p>
                  <span className={`status-badge ${event.finished ? 'status-no' : event.active ? 'status-yes' : 'status-muted'}`}>
                    {getEventStateLabel(event)}
                  </span>
                </div>
                <div className="inline-actions">
                  <button className="secondary-btn" onClick={() => {
                    setEditingEvent(event);
                    setIsEventFormOpen(true);
                  }} disabled={isSaving}>Editar</button>
                  <button className="secondary-btn" onClick={() => void onUpdateEvent({ ...event, finished: !event.finished })} disabled={isSaving}>
                    {event.finished ? 'Reabrir' : 'Finalizar'}
                  </button>
                  <button className="secondary-btn" onClick={() => void onUpdateEvent({ ...event, active: !event.active })} disabled={isSaving}>
                    {event.active ? 'Desactivar' : 'Activar'}
                  </button>
                  <button className="secondary-btn" onClick={() => void onDeleteEvent(event.id)} disabled={isSaving}>Eliminar</button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="admin-card">
          <div className="admin-section-header">
            <h3>Miembros</h3>
            <button className="primary-btn" disabled={isSaving} onClick={() => {
              setEditingMember(null);
              setIsMemberFormOpen((value) => !value);
            }}>Crear miembro</button>
          </div>
          {isMemberFormOpen && (
            <MemberForm
              initialMember={editingMember}
              onSubmit={async (member) => {
                if (editingMember) {
                  await onUpdateMember(member);
                } else {
                  await onCreateMember(member);
                }
                setEditingMember(null);
                setIsMemberFormOpen(false);
              }}
              onCancel={() => {
                setEditingMember(null);
                setIsMemberFormOpen(false);
              }}
            />
          )}
          <ul className="list-stack">
            {sortedMembers.map((member) => (
              <li key={member.id}>
                <div>
                  <strong>{member.name}</strong>
                  <span className={`status-badge ${member.active ? 'status-yes' : 'status-muted'}`}>
                    {member.active ? 'Activo' : 'Desactivado'}
                  </span>
                </div>
                <div className="inline-actions">
                  <button className="secondary-btn" onClick={() => {
                    setEditingMember(member);
                    setIsMemberFormOpen(true);
                  }} disabled={isSaving}>Editar</button>
                  <button className="secondary-btn" onClick={() => void onUpdateMember({ ...member, active: !member.active })} disabled={isSaving}>
                    {member.active ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
