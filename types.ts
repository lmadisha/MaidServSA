export enum UserRole {
  CLIENT = 'CLIENT',
  MAID = 'MAID',
  ADMIN = 'ADMIN',
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
  CANCELLED = 'CANCELLED',
}

export enum PaymentType {
  FIXED = 'FIXED',
  HOURLY = 'HOURLY',
}

export interface ExperienceAnswer {
  questionId: string;
  question: string;
  answer: string;
}

export interface User {
  id: string;
  name: string; // Display name (First + Surname)
  email: string;
  role: UserRole;
  avatar: string;
  rating: number;
  ratingCount: number;
  bio?: string;
  location?: string;
  isSuspended?: boolean;
  
  // Personal Details
  firstName?: string;
  middleName?: string;
  surname?: string;
  dateOfBirth?: string;
  address?: string;
  placeOfBirth?: string;
  nationality?: string;
  residencyStatus?: string; // New field for visa/citizenship status
  
  // Extended Profile Details
  languages?: string;
  educationLevel?: string;
  maritalStatus?: string;
  school?: string;

  // Maid Specific
  cvFileName?: string;
  experienceAnswers?: ExperienceAnswer[];
}

export interface Review {
  id: string;
  jobId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  timestamp: string;
}

export interface JobHistoryEntry {
  status: JobStatus;
  timestamp: string;
  note?: string;
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
  date: string; // ISO date string (Primary date for sorting)
  status: JobStatus;
  rooms: number;
  bathrooms: number;
  images: string[];
  assignedMaidId?: string;
  
  // New Fields
  paymentType: PaymentType;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  duration: number;  // Hours
  workDates: string[]; // Array of ISO date strings for all work days
  history: JobHistoryEntry[]; // Log of status changes
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