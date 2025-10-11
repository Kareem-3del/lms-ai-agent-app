import { Assignment, Course, Lecture } from '../types/assignment';

export interface SubmissionData {
  assignmentId: string;
  courseId: string;
  comment?: string;
  attachments: Array<{ fileName: string; filePath: string }>;
}

export interface LMSClient {
  getAssignments(): Promise<Assignment[]>;
  getCourses(): Promise<Course[]>;
  getLectures(): Promise<Lecture[]>;
  testConnection(): Promise<boolean>;
  submitAssignment(data: SubmissionData): Promise<{ success: boolean; error?: string }>;
}
