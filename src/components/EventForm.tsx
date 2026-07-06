import { useEffect, useState, type FormEvent } from 'react';
import type { DanceEvent } from '../types';

interface EventFormProps {
  initialEvent?: DanceEvent | null;
  onSubmit: (event: DanceEvent) => void | Promise<void>;
  onCancel?: () => void;
}

const emptyEvent = (): DanceEvent => ({
  id: crypto.randomUUID(),
  title: '',
  date: '',
  time: '',
  location: '',
  clothingRequired: false,
  notes: '',
  imageUrl: '',
  active: true,
  finished: false,
  createdAt: new Date().toISOString(),
});

export function EventForm({ initialEvent, onSubmit, onCancel }: EventFormProps) {
  const [event, setEvent] = useState<DanceEvent>(emptyEvent());

  useEffect(() => {
    if (initialEvent) {
      setEvent(initialEvent);
    } else {
      setEvent(emptyEvent());
    }
  }, [initialEvent]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...event,
      id: initialEvent?.id ?? crypto.randomUUID(),
      title: event.title.trim(),
      location: event.location.trim(),
      notes: event.notes.trim(),
      imageUrl: event.imageUrl.trim(),
      createdAt: initialEvent?.createdAt ?? new Date().toISOString(),
    });
  };

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <h3>{initialEvent ? 'Editar evento' : 'Crear evento'}</h3>
      <label>
        Título
        <input value={event.title} onChange={(e) => setEvent({ ...event, title: e.target.value })} required />
      </label>
      <label>
        Fecha
        <input type="date" value={event.date} onChange={(e) => setEvent({ ...event, date: e.target.value })} required />
      </label>
      <label>
        Hora
        <input type="time" value={event.time} onChange={(e) => setEvent({ ...event, time: e.target.value })} required />
      </label>
      <label>
        Lugar
        <input value={event.location} onChange={(e) => setEvent({ ...event, location: e.target.value })} required />
      </label>
      <label>
        Indumentaria requerida
        <select value={event.clothingRequired ? 'Sí' : 'No'} onChange={(e) => setEvent({ ...event, clothingRequired: e.target.value === 'Sí' })}>
          <option value="Sí">Sí</option>
          <option value="No">No</option>
        </select>
      </label>
      <label>
        Observaciones
        <textarea value={event.notes} onChange={(e) => setEvent({ ...event, notes: e.target.value })} rows={3} />
      </label>
      <label>
        URL del cartel
        <input
          type="url"
          value={event.imageUrl}
          onChange={(e) => setEvent({ ...event, imageUrl: e.target.value })}
          placeholder="https://..."
        />
      </label>
      <label>
        Activo
        <select value={event.active ? 'Sí' : 'No'} onChange={(e) => setEvent({ ...event, active: e.target.value === 'Sí' })}>
          <option value="Sí">Sí</option>
          <option value="No">No</option>
        </select>
      </label>
      <label>
        Finalizado
        <select value={event.finished ? 'Sí' : 'No'} onChange={(e) => setEvent({ ...event, finished: e.target.value === 'Sí' })}>
          <option value="Sí">Sí</option>
          <option value="No">No</option>
        </select>
      </label>
      <div className="modal-actions">
        {onCancel && <button type="button" className="secondary-btn" onClick={onCancel}>Cancelar</button>}
        <button type="submit" className="primary-btn">Guardar</button>
      </div>
    </form>
  );
}
