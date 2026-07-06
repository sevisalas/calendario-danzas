import { useEffect, useMemo, useState } from 'react';
import type { Attendance, DanceEvent, Member } from './types';
import { addAttendance, addEvent, addMember, deleteEvent, getConfiguredDataSource, loadData, removeAttendance, saveSampleEvents, updateEvent, updateMember, type DataSourceMeta, type StorageResult } from './storage';
import { getAttendanceSummary, isEventPending, compareEvents } from './utils';
import { EventCard } from './components/EventCard';
import { AttendanceModal } from './components/AttendanceModal';
import { AdminPanel } from './components/AdminPanel';

const MEMBER_STORAGE_KEY = 'dance_calendar_member_id';
const ADMIN_VERIFIED_STORAGE_KEY = 'dance_calendar_admin_verified';
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || '1234';
const showDiagnostics = import.meta.env.VITE_SHOW_DIAGNOSTICS === 'true';

function App() {
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<DanceEvent[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<DanceEvent | null>(null);
  const [modalMode, setModalMode] = useState<'edit' | 'view' | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(() => window.localStorage.getItem(MEMBER_STORAGE_KEY));
  const [adminPassword, setAdminPassword] = useState('');
  const [adminVerified, setAdminVerified] = useState(() => window.localStorage.getItem(ADMIN_VERIFIED_STORAGE_KEY) === 'true');
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [dataMeta, setDataMeta] = useState<DataSourceMeta>(() => ({
    configuredMode: getConfiguredDataSource(),
    realOrigin: 'none',
    eventCount: 0,
    lastLoadedAt: '',
    lastError: null,
  }));

  const currentMember = useMemo(() => {
    if (!currentMemberId) {
      return null;
    }

    return members.find((member) => member.id === currentMemberId && member.active) ?? null;
  }, [currentMemberId, members]);
  const needsAdminPassword = currentMember?.isAdmin === true && !adminVerified;
  const isAuthenticated = currentMember !== null && !needsAdminPassword;
  const isAdmin = currentMember?.isAdmin === true && adminVerified;

  useEffect(() => {
    void refreshData(false);
  }, []);

  useEffect(() => {
    if (!currentMemberId || !hasLoadedData) {
      return;
    }

    const savedMember = members.find((member) => member.id === currentMemberId);
    if (!savedMember || !savedMember.active) {
      window.localStorage.removeItem(MEMBER_STORAGE_KEY);
      window.localStorage.removeItem(ADMIN_VERIFIED_STORAGE_KEY);
      setCurrentMemberId(null);
      setAdminVerified(false);
      setIsAdminOpen(false);
      closeAttendanceModal();
    }
  }, [currentMemberId, hasLoadedData, members]);

  const pendingEvents = useMemo(() => {
    return [...events]
      .filter((event) => isEventPending(event))
      .sort(compareEvents);
  }, [events]);

  const activeMembers = useMemo(() => {
    return members.filter((member) => member.active);
  }, [members]);

  const syncState = (result: StorageResult) => {
    setMembers(result.data.members);
    setEvents(result.data.events);
    setAttendances(result.data.attendances);
    setDataMeta(result.meta);
    setHasLoadedData(true);
  };

  const getSourceMessage = (meta: DataSourceMeta) => {
    if (meta.realOrigin === 'baserow') {
      return 'Datos actualizados';
    }

    if (meta.realOrigin === 'localStorage') {
      return 'Datos locales de prueba';
    }

    return 'Datos de prueba internos';
  };

  const showTemporaryMessage = (nextMessage: string) => {
    setMessage(nextMessage);
    window.setTimeout(() => {
      setMessage((currentMessage) => (currentMessage === nextMessage ? '' : currentMessage));
    }, 2500);
  };

  const getTechnicalMessage = (error: unknown) => {
    return error instanceof Error ? error.message : '';
  };

  const setDataSourceError = (error: unknown) => {
    const technicalMessage = getTechnicalMessage(error);
    const errorMessage = technicalMessage || 'No se han podido cargar los datos';
    setMembers([]);
    setEvents([]);
    setAttendances([]);
    setHasLoadedData(true);
    setDataMeta({
      configuredMode: getConfiguredDataSource(),
      realOrigin: 'none',
      eventCount: 0,
      lastLoadedAt: new Date().toISOString(),
      lastError: errorMessage,
    });
    setMessage(showDiagnostics && technicalMessage ? errorMessage : 'No se han podido cargar los datos');
  };

  const refreshData = async (showSuccessMessage = true) => {
    try {
      const result = await loadData();
      syncState(result);
      if (showSuccessMessage) {
        setMessage(getSourceMessage(result.meta));
      }
    } catch (error) {
      setDataSourceError(error);
    }
  };

  const openAttendanceModal = (event: DanceEvent, mode: 'edit' | 'view') => {
    setSelectedEvent(event);
    setModalMode(mode);
  };

  const closeAttendanceModal = () => {
    setSelectedEvent(null);
    setModalMode(null);
  };

  const handleSaveAttendance = async (attendance: Attendance) => {
    setIsSaving(true);
    try {
      const result = await addAttendance(attendance);
      syncState(result);
      showTemporaryMessage('Asistencia actualizada');
      closeAttendanceModal();
    } catch (error) {
      const technicalMessage = getTechnicalMessage(error);
      setMessage(showDiagnostics && technicalMessage ? technicalMessage : 'No se ha podido guardar la asistencia');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveAttendance = async (eventId: string, memberId: string) => {
    setIsSaving(true);
    try {
      const result = await removeAttendance(eventId, memberId);
      syncState(result);
      showTemporaryMessage('Asistencia actualizada');
      closeAttendanceModal();
    } catch (error) {
      const technicalMessage = getTechnicalMessage(error);
      setMessage(showDiagnostics && technicalMessage ? technicalMessage : 'No se ha podido guardar la asistencia');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadSampleEvents = async () => {
    setIsSaving(true);
    setMessage('Creando eventos de muestra...');
    try {
      const result = await saveSampleEvents();
      syncState(result);
      setMessage('Datos locales de prueba');
    } catch (error) {
      setDataSourceError(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMemberAccess = () => {
    const member = activeMembers.find((item) => item.id === selectedMemberId);
    if (!member) {
      return;
    }

    window.localStorage.setItem(MEMBER_STORAGE_KEY, member.id);
    window.localStorage.removeItem(ADMIN_VERIFIED_STORAGE_KEY);
    setCurrentMemberId(member.id);
    setAdminVerified(false);
    setAdminPassword('');
    setSelectedMemberId('');
    setMessage('');
  };

  const handleAdminPassword = () => {
    if (adminPassword !== ADMIN_PASSWORD) {
      setMessage('Contraseña incorrecta');
      return;
    }

    window.localStorage.setItem(ADMIN_VERIFIED_STORAGE_KEY, 'true');
    setAdminVerified(true);
    setAdminPassword('');
    setMessage('');
  };

  const handleLogout = () => {
    window.localStorage.removeItem(MEMBER_STORAGE_KEY);
    window.localStorage.removeItem(ADMIN_VERIFIED_STORAGE_KEY);
    setCurrentMemberId(null);
    setAdminVerified(false);
    setAdminPassword('');
    setSelectedMemberId('');
    setIsAdminOpen(false);
    closeAttendanceModal();
    setMessage('');
  };

  const handleCreateEvent = async (event: DanceEvent) => {
    setIsSaving(true);
    try {
      const result = await addEvent(event);
      syncState(result);
      showTemporaryMessage('Evento guardado');
    } catch (error) {
      setDataSourceError(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateEvent = async (event: DanceEvent) => {
    setIsSaving(true);
    try {
      const result = await updateEvent(event);
      syncState(result);
      showTemporaryMessage('Evento guardado');
    } catch (error) {
      setDataSourceError(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (window.confirm('¿Seguro que quieres eliminar este evento?')) {
      setIsSaving(true);
      try {
        const result = await deleteEvent(eventId);
        syncState(result);
        showTemporaryMessage('Datos actualizados');
      } catch (error) {
        setDataSourceError(error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleCreateMember = async (member: Member) => {
    setIsSaving(true);
    try {
      const result = await addMember(member);
      syncState(result);
      showTemporaryMessage('Miembro guardado');
    } catch (error) {
      setDataSourceError(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateMember = async (member: Member) => {
    setIsSaving(true);
    try {
      const result = await updateMember(member);
      syncState(result);
      showTemporaryMessage('Miembro guardado');
    } catch (error) {
      setDataSourceError(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReloadData = async () => {
    await refreshData();
  };

  return (
    <div className="app-shell">
      <header className="app-hero">
        <div className="hero-image" aria-hidden="true"></div>
        <div className="hero-content">
          <div>
            <p className="eyebrow">Grup de ball - Falla Plaça Porta del Sol</p>
            <h1>Calendario de Eventos</h1>
            <p className="hero-copy">Próximos ensayos, actuaciones e indumentaria</p>
          </div>
          <div className="session-actions">
            {isAdmin && (
              <button className="admin-link-btn" onClick={() => setIsAdminOpen((value) => !value)}>
                Administración
              </button>
            )}
            {isAuthenticated && (
              <button className="session-link-btn" onClick={handleLogout}>
                Cambiar usuario
              </button>
            )}
          </div>
        </div>
      </header>

      {message && <div className="message-banner">{message}</div>}

      {!currentMember && (
        <main className="access-card">
          <h2>¿Quién eres?</h2>
          <label>
            Selecciona tu nombre
            <select value={selectedMemberId} onChange={(event) => setSelectedMemberId(event.target.value)}>
              <option value="">{activeMembers.length > 0 ? 'Selecciona tu nombre' : 'No hay miembros activos'}</option>
              {activeMembers.map((member) => (
                <option key={member.id} value={member.id}>{member.name}</option>
              ))}
            </select>
          </label>
          <button className="primary-btn" onClick={handleMemberAccess} disabled={!selectedMemberId}>
            Entrar
          </button>
        </main>
      )}

      {currentMember && needsAdminPassword && (
        <main className="access-card">
          <h2>Contraseña de administración</h2>
          <p>{currentMember.name} puede administrar. Introduce la contraseña para continuar.</p>
          <input
            type="password"
            value={adminPassword}
            onChange={(event) => setAdminPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                handleAdminPassword();
              }
            }}
            placeholder="Contraseña de administración"
          />
          <button className="primary-btn" onClick={handleAdminPassword} disabled={!adminPassword}>
            Entrar
          </button>
          <button className="secondary-btn" onClick={handleLogout}>
            Cambiar usuario
          </button>
        </main>
      )}

      {isAuthenticated && showDiagnostics && (
      <section className="data-source-panel">
        <strong>Origen de datos</strong>
        <dl>
          <div>
            <dt>Modo configurado</dt>
            <dd>{dataMeta.configuredMode}</dd>
          </div>
          <div>
            <dt>Origen real</dt>
            <dd>{dataMeta.realOrigin}</dd>
          </div>
          <div>
            <dt>Eventos recibidos</dt>
            <dd>{dataMeta.eventCount}</dd>
          </div>
          <div>
            <dt>Última carga</dt>
            <dd>{dataMeta.lastLoadedAt || 'Pendiente'}</dd>
          </div>
          <div>
            <dt>Último error</dt>
            <dd>{dataMeta.lastError || 'Ninguno'}</dd>
          </div>
          <div>
            <dt>Miembro actual</dt>
            <dd>{currentMember?.name ?? 'Ninguno'}</dd>
          </div>
          <div>
            <dt>Es admin</dt>
            <dd>{isAdmin ? 'Sí' : 'No'}</dd>
          </div>
        </dl>
      </section>
      )}

      {isAuthenticated && !isAdminOpen && (
        <main className="content-stack">
          {pendingEvents.length === 0 ? (
            <div className="empty-state empty-state-panel">
              <strong>No hay eventos pendientes</strong>
              {getConfiguredDataSource() === 'local' && (
                <>
                  <span>Carga algunos eventos futuros para probar la app con datos locales.</span>
                  <button className="primary-btn" onClick={handleLoadSampleEvents} disabled={isSaving}>
                    Cargar datos de muestra
                  </button>
                </>
              )}
            </div>
          ) : (
            pendingEvents.map((event) => {
              const eventAttendances = attendances.filter((attendance) => attendance.eventId === event.id);
              const summary = getAttendanceSummary(eventAttendances);
              return (
                <EventCard
                  key={event.id}
                  event={event}
                  attendances={eventAttendances}
                  members={members}
                  summary={summary}
                  onUpdateAttendance={() => openAttendanceModal(event, 'edit')}
                  onViewInscritos={() => openAttendanceModal(event, 'view')}
                />
              );
            })
          )}
        </main>
      )}

      {isAuthenticated && isAdmin && isAdminOpen && (
        <AdminPanel
          isAdmin={isAdmin}
          members={members}
          events={events}
          onCreateEvent={handleCreateEvent}
          onUpdateEvent={handleUpdateEvent}
          onDeleteEvent={handleDeleteEvent}
          onCreateMember={handleCreateMember}
          onUpdateMember={handleUpdateMember}
          onReloadData={handleReloadData}
          isSaving={isSaving}
          onClose={() => {
            setIsAdminOpen(false);
          }}
        />
      )}

      {selectedEvent && modalMode && currentMember && (
        <AttendanceModal
          event={selectedEvent}
          currentMember={currentMember}
          mode={modalMode}
          members={members}
          attendances={attendances.filter((attendance) => attendance.eventId === selectedEvent.id)}
          onClose={closeAttendanceModal}
          onSave={handleSaveAttendance}
          onRemove={handleRemoveAttendance}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}

export default App;
