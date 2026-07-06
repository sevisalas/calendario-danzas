import { useEffect, useState, type FormEvent } from 'react';
import type { Member } from '../types';

interface MemberFormProps {
  initialMember?: Member | null;
  onSubmit: (member: Member) => void | Promise<void>;
  onCancel?: () => void;
}

const emptyMember = (): Member => ({
  id: crypto.randomUUID(),
  name: '',
  active: true,
  isAdmin: false,
  createdAt: new Date().toISOString(),
});

export function MemberForm({ initialMember, onSubmit, onCancel }: MemberFormProps) {
  const [member, setMember] = useState<Member>(emptyMember());

  useEffect(() => {
    if (initialMember) {
      setMember(initialMember);
    } else {
      setMember(emptyMember());
    }
  }, [initialMember]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...member,
      id: initialMember?.id ?? crypto.randomUUID(),
      name: member.name.trim(),
      createdAt: initialMember?.createdAt ?? new Date().toISOString(),
    });
  };

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <h3>{initialMember ? 'Editar miembro' : 'Crear miembro'}</h3>
      <label>
        Nombre
        <input value={member.name} onChange={(e) => setMember({ ...member, name: e.target.value })} required />
      </label>
      <label>
        Activo
        <select value={member.active ? 'Sí' : 'No'} onChange={(e) => setMember({ ...member, active: e.target.value === 'Sí' })}>
          <option value="Sí">Sí</option>
          <option value="No">No</option>
        </select>
      </label>
      <label className="checkbox-field">
        <input
          type="checkbox"
          checked={member.isAdmin}
          onChange={(e) => setMember({ ...member, isAdmin: e.target.checked })}
        />
        Administrador
      </label>
      <div className="modal-actions">
        {onCancel && <button type="button" className="secondary-btn" onClick={onCancel}>Cancelar</button>}
        <button type="submit" className="primary-btn">Guardar</button>
      </div>
    </form>
  );
}
