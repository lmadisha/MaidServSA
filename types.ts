export enum UserRole {
  CLIENT = 'CLIENT',
  MAID = 'MAID',
}

export enum JobStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ApplicationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar: string;
  rating: number;
  bio?: string;
  location?: string;
}

export interface Job {
  id: string;
  clientId: string;
  title: string;
  description: string;
  location: string;
  areaSize: number; // in square meters
  price: number;
  currency: string;
  date: string; // ISO date string
  status: JobStatus;
  rooms: number;
  bathrooms: number;
  images: string[];
  assignedMaidId?: string;
}

export interface Application {
  id: string;
  jobId: string;
  maidId: string;
  status: ApplicationStatus;
  message: string;
  appliedAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  jobId: string;
}
