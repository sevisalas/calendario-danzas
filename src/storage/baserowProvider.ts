import type { AppData, Attendance, AttendanceStatus, DanceEvent, Member } from '../types';

interface BaserowListResponse<T> {
  next: string | null;
  results: T[];
}

interface BaserowEventRow {
  id: number;
  title?: string;
  date?: string;
  time?: string;
  location?: string;
  clothingRequired?: boolean;
  notes?: string;
  imageUrl?: string | null;
  ImageUrl?: string | null;
  Imagen?: string | null;
  imagen?: string | null;
  cartel?: string | null;
  Cartel?: string | null;
  active?: boolean;
  finished?: boolean;
  createdAt?: string;
}

interface BaserowMemberRow {
  id: number;
  name?: string;
  nombre?: string;
  Nombre?: string;
  nombre_a_mostrar?: string;
  Nombre_a_mostrar?: string;
  usuario?: string;
  Usuario?: string;
  active?: boolean;
  isAdmin?: boolean;
  admin?: boolean;
  Admin?: boolean;
  password?: string | null;
  Password?: string | null;
  clave?: string | null;
  Clave?: string | null;
  contraseña?: string | null;
  Contraseña?: string | null;
  createdAt?: string;
}

interface BaserowAttendanceRow {
  id: number;
  eventId?: string;
  memberId?: string;
  status?: AttendanceStatus | string;
  comment?: string;
  updatedAt?: string;
  uniqueKey?: string;
}

interface BaserowFileUploadResponse {
  url?: string;
  name?: string;
}

const VALID_ATTENDANCE_STATUSES: AttendanceStatus[] = ['Sí', 'No', 'Quizás'];

const config = {
  apiUrl: (import.meta.env.VITE_BASEROW_API_URL as string | undefined) || 'https://api.baserow.io',
  token: import.meta.env.VITE_BASEROW_TOKEN as string | undefined,
  eventsTableId: import.meta.env.VITE_BASEROW_EVENTS_TABLE_ID as string | undefined,
  membersTableId: import.meta.env.VITE_BASEROW_MEMBERS_TABLE_ID as string | undefined,
  attendanceTableId: import.meta.env.VITE_BASEROW_ATTENDANCE_TABLE_ID as string | undefined,
};

function requireConfig() {
  if (!config.token || config.token === 'AQUI_EL_TOKEN_REAL') {
    throw new Error('Falta configurar VITE_BASEROW_TOKEN');
  }

  if (!config.eventsTableId || !config.membersTableId || !config.attendanceTableId) {
    throw new Error('Faltan configurar los IDs de tablas de Baserow');
  }
}

function tableUrl(tableId: string, rowId?: string): string {
  const base = `${config.apiUrl.replace(/\/$/, '')}/api/database/rows/table/${tableId}/`;
  return rowId ? `${base}${rowId}/?user_field_names=true` : `${base}?user_field_names=true`;
}

function userFileUploadUrl(): string {
  return `${config.apiUrl.replace(/\/$/, '')}/api/user-files/upload-file/`;
}

function normalizeBaserowFileUrl(url: string): string {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) {
    return '';
  }

  if (/^(https?:|data:|blob:)/i.test(trimmedUrl)) {
    return trimmedUrl;
  }

  if (trimmedUrl.startsWith('//')) {
    return `https:${trimmedUrl}`;
  }

  const baseUrl = config.apiUrl.replace(/\/$/, '');
  return trimmedUrl.startsWith('/') ? `${baseUrl}${trimmedUrl}` : `${baseUrl}/${trimmedUrl}`;
}

async function baserowFetch<T>(url: string, init?: RequestInit): Promise<T> {
  requireConfig();

  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Token ${config.token}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Baserow ${response.status}: ${detail || response.statusText}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

async function baserowUploadFetch<T>(url: string, body: FormData): Promise<T> {
  requireConfig();

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Token ${config.token}`,
    },
    body,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Baserow ${response.status}: ${detail || response.statusText}`);
  }

  return response.json() as Promise<T>;
}

async function listRows<T>(tableId: string): Promise<T[]> {
  const rows: T[] = [];
  let nextUrl: string | null = tableUrl(tableId);

  while (nextUrl) {
    const page: BaserowListResponse<T> = await baserowFetch<BaserowListResponse<T>>(nextUrl);
    rows.push(...page.results);
    nextUrl = page.next;
  }

  return rows;
}

function eventFromRow(row: BaserowEventRow): DanceEvent {
  const imageUrl = row.imageUrl ?? row.ImageUrl ?? row.Imagen ?? row.imagen ?? row.cartel ?? row.Cartel ?? '';

  return {
    id: String(row.id),
    title: row.title ?? '',
    date: row.date ?? '',
    time: row.time ?? '',
    location: row.location ?? '',
    clothingRequired: row.clothingRequired ?? false,
    notes: row.notes ?? '',
    imageUrl: normalizeBaserowFileUrl(String(imageUrl || '')),
    active: row.active ?? true,
    finished: row.finished ?? false,
    createdAt: row.createdAt ?? '',
  };
}

function getMemberPassword(row: BaserowMemberRow): string {
  const password = row.Clave ?? row.clave ?? row.password ?? row.Password ?? row.contraseña ?? row.Contraseña ?? '';
  return String(password).trim();
}

function getMemberUsername(row: BaserowMemberRow): string {
  const username = row.usuario ?? row.Usuario ?? '';
  return String(username).trim();
}

function getMemberDisplayName(row: BaserowMemberRow): string {
  const name = row.nombre_a_mostrar ?? row.Nombre_a_mostrar ?? row.nombre ?? row.Nombre ?? row.name ?? '';
  return String(name).trim();
}

