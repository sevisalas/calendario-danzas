export type AttendanceStatus = 'Sí' | 'No' | 'Quizás';
export type AttendanceFormStatus = AttendanceStatus | 'En blanco';

export interface Member {
  id: string;
  name: string;
  active: boolean;
  isAdmin: boolean;
  password: string;
  createdAt: string;
}

export interface DanceEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  clothingRequired: boolean;
  notes: string;
  imageUrl: string;
  active: boolean;
  finished: boolean;
  createdAt: string;
}

export interface Attendance {
  id: string;
  eventId: string;
  memberId: string;
  status: AttendanceStatus;
  comment: string;
  updatedAt: string;
}

export interface AppData {
  members: Member[];
  events: DanceEvent[];
  attendances: Attendance[];
}
