import type { AppData, Attendance, AttendanceStatus, DanceEvent, Member } from './types';
import * as baserowProvider from './storage/baserowProvider';

const LOCAL_STORAGE_KEY = 'calendario-danzas-local-data';
const DATA_SOURCE = import.meta.env.VITE_DATA_SOURCE as DataSourceMode | undefined;
const VALID_ATTENDANCE_STATUSES: AttendanceStatus[] = ['Sí', 'No', 'Quizás'];

export type DataSourceMode = 'local' | 'baserow';
export type RealDataOrigin = 'baserow' | 'localStorage' | 'internalSeed' | 'none';

export interface DataSourceMeta {
  configuredMode: DataSourceMode;
  realOrigin: RealDataOrigin;
  eventCount: number;
  lastLoadedAt: string;
  lastError: string | null;
}

export interface StorageResult {
  data: AppData;
  meta: DataSourceMeta;
}

function nowIso(): string {
  return new Date().toISOString();
}

function createId(): string {
  return crypto.randomUUID();
}

function getRelativeDate(days: number): string {
  const nextDate = new Date();
  nextDate.setHours(12, 0, 0, 0);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate.toISOString().slice(0, 10);
}

function createDefaultMembers(): Member[] {
  return [
    { id: createId(), name: 'Leonor', active: true, isAdmin: true, password: '1234', createdAt: nowIso() },
    { id: createId(), name: 'Sevi', active: true, isAdmin: false, password: '1234', createdAt: nowIso() },
  ];
}

function createSampleEvents(): DanceEvent[] {
  return [
    {
      id: createId(),
      title: 'Dansà en la plaza',
      date: getRelativeDate(7),
      time: '19:30',
      location: 'Plaza Mayor',
      clothingRequired: true,
      notes: 'Llevar pañuelo',
      imageUrl: '',
      active: true,
      finished: false,
      createdAt: nowIso(),
    },
    {
      id: createId(),
      title: 'Ensayo general',
      date: getRelativeDate(10),
      time: '20:00',
      location: 'Casa de Cultura',
      clothingRequired: false,
      notes: 'Repasar entrada y salida',
      imageUrl: '',
      active: true,
      finished: false,
      createdAt: nowIso(),
    },
  ];
}

function createDefaultData(): AppData {
  return {
    members: createDefaultMembers(),
    events: createSampleEvents(),
    attendances: [],
  };
}

function normalizeData(data: Partial<AppData>): AppData {
  const members = (data.members ?? [])
    .filter((member) => member.id && member.name)
    .map((member) => ({
      ...member,
      active: member.active ?? true,
      isAdmin: member.isAdmin ?? false,
      password: member.password ?? '',
      createdAt: member.createdAt || nowIso(),
    }));

  const events = (data.events ?? [])
    .filter((event) => event.id && event.title)
    .map((event) => ({
      ...event,
      clothingRequired: event.clothingRequired ?? false,
      notes: event.notes ?? '',
      imageUrl: event.imageUrl ?? '',
      active: event.active ?? true,
      finished: event.finished ?? false,
      createdAt: event.createdAt || nowIso(),
    }));

  const attendanceByMemberAndEvent = new Map<string, Attendance>();
  (data.attendances ?? []).forEach((attendance) => {
    if (!VALID_ATTENDANCE_STATUSES.includes(attendance.status)) {
      return;
    }

    attendanceByMemberAndEvent.set(`${attendance.eventId}:${attendance.memberId}`, {
      ...attendance,
      comment: attendance.comment ?? '',
      updatedAt: attendance.updatedAt || nowIso(),
    });
  });

  return {
    members,
    events,
    attendances: Array.from(attendanceByMemberAndEvent.values()),
  };
}

function createResult(data: AppData, realOrigin: RealDataOrigin, lastError: string | null = null): StorageResult {
  const normalizedData = normalizeData(data);
  return {
    data: normalizedData,
    meta: {
      configuredMode: getConfiguredDataSource(),
      realOrigin,
      eventCount: normalizedData.events.length,
      lastLoadedAt: nowIso(),
      lastError,
    },
  };
}

function readLocalStorage(): AppData | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return normalizeData(JSON.parse(raw) as Partial<AppData>);
  } catch {
    return null;
  }
}

function writeLocalStorage(data: AppData): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalizeData(data)));
  }
}

function applyLocalChange(data: AppData, update: (currentData: AppData) => AppData): StorageResult {
  const nextData = normalizeData(update(normalizeData(data)));
  writeLocalStorage(nextData);
  return createResult(nextData, 'localStorage');
}