function memberFromRow(row: BaserowMemberRow): Member {
  const member = {
    id: String(row.id),
    username: getMemberUsername(row),
    name: getMemberDisplayName(row),
    active: row.active ?? true,
    isAdmin: row.Admin ?? row.admin ?? row.isAdmin ?? false,
    password: getMemberPassword(row),
    createdAt: row.createdAt ?? '',
  };

  if (import.meta.env.DEV) {
    console.log('Login member loaded', {
      id: member.id,
      username: member.username,
      name: member.name,
      active: member.active,
      isAdmin: member.isAdmin,
      hasPassword: Boolean(member.password),
      passwordLength: member.password?.length ?? 0,
    });
  }

  return member;
}

function attendanceFromRow(row: BaserowAttendanceRow): Attendance | null {
  if (!VALID_ATTENDANCE_STATUSES.includes(row.status as AttendanceStatus)) {
    return null;
  }

  return {
    id: String(row.id),
    eventId: row.eventId ?? '',
    memberId: row.memberId ?? '',
    status: row.status as AttendanceStatus,
    comment: row.comment ?? '',
    updatedAt: row.updatedAt ?? '',
  };
}

function eventToPayload(event: DanceEvent) {
  return {
    title: event.title,
    date: event.date,
    time: event.time,
    location: event.location,
    clothingRequired: event.clothingRequired,
    notes: event.notes,
    imageUrl: event.imageUrl || '',
    active: event.active,
    finished: event.finished,
    createdAt: event.createdAt,
  };
}

function memberToPayload(member: Member) {
  return {
    usuario: member.username,
    nombre_a_mostrar: member.name,
    active: member.active,
    Admin: member.isAdmin,
    Clave: member.password,
    createdAt: member.createdAt,
  };
}

function attendanceUniqueKey(eventId: string, memberId: string): string {
  return `${eventId}_${memberId}`;
}

function isBaserowRowId(id: string): boolean {
  return /^\d+$/.test(id);
}

function attendanceToPayload(attendance: Attendance) {
  return {
    eventId: attendance.eventId,
    memberId: attendance.memberId,
    status: attendance.status,
    comment: attendance.comment,
    updatedAt: attendance.updatedAt,
    uniqueKey: attendanceUniqueKey(attendance.eventId, attendance.memberId),
  };
}

async function findAttendanceRow(eventId: string, memberId: string): Promise<BaserowAttendanceRow | null> {
  const uniqueKey = attendanceUniqueKey(eventId, memberId);
  const rows = await listRows<BaserowAttendanceRow>(config.attendanceTableId as string);
  return rows.find((row) => row.uniqueKey === uniqueKey) ?? null;
}

export async function getAllData(): Promise<AppData> {
  requireConfig();

  const [eventRows, memberRows, attendanceRows] = await Promise.all([
    listRows<BaserowEventRow>(config.eventsTableId as string),
    listRows<BaserowMemberRow>(config.membersTableId as string),
    listRows<BaserowAttendanceRow>(config.attendanceTableId as string),
  ]);

  return {
    events: eventRows.map(eventFromRow).filter((event) => event.title),
    members: memberRows.map(memberFromRow).filter((member) => member.username && member.name),
    attendances: attendanceRows
      .map(attendanceFromRow)
      .filter((attendance): attendance is Attendance => Boolean(attendance)),
  };
}

export async function saveEvent(event: DanceEvent): Promise<AppData> {
  const payload = eventToPayload(event);

  if (event.id && isBaserowRowId(event.id)) {
    await baserowFetch<BaserowEventRow>(tableUrl(config.eventsTableId as string, event.id), {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  } else {
    await baserowFetch<BaserowEventRow>(tableUrl(config.eventsTableId as string), {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  return getAllData();
}

export async function uploadFile(file: File): Promise<string> {
  const body = new FormData();
  body.append('file', file);

  const uploadedFile = await baserowUploadFetch<BaserowFileUploadResponse>(userFileUploadUrl(), body);
  if (!uploadedFile.url) {
    throw new Error('No se ha podido obtener la URL del archivo subido');
  }

  return normalizeBaserowFileUrl(uploadedFile.url);
}

export async function deleteEvent(id: string): Promise<AppData> {
  await baserowFetch<void>(tableUrl(config.eventsTableId as string, id), {
    method: 'DELETE',
  });

  return getAllData();
}

export async function saveMember(member: Member): Promise<AppData> {
  const payload = memberToPayload(member);

  if (member.id && isBaserowRowId(member.id)) {
    await baserowFetch<BaserowMemberRow>(tableUrl(config.membersTableId as string, member.id), {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  } else {
    await baserowFetch<BaserowMemberRow>(tableUrl(config.membersTableId as string), {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  return getAllData();
}

export async function saveAttendance(attendance: Attendance): Promise<AppData> {
  const existingRow = await findAttendanceRow(attendance.eventId, attendance.memberId);
  const payload = attendanceToPayload(attendance);

  if (existingRow) {
    await baserowFetch<BaserowAttendanceRow>(tableUrl(config.attendanceTableId as string, String(existingRow.id)), {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  } else {
    await baserowFetch<BaserowAttendanceRow>(tableUrl(config.attendanceTableId as string), {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  return getAllData();
}

export async function clearAttendance(eventId: string, memberId: string): Promise<AppData> {
  const existingRow = await findAttendanceRow(eventId, memberId);

  if (existingRow) {
    await baserowFetch<void>(tableUrl(config.attendanceTableId as string, String(existingRow.id)), {
      method: 'DELETE',
    });
  }

  return getAllData();
}
