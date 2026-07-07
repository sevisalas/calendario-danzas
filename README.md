# Calendario de Danzas

Aplicación web sencilla para gestionar eventos y asistencias de un grupo de danzas valencianas.

## Requisitos

- Node.js 18+
- npm

## Instalar dependencias

```bash
npm install
```

## Ejecutar en local

```bash
npm run dev
```

La aplicación quedará disponible en http://localhost:5173.

## Baserow como base de datos

La app usa Baserow como origen de datos cuando `VITE_DATA_SOURCE=baserow`.

Configura [.env.local](.env.local) con:

```env
VITE_DATA_SOURCE=baserow
VITE_SHOW_DIAGNOSTICS=false

VITE_BASEROW_API_URL=https://api.baserow.io
VITE_BASEROW_TOKEN=AQUI_EL_TOKEN_REAL
VITE_BASEROW_EVENTS_TABLE_ID=1063239
VITE_BASEROW_MEMBERS_TABLE_ID=1063241
VITE_BASEROW_ATTENDANCE_TABLE_ID=1063242
```

Si `VITE_DATA_SOURCE=baserow`:

- No se usa `localStorage`.
- No se cargan datos ficticios.
- Si falta token, se muestra `Falta configurar VITE_BASEROW_TOKEN`.
- Si las tablas están vacías, la pantalla principal muestra `No hay eventos pendientes`.

## Tablas

Eventos `1063239`:

- `title`
- `date`
- `time`
- `location`
- `clothingRequired`
- `notes`
- `imageUrl`
- `active`
- `finished`
- `createdAt`

Miembros `1063241`:

- `usuario`
- `nombre`
- `active`
- `Admin`
- `Clave`
- `createdAt`

Asistencias `1063242`:

- `eventId`
- `memberId`
- `status`
- `comment`
- `updatedAt`
- `uniqueKey`

Aunque la tabla se llame “Asistentes”, el código interno usa `attendance`.

## Carteles de eventos

En administración, el formulario de evento permite seleccionar una imagen del ordenador. La app la sube a Baserow y guarda la URL generada en `imageUrl`.

## Acceso

Al abrirla, el usuario escribe su usuario y su clave.

- La contraseña se valida contra el campo `Clave` del miembro en Baserow.
- El usuario se valida contra el campo `usuario` de Baserow, sin distinguir mayúsculas/minúsculas y sin espacios al principio o al final.
- El campo `nombre` se usa solo como nombre visible dentro de la app.
- Si el miembro tiene `Admin=true`, verá la opción de administración.
- Si el miembro tiene `Admin=false`, no verá ninguna opción de administración.

El miembro seleccionado se guarda en `localStorage` con la clave `dance_calendar_member_id`.
La contraseña no se guarda en `localStorage`.

## Modo local

Para pruebas sin Baserow, cambia `VITE_DATA_SOURCE=local`. En ese modo la app usa `localStorage` y puede inicializar datos locales de prueba.