async function runBaserow(operation: () => Promise<AppData>): Promise<StorageResult> {
  return createResult(await operation(), 'baserow');
}

function getLocalData(): AppData {
  const existingData = readLocalStorage();
  if (existingData) {
    return existingData;
  }

  const data = createDefaultData();
  writeLocalStorage(data);
  return data;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(String(reader.result ?? ''));
    };
    reader.onerror = () => {
      reject(new Error('No se ha podido leer la imagen'));
    };
    reader.readAsDataURL(file);
  });
}

export function getConfiguredDataSource(): DataSourceMode {
  return DATA_SOURCE === 'local' ? 'local' : 'baserow';
}

export async function loadData(): Promise<StorageResult> {
  if (getConfiguredDataSource() === 'baserow') {
    return runBaserow(baserowProvider.getAllData);
  }

  const localData = readLocalStorage();
  if (localData) {
    return createResult(localData, 'localStorage');
  }

  const data = createDefaultData();
  writeLocalStorage(data);
  return createResult(data, 'internalSeed');
}

export async function addMember(member: Member): Promise<StorageResult> {
  if (getConfiguredDataSource() === 'baserow') {
    return runBaserow(() => baserowProvider.saveMember(member));
  }

  return applyLocalChange(getLocalData(), (data) => ({
    ...data,
    members: [...data.members, member],
  }));
}

export async function updateMember(member: Member): Promise<StorageResult> {
  if (getConfiguredDataSource() === 'baserow') {
    return runBaserow(() => baserowProvider.saveMember(member));
  }

  return applyLocalChange(getLocalData(), (data) => ({
    ...data,
    members: data.members.map((item) => (item.id === member.id ? member : item)),
  }));
}

export async function addEvent(event: DanceEvent): Promise<StorageResult> {
  if (getConfiguredDataSource() === 'baserow') {
    return runBaserow(() => baserowProvider.saveEvent(event));
  }

  return applyLocalChange(getLocalData(), (data) => ({
    ...data,
    events: [...data.events, event],
  }));
}

export async function updateEvent(event: DanceEvent): Promise<StorageResult> {
  if (getConfiguredDataSource() === 'baserow') {
    return runBaserow(() => baserowProvider.saveEvent(event));
  }

  return applyLocalChange(getLocalData(), (data) => ({
    ...data,
    events: data.events.map((item) => (item.id === event.id ? event : item)),
  }));
}

export async function deleteEvent(eventId: string): Promise<StorageResult> {
  if (getConfiguredDataSource() === 'baserow') {
    return runBaserow(() => baserowProvider.deleteEvent(eventId));
  }

  return applyLocalChange(getLocalData(), (data) => ({
    ...data,
    events: data.events.filter((event) => event.id !== eventId),
    attendances: data.attendances.filter((attendance) => attendance.eventId !== eventId),
  }));
}

export async function uploadEventImage(file: File): Promise<string> {
  if (getConfiguredDataSource() === 'baserow') {
    return baserowProvider.uploadFile(file);
  }

  return readFileAsDataUrl(file);
}

export async function addAttendance(attendance: Attendance): Promise<StorageResult> {
  if (getConfiguredDataSource() === 'baserow') {
    return runBaserow(() => baserowProvider.saveAttendance(attendance));
  }

  return applyLocalChange(getLocalData(), (data) => ({
    ...data,
    attendances: [
      ...data.attendances.filter(
        (item) => !(item.eventId === attendance.eventId && item.memberId === attendance.memberId),
      ),
      attendance,
    ],
  }));
}

export async function removeAttendance(eventId: string, memberId: string): Promise<StorageResult> {
  if (getConfiguredDataSource() === 'baserow') {
    return runBaserow(() => baserowProvider.clearAttendance(eventId, memberId));
  }

  return applyLocalChange(getLocalData(), (data) => ({
    ...data,
    attendances: data.attendances.filter(
      (attendance) => !(attendance.eventId === eventId && attendance.memberId === memberId),
    ),
  }));
}

export async function saveSampleEvents(): Promise<StorageResult> {
  if (getConfiguredDataSource() === 'baserow') {
    throw new Error('Los datos de prueba no se pueden crear desde la app en modo Baserow');
  }

  const currentData = getLocalData();
  const data = normalizeData({
    ...currentData,
    members: currentData.members.length > 0 ? currentData.members : createDefaultMembers(),
    events: [...currentData.events, ...createSampleEvents()],
  });

  writeLocalStorage(data);
  return createResult(data, 'localStorage');
}
