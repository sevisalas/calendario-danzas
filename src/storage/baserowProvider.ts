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
  active?: boolean;
  finished?: boolean;
  createdAt?: string;
}

interface BaserowMemberRow {
  id: number;
  name?: string;
  active?: boolean;
  isAdmin?: boolean;
  password?: string;
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
  return {
    id: String(row.id),
    title: row.title ?? '',
    date: row.date ?? '',
    time: row.time ?? '',
    location: row.location ?? '',
    clothingRequired: row.clothingRequired ?? false,
    notes: row.notes ?? '',
    active: row.active ?? true,
    finished: row.finished ?? false,
    createdAt: row.createdAt ?? '',
  };
}

function memberFromRow(row: BaserowMemberRow): Member {
  return {
    id: String(row.id),
    name: row.name ?? '',
    active: row.active ?? true,
    isAdmin: row.isAdmin ?? false,
    password: row.password ?? '',
    createdAt: row.createdAt ?? '',
  };
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
    active: event.active,
    finished: event.finished,
    createdAt: event.createdAt,
  };
}

function memberToPayload(member: Member) {
  return {
    name: member.name,
    active: member.active,
    isAdmin: member.isAdmin,
    password: member.password,
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
    members: memberRows.map(memberFromRow).filter((member) => member.name),
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
