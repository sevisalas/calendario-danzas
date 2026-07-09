import { useEffect, useState, type FormEvent } from 'react';
import type { Member } from '../types';

interface ProfilePanelProps {
  member: Member;
  onSave: (member: Member) => Promise<void>;
  isSaving?: boolean;
}

export function ProfilePanel({ member, onSave, isSaving = false }: ProfilePanelProps) {
  const [username, setUsername] = useState(member.username);
  const [name, setName] = useState(member.name);
  const [password, setPassword] = useState(member.password);

  useEffect(() => {
    setUsername(member.username);
    setName(member.name);
    setPassword(member.password);
  }, [member]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await onSave({
      ...member,
      username: username.trim(),
      name: name.trim(),
      password: password.trim(),
    });
  };

  return (
    <main className="profile-panel">
      <div className="admin-header">
        <div>
          <h2>Mi perfil</h2>
          <p className="admin-copy">Actualiza tus datos de acceso y el nombre que se muestra en la app.</p>
        </div>
      </div>

      <form className="form-card profile-form" onSubmit={(event) => void handleSubmit(event)}>
        <label>
          Usuario
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label>
          Nombre visible
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            required
          />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            required
          />
        </label>
        <div className="modal-actions">
          <button className="primary-btn" type="submit" disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </main>
  );
}
