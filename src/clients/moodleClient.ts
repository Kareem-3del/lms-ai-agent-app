import axios, { AxiosInstance } from 'axios';
import { LMSClient, SubmissionData } from './lmsClient';
import { Assignment, Course, Lecture } from '../types/assignment';
import * as fs from 'fs';
import FormData from 'form-data';

export class MoodleClient implements LMSClient {
  private api: AxiosInstance;
  private token: string;

  constructor(baseUrl: string, apiToken: string) {
    this.token = apiToken;
    // Remove trailing slash from baseUrl to avoid double slashes
    const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
    this.api = axios.create({
      baseURL: `${cleanBaseUrl}/webservice/rest/server.php`,
      timeout: 30000, // 30 second timeout
      headers: {
        'User-Agent': 'LMS-Center/1.0'
      }
    });
  }

  private async makeRequest(wsfunction: string, params: any = {}): Promise<any> {
    try {
      const response = await this.api.get('', {
        params: {
          wstoken: this.token,
          wsfunction,
          moodlewsrestformat: 'json',
          ...params
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error calling ${wsfunction}:`, error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const result = await this.makeRequest('core_webservice_get_site_info');
      return !result.exception;
    } catch (error) {
      return false;
    }
  }

  async getCourses(): Promise<Course[]> {
    try {
      // Get current user info first
      const userInfo = await this.makeRequest('core_webservice_get_site_info');
      console.log('Moodle user ID:', userInfo.userid);

      const courses = await this.makeRequest('core_enrol_get_users_courses', {
        userid: userInfo.userid
      });

      console.log('Moodle getCourses raw response:', courses);

      if (courses.exception) {
        console.error('Moodle courses exception:', courses.exception);
        return [];
      }

      if (!Array.isArray(courses)) {
        console.error('Moodle courses is not an array:', typeof courses);
        return [];
      }

      console.log(`Found ${courses.length} Moodle courses`);

      return courses.map((course: any) => ({
        id: course.id.toString(),
        name: course.fullname || course.shortname
      }));
    } catch (error) {
      console.error('Error fetching courses:', error);
      return [];
    }
  }

  async getAssignments(): Promise<Assignment[]> {
    try {
      // Get user info first
      const userInfo = await this.makeRequest('core_webservice_get_site_info');
      const userId = userInfo.userid;
      console.log('Moodle user ID for assignments:', userId);

      const courses = await this.getCourses();
      console.log(`Getting assignments for ${courses.length} courses`);

      if (courses.length === 0) {
        console.log('No courses found, returning empty assignments');
        return [];
      }

      const courseIds = courses.map(c => parseInt(c.id));
      console.log('Course IDs:', courseIds);

      // Build courseids array parameters properly: courseids[0]=534, courseids[1]=532, etc.
      const courseIdsParams: any = {};
      courseIds.forEach((id, index) => {
        courseIdsParams[`courseids[${index}]`] = id;
      });

      const assignments = await this.makeRequest('mod_assign_get_assignments', courseIdsParams);

      console.log('Moodle assignments raw response:', assignments);

      if (assignments.exception) {
        console.error('Moodle assignments exception:', assignments.exception);
        return [];
      }

      if (!assignments.courses) {
        console.error('No courses in assignments response');
        return [];
      }

      const allAssignments: Assignment[] = [];

      for (const courseData of assignments.courses) {
        const course = courses.find(c => c.id === courseData.id.toString());
        if (!course) {
          console.log(`Course ${courseData.id} not found in courses list`);
          continue;
        }

        if (!courseData.assignments) {
          console.log(`Course "${course.name}": No assignments field`);
          continue;
        }

        console.log(`Course "${course.name}": ${courseData.assignments.length} total assignments`);

        for (const assignment of courseData.assignments) {
          if (!assignment.duedate || assignment.duedate === 0) {
            console.log(`  Skipping "${assignment.name}" - no due date`);
            continue;
          }

          const dueDate = new Date(assignment.duedate * 1000);

          // Extract attachments if available
          const attachments = [];
          if (assignment.introattachments && Array.isArray(assignment.introattachments)) {
            for (const file of assignment.introattachments) {
              attachments.push({
                id: file.fileurl || '',
                fileName: file.filename || '',
                url: file.fileurl || '',
                size: file.filesize,
                contentType: file.mimetype
              });
            }
          }

          // Check submission status for this assignment
          let submitted = false;
          let submittedDate: string | undefined = undefined;

          try {
            const submissionStatus = await this.makeRequest('mod_assign_get_submission_status', {
              assignid: assignment.id,
              userid: userId
            });

            console.log(`Submission status for "${assignment.name}":`, submissionStatus);

            // Check if there's a submission
            if (submissionStatus && submissionStatus.lastattempt) {
              const submission = submissionStatus.lastattempt.submission;
              if (submission && submission.status === 'submitted') {
                submitted = true;
                // timemodified is the submission time in Unix timestamp
                if (submission.timemodified) {
                  submittedDate = new Date(submission.timemodified * 1000).toISOString();
                }
              }
            }
          } catch (submissionError) {
            console.error(`Error checking submission status for assignment ${assignment.id}:`, submissionError);
            // Continue with submitted = false if we can't get the status
          }

          allAssignments.push({
            id: assignment.id.toString(),
            name: assignment.name,
            description: assignment.intro || '',
            dueDate: dueDate.toISOString(),
            courseId: course.id,
            courseName: course.name,
            url: '',
            submitted: submitted,
            submittedDate: submittedDate,
            attachments
          });
        }

        console.log(`  Added ${allAssignments.filter(a => a.courseId === course.id).length} assignments with due dates`);
      }

      allAssignments.sort((a, b) =>
        new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      );

      console.log(`Total assignments: ${allAssignments.length}`);
      return allAssignments;
    } catch (error) {
      console.error('Error fetching assignments:', error);
      return [];
    }
  }

  async getLectures(): Promise<Lecture[]> {
    try {
      const courses = await this.getCourses();
      console.log(`Getting lectures for ${courses.length} courses`);

      if (courses.length === 0) {
        console.log('No courses found, returning empty lectures');
        return [];
      }

      const allLectures: Lecture[] = [];

      for (const course of courses) {
        try {
          // Get course contents (modules/resources)
          const contents = await this.makeRequest('core_course_get_contents', {
            courseid: parseInt(course.id)
          });

          console.log(`Course "${course.name}": ${contents.length} sections`);

          for (const section of contents) {
            if (!section.modules) continue;

            for (const module of section.modules) {
              // Filter for resource types (files, URLs, pages, etc.)
              if (module.modname === 'resource' ||
                  module.modname === 'url' ||
                  module.modname === 'page' ||
                  module.modname === 'folder') {

                const attachments = [];
                if (module.contents && Array.isArray(module.contents)) {
                  for (const content of module.contents) {
                    attachments.push({
                      id: content.fileurl || '',
                      fileName: content.filename || module.name,
                      url: content.fileurl || module.url || '',
                      size: content.filesize,
                      contentType: content.mimetype
                    });
                  }
                }

                allLectures.push({
                  id: module.id.toString(),
                  name: module.name,
                  description: module.description || '',
                  courseId: course.id,
                  courseName: course.name,
                  url: module.url || '',
                  attachments,
                  createdDate: module.added ? new Date(module.added * 1000).toISOString() : undefined
                });
              }
            }
          }

          console.log(`  Added ${allLectures.filter(l => l.courseId === course.id).length} lectures from this course`);
        } catch (error) {
          console.error(`Error fetching lectures for course ${course.id}:`, error);
        }
      }

      console.log(`Total lectures: ${allLectures.length}`);
      return allLectures;
    } catch (error) {
      console.error('Error fetching lectures:', error);
      return [];
    }
  }

  async submitAssignment(data: SubmissionData): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`Moodle submission: assignmentId=${data.assignmentId}`);

      // Get user info
      const userInfo = await this.makeRequest('core_webservice_get_site_info');
      const userId = userInfo.userid;

      // Build submission parameters
      const submissionParams: any = {
        assignmentid: parseInt(data.assignmentId)
      };

      // If we have attachments, we need to upload them
      if (data.attachments && data.attachments.length > 0) {
        console.log(`Uploading ${data.attachments.length} file(s) to Moodle...`);

        const fileItemIds: number[] = [];

        for (const attachment of data.attachments) {
          try {
            console.log(`Uploading file: ${attachment.fileName}`);

            // Upload file to Moodle draft area
            const uploadResult = await this.uploadFileToDraftArea(attachment.filePath, attachment.fileName);

            if (uploadResult.itemid) {
              fileItemIds.push(uploadResult.itemid);
              console.log(`File uploaded successfully: ${attachment.fileName} (itemid: ${uploadResult.itemid})`);
            }
          } catch (uploadError: any) {
            console.error(`Failed to upload file ${attachment.fileName}:`, uploadError.message);
            throw new Error(`Failed to upload ${attachment.fileName}: ${uploadError.message}`);
          }
        }

        // Add file plugin data - just the itemid
        if (fileItemIds.length > 0) {
          submissionParams['plugindata[files_filemanager]'] = fileItemIds[0].toString();
        }
      }

      // Add comment if provided
      if (data.comment) {
        submissionParams['plugindata[onlinetext_editor][text]'] = data.comment;
        submissionParams['plugindata[onlinetext_editor][format]'] = '1';
      }

      console.log('Submitting to Moodle with params:', JSON.stringify(submissionParams, null, 2));

      // Save the submission (this saves as draft)
      const result = await this.makeRequest('mod_assign_save_submission', submissionParams);

      console.log('Moodle submission result:', JSON.stringify(result, null, 2));

      // Check for errors
      if (result && result.exception) {
        return {
          success: false,
          error: result.message || 'Submission failed'
        };
      }

      // Empty array means success in Moodle's case (no warnings)
      console.log('Submission saved to draft successfully');

      // Now submit for grading
      try {
        console.log('Submitting for grading with assignmentid:', data.assignmentId);
        const gradingResult = await this.makeRequest('mod_assign_submit_for_grading', {
          assignmentid: parseInt(data.assignmentId)
        });
        console.log('Submit for grading result:', JSON.stringify(gradingResult, null, 2));

        // Check if grading submission failed
        if (gradingResult && gradingResult.exception) {
          console.error('Failed to submit for grading:', gradingResult.message);
          return {
            success: false,
            error: `Files uploaded but could not submit for grading: ${gradingResult.message}`
          };
        }

        console.log('Assignment submitted for grading successfully!');
      } catch (gradingError: any) {
        console.error('Error submitting for grading:', gradingError);
        return {
          success: false,
          error: `Files uploaded but could not submit for grading: ${gradingError.message}`
        };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error submitting assignment:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to submit assignment'
      };
    }
  }

  private async uploadFileToDraftArea(filePath: string, fileName: string): Promise<{ itemid: number }> {
    try {
      // Validate file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File does not exist: ${filePath}`);
      }

      // Get file stats
      const fileStats = fs.statSync(filePath);
      console.log(`File stats: ${filePath} - Size: ${fileStats.size} bytes`);

      // Validate file size
      if (fileStats.size === 0) {
        throw new Error(`File is empty: ${filePath}`);
      }

      if (fileStats.size < 100) {
        console.warn(`WARNING: File size is very small (${fileStats.size} bytes), this might be corrupted: ${filePath}`);
      }

      // Read file
      const fileBuffer = fs.readFileSync(filePath);
      console.log(`Read file buffer: ${fileBuffer.length} bytes`);

      // Create form data for upload
      const formData = new FormData();
      formData.append('token', this.token);
      formData.append('filearea', 'draft');
      formData.append('itemid', '0'); // 0 = create new draft area
      formData.append('filepath', '/');
      formData.append('filename', fileName);
      formData.append('file', fileBuffer, {
        filename: fileName,
        contentType: 'application/octet-stream',
        knownLength: fileStats.size
      });

      // Get base URL from the api instance
      const baseUrl = this.api.defaults.baseURL?.replace('/webservice/rest/server.php', '');
      const uploadUrl = `${baseUrl}/webservice/upload.php`;

      console.log(`Uploading to: ${uploadUrl} (${fileStats.size} bytes)`);

      // Upload the file
      const response = await axios.post(uploadUrl, formData, {
        headers: {
          ...formData.getHeaders()
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 60000 // 60 second timeout for large files
      });

      console.log('Upload response:', JSON.stringify(response.data, null, 2));

      // Moodle returns an array of uploaded files
      if (Array.isArray(response.data) && response.data.length > 0) {
        const uploadedFile = response.data[0];

        // Validate uploaded file size matches
        if (uploadedFile.filesize && uploadedFile.filesize !== fileStats.size) {
          console.warn(`WARNING: Uploaded file size (${uploadedFile.filesize}) does not match local file size (${fileStats.size})`);
        }

        console.log(`File uploaded successfully with itemid: ${uploadedFile.itemid}`);

        return {
          itemid: uploadedFile.itemid
        };
      }

      throw new Error('No file data returned from upload');
    } catch (error: any) {
      console.error('Error uploading file to draft area:', error.response?.data || error.message);
      throw error;
    }
  }
}
