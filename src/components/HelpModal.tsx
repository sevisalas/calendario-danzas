import { useEffect } from 'react';

interface HelpModalProps {
  isAdmin: boolean;
  onClose: () => void;
}

export function HelpModal({ isAdmin, onClose }: HelpModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="help-title">
      <div className="modal-card help-modal">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Manual</p>
            <h2 id="help-title">Ayuda</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar ayuda" title="Cerrar">
            ✕
          </button>
        </div>

        <div className="help-content">
          <section>
            <h3>Eventos</h3>
            <p>Pulsa <strong>Ver detalles</strong> para consultar toda la información de un evento.</p>
            <p><strong>Ver todos</strong> abre todas las fichas y <strong>Ocultar todos</strong> las contrae.</p>
          </section>

          <section>
            <h3>Asistencia</h3>
            <p>Abre un evento y pulsa <strong>Actualizar mi asistencia</strong>. Elige Sí, No o Quizás y guarda la respuesta.</p>
            <p>Seleccionar <strong>En blanco</strong> elimina tu respuesta anterior. <strong>Ver inscritos</strong> muestra las respuestas del grupo.</p>
          </section>

          {!isAdmin && (
            <section>
              <h3>Mi perfil</h3>
              <p>En <strong>Perfil</strong> puedes cambiar tu usuario, nombre visible y contraseña. Pulsa <strong>Calendario</strong> para volver.</p>
            </section>
          )}

          {isAdmin && (
            <section>
              <h3>Administración</h3>
              <p>En <strong>Admin</strong> puedes crear y editar eventos, subir carteles y activar, finalizar o eliminar eventos.</p>
              <p>También puedes crear y editar miembros, cambiar sus permisos y activarlos o desactivarlos.</p>
              <p>El botón <strong>Calendario</strong> vuelve a la lista de eventos.</p>
            </section>
          )}

          <section>
            <h3>Sesión</h3>
            <p>Pulsa <strong>Salir</strong> para cerrar la sesión y volver a la pantalla de acceso.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
