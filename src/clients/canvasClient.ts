import axios, { AxiosInstance } from 'axios';
import { LMSClient, SubmissionData } from './lmsClient';
import { Assignment, Course, Lecture } from '../types/assignment';
import * as fs from 'fs';
import FormData from 'form-data';

export class CanvasClient implements LMSClient {
  private api: AxiosInstance;

  constructor(baseUrl: string, apiToken: string) {
    this.api = axios.create({
      baseURL: `${baseUrl}/api/v1`,
      headers: {
        'Authorization': `Bearer ${apiToken}`
      }
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.api.get('/users/self');
      return true;
    } catch (error) {
      return false;
    }
  }

  async getCourses(): Promise<Course[]> {
    try {
      const response = await this.api.get('/courses', {
        params: {
          enrollment_state: 'active',
          per_page: 100
        }
      });

      console.log(`Found ${response.data.length} courses`);

      return response.data.map((course: any) => ({
        id: course.id.toString(),
        name: course.name
      }));
    } catch (error) {
      console.error('Error fetching courses:', error);
      return [];
    }
  }

  async getAssignments(): Promise<Assignment[]> {
    try {
      const courses = await this.getCourses();
      const allAssignments: Assignment[] = [];

      for (const course of courses) {
        try {
          const response = await this.api.get(`/courses/${course.id}/assignments`, {
            params: {
              per_page: 50,
              order_by: 'due_at'
            }
          });

          console.log(`Course "${course.name}": ${response.data.length} total assignments`);

          const courseAssignments = response.data
            .filter((assignment: any) => {
              const hasDueDate = assignment.due_at !== null && assignment.due_at !== undefined;
              if (!hasDueDate) {
                console.log(`  Skipping "${assignment.name}" - no due date`);
              }
              return hasDueDate;
            })
            .map((assignment: any) => ({
              id: assignment.id.toString(),
              name: assignment.name,
              description: assignment.description || '',
              dueDate: assignment.due_at,
              courseId: course.id,
              courseName: course.name,
              url: assignment.html_url,
              submitted: assignment.has_submitted_submissions || false,
              submittedDate: assignment.submitted_at || undefined
            }));

          console.log(`  Added ${courseAssignments.length} assignments with due dates`);
          allAssignments.push(...courseAssignments);
        } catch (error) {
          console.error(`Error fetching assignments for course ${course.id}:`, error);
        }
      }

      allAssignments.sort((a, b) =>
        new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      );

      return allAssignments;
    } catch (error) {
      console.error('Error fetching assignments:', error);
      return [];
    }
  }

  async getLectures(): Promise<Lecture[]> {
    try {
      const courses = await this.getCourses();
      const allLectures: Lecture[] = [];

      for (const course of courses) {
        try {
          // Get modules (files, pages, external URLs)
          const modules = await this.api.get(`/courses/${course.id}/modules`, {
            params: {
              include: ['items'],
              per_page: 50
            }
          });

          for (const module of modules.data) {
            if (!module.items) continue;

            for (const item of module.items) {
              if (item.type === 'File' || item.type === 'Page' || item.type === 'ExternalUrl') {
                const attachments = item.type === 'File' ? [{
                  id: item.id.toString(),
                  fileName: item.title,
                  url: item.url || item.html_url || '',
                  contentType: item.content_type
                }] : [];

                allLectures.push({
                  id: item.id.toString(),
                  name: item.title,
                  description: '',
                  courseId: course.id,
                  courseName: course.name,
                  url: item.html_url || item.url || '',
                  attachments
                });
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching lectures for course ${course.id}:`, error);
        }
      }

      console.log(`Found ${allLectures.length} lectures`);
      return allLectures;
    } catch (error) {
      console.error('Error fetching lectures:', error);
      return [];
    }
  }

  async submitAssignment(data: SubmissionData): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`Canvas submission: courseId=${data.courseId}, assignmentId=${data.assignmentId}`);

      // First, upload files if there are any attachments
      const fileIds: string[] = [];

      if (data.attachments && data.attachments.length > 0) {
        console.log(`Uploading ${data.attachments.length} file(s)...`);

        for (const attachment of data.attachments) {
          try {
            console.log(`Uploading file: ${attachment.fileName}`);

            // Step 1: Request upload URL from Canvas
            const uploadRequest = await this.api.post(
              `/courses/${data.courseId}/assignments/${data.assignmentId}/submissions/self/files`,
              {
                name: attachment.fileName,
                size: fs.statSync(attachment.filePath).size,
                content_type: 'application/octet-stream'
              }
            );

            const uploadUrl = uploadRequest.data.upload_url;
            const uploadParams = uploadRequest.data.upload_params;

            // Step 2: Upload file to Canvas
            const formData = new FormData();
            Object.entries(uploadParams).forEach(([key, value]) => {
              formData.append(key, value as string);
            });
            formData.append('file', fs.createReadStream(attachment.filePath));

            const uploadResponse = await axios.post(uploadUrl, formData, {
              headers: formData.getHeaders()
            });

            // Step 3: Confirm upload and get file ID
            if (uploadResponse.data && uploadResponse.data.id) {
              fileIds.push(uploadResponse.data.id.toString());
              console.log(`File uploaded successfully: ${attachment.fileName} (ID: ${uploadResponse.data.id})`);
            }
          } catch (uploadError: any) {
            console.error(`Failed to upload file ${attachment.fileName}:`, uploadError.response?.data || uploadError.message);
            throw new Error(`Failed to upload ${attachment.fileName}: ${uploadError.response?.data?.message || uploadError.message}`);
          }
        }
      }

      // Step 4: Submit the assignment with file IDs
      console.log(`Submitting assignment with ${fileIds.length} file(s)...`);

      const submissionData: any = {
        submission_type: fileIds.length > 0 ? 'online_upload' : 'online_text_entry'
      };

      if (fileIds.length > 0) {
        submissionData.file_ids = fileIds;
      }

      if (data.comment) {
        submissionData.comment = {
          text_comment: data.comment
        };
      }

      const submissionResponse = await this.api.post(
        `/courses/${data.courseId}/assignments/${data.assignmentId}/submissions`,
        submissionData
      );

      console.log('Assignment submitted successfully!');
      return { success: true };
    } catch (error: any) {
      console.error('Error submitting assignment:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errors?.[0]?.message || error.response?.data?.message || error.message || 'Failed to submit assignment'
      };
    }
  }
}
