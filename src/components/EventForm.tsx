import { useEffect, useState, type FormEvent } from 'react';
import type { DanceEvent } from '../types';

interface EventFormProps {
  initialEvent?: DanceEvent | null;
  onSubmit: (event: DanceEvent) => void | Promise<void>;
  onUploadImage?: (file: File) => Promise<string>;
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

export function EventForm({ initialEvent, onSubmit, onUploadImage, onCancel }: EventFormProps) {
  const [event, setEvent] = useState<DanceEvent>(emptyEvent());
  const [imageUploadMessage, setImageUploadMessage] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);

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

  const handleImageChange = async (file: File | undefined) => {
    if (!file || !onUploadImage) {
      return;
    }

    setIsUploadingImage(true);
    setImageUploadMessage('');
    try {
      const imageUrl = await onUploadImage(file);
      setEvent((currentEvent) => ({ ...currentEvent, imageUrl }));
      setImageUploadMessage('Cartel subido');
    } catch {
      setImageUploadMessage('No se ha podido subir el cartel');
    } finally {
      setIsUploadingImage(false);
    }
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
        Cartel
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            void handleImageChange(e.target.files?.[0]);
            e.target.value = '';
          }}
          disabled={isUploadingImage || !onUploadImage}
        />
      </label>
      {event.imageUrl && (
        <div className="form-image-preview">
          <img src={event.imageUrl} alt={`Cartel de ${event.title || 'evento'}`} />
          <button type="button" className="secondary-btn" onClick={() => setEvent({ ...event, imageUrl: '' })}>
            Quitar cartel
          </button>
        </div>
      )}
      {imageUploadMessage && <p className="form-hint">{imageUploadMessage}</p>}
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
        <button type="submit" className="primary-btn" disabled={isUploadingImage}>
          {isUploadingImage ? 'Subiendo cartel...' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}
