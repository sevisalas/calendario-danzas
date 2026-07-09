import { useEffect, useMemo, useState } from 'react';
import type { Attendance, DanceEvent, Member } from './types';
import { addAttendance, addEvent, addMember, deleteEvent, getConfiguredDataSource, loadData, removeAttendance, saveSampleEvents, updateEvent, updateMember, uploadEventImage, type DataSourceMeta, type StorageResult } from './storage';
import { getAttendanceSummary, isEventPending, compareEvents } from './utils';
import { EventCard } from './components/EventCard';
import { AttendanceModal } from './components/AttendanceModal';
import { AdminPanel } from './components/AdminPanel';
import { ProfilePanel } from './components/ProfilePanel';
import { HelpModal } from './components/HelpModal';

const MEMBER_STORAGE_KEY = 'dance_calendar_member_id';
const showDiagnostics = import.meta.env.VITE_SHOW_DIAGNOSTICS === 'true';

function App() {
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<DanceEvent[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<DanceEvent | null>(null);
  const [modalMode, setModalMode] = useState<'edit' | 'view' | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [expandedEventIds, setExpandedEventIds] = useState<Set<string>>(() => new Set());
  const [loginName, setLoginName] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(() => window.localStorage.getItem(MEMBER_STORAGE_KEY));
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
  const isAuthenticated = currentMember !== null;
  const isAdmin = currentMember?.isAdmin === true;

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
      setCurrentMemberId(null);
      setIsAdminOpen(false);
      setIsProfileOpen(false);
      setIsHelpOpen(false);
      closeAttendanceModal();
    }
  }, [currentMemberId, hasLoadedData, members]);

  const pendingEvents = useMemo(() => {
    return [...events]
      .filter((event) => isEventPending(event))
      .sort(compareEvents);
  }, [events]);

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

  const toggleEventExpanded = (eventId: string) => {
    setExpandedEventIds((currentIds) => {
      const nextIds = new Set(currentIds);
      if (nextIds.has(eventId)) {
        nextIds.delete(eventId);
      } else {
        nextIds.add(eventId);
      }

      return nextIds;
    });
  };

  const expandAllEvents = () => {
    setExpandedEventIds(new Set(pendingEvents.map((event) => event.id)));
  };

  const collapseAllEvents = () => {
    setExpandedEventIds(new Set());
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

  const handleLogin = () => {
    const enteredName = loginName.trim();
    const enteredPassword = loginPassword.trim();
    const member = members.find((item) => item.username.trim().toLocaleLowerCase() === enteredName.toLocaleLowerCase());

    if (!member) {
      setMessage('Usuario no encontrado');
      return;
    }

    if (member.active !== true) {
      setMessage('Usuario inactivo');
      return;
    }

    const storedPassword = member.password.trim();

    if (!storedPassword) {
      setMessage('Este usuario no tiene clave configurada');
      return;
    }

    if (!enteredPassword || enteredPassword !== storedPassword) {
      setMessage('Clave incorrecta');
      return;
    }

    window.localStorage.setItem(MEMBER_STORAGE_KEY, member.id);
    setCurrentMemberId(member.id);
    setLoginName('');
    setLoginPassword('');
    setMessage('');
  };

  const handleLogout = () => {
    window.localStorage.removeItem(MEMBER_STORAGE_KEY);
    setCurrentMemberId(null);
    setLoginName('');
    setLoginPassword('');
    setIsAdminOpen(false);
    setIsProfileOpen(false);
    setIsHelpOpen(false);
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

  const handleUploadEventImage = async (file: File) => {
    return uploadEventImage(file);
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

  const handleUpdateProfile = async (member: Member) => {
    setIsSaving(true);
    try {
      const result = await updateMember(member);
      syncState(result);
      showTemporaryMessage('Perfil actualizado');
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
            <h1>Calendario de eventos</h1>
            <p className="hero-copy">Próximos ensayos y actuaciones</p>
          </div>
        </div>
      </header>

      {message && <div className="message-banner">{message}</div>}

      {!isAuthenticated && (
        <main className="access-card">
          <h2>Acceso al calendario</h2>
          <label>
            Usuario
            <input
              type="text"
              value={loginName}
              onChange={(event) => setLoginName(event.target.value)}
              placeholder="Escribe tu usuario"
              autoComplete="username"
              required
            />
          </label>
          <label>
            Clave
            <input
              type="password"
              value={loginPassword}
              onChange={(event) => setLoginPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && loginName.trim() && loginPassword.trim()) {
                  handleLogin();
                }
              }}
              autoComplete="current-password"
              placeholder="Escribe tu clave"
              required
            />
          </label>
          <button className="primary-btn" onClick={handleLogin} disabled={!loginName.trim() || !loginPassword.trim()}>
            Entrar
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

      {isAuthenticated && (
        <div className="top-actions">
          {isAdmin && (
            <button className="admin-link-btn" onClick={() => setIsAdminOpen((value) => !value)}>
              {isAdminOpen ? 'Calendario' : 'Admin'}
            </button>
          )}
          {!isAdmin && (
            <button className="admin-link-btn" onClick={() => setIsProfileOpen((value) => !value)}>
              {isProfileOpen ? 'Calendario' : 'Perfil'}
            </button>
          )}
          <button className="expand-button" onClick={expandAllEvents}>
            Ver todos
          </button>
          <button className="expand-button" onClick={collapseAllEvents}>
            Ocultar todos
          </button>
          <button className="session-link-btn" onClick={() => setIsHelpOpen(true)}>
            Ayuda
          </button>
          <button className="session-link-btn" onClick={handleLogout}>
            Salir
          </button>
        </div>
      )}

      {isAuthenticated && !isAdminOpen && !isProfileOpen && (
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
            <>
              {pendingEvents.map((event) => {
                const eventAttendances = attendances.filter((attendance) => attendance.eventId === event.id);
                const summary = getAttendanceSummary(eventAttendances);
                return (
                  <EventCard
                    key={event.id}
                    event={event}
                    attendances={eventAttendances}
                    members={members}
                    summary={summary}
                    isExpanded={expandedEventIds.has(event.id)}
                    onToggleExpanded={() => toggleEventExpanded(event.id)}
                    onUpdateAttendance={() => openAttendanceModal(event, 'edit')}
                    onViewInscritos={() => openAttendanceModal(event, 'view')}
                  />
                );
              })}
            </>
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
          onUploadEventImage={handleUploadEventImage}
          onCreateMember={handleCreateMember}
          onUpdateMember={handleUpdateMember}
          onReloadData={handleReloadData}
          isSaving={isSaving}
          onClose={() => {
            setIsAdminOpen(false);
          }}
        />
      )}

      {isAuthenticated && !isAdmin && isProfileOpen && currentMember && (
        <ProfilePanel
          member={currentMember}
          onSave={handleUpdateProfile}
          isSaving={isSaving}
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

      {isAuthenticated && isHelpOpen && (
        <HelpModal isAdmin={isAdmin} onClose={() => setIsHelpOpen(false)} />
      )}
    </div>
  );
}

export default App;
