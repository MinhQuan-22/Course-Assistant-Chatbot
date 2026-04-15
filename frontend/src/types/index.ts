export type UserRole = 'student' | 'teacher' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: UserRole;
}

export interface Course {
  id: string;
  name: string;
  code: string;
  teacherId: string;
  teacherName: string;
  studentCount: number;
  documentCount: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: {
    document_name?: string;
    chunk_index?: number;
  }[];
  isStreaming?: boolean;
}

export interface Source {
  documentName: string;
  page: number;
  snippet: string;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  courseId: string;
  courseName: string;
  uploadedAt: Date;
  uploadedBy: string;
  status: 'processing' | 'ready' | 'error';
}

export interface Conversation {
  id: string;
  title: string;
  courseId: string;
  courseName: string;
  lastMessage: string;
  updatedAt: Date;
  messageCount: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}
