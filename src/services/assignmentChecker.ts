import { Notification } from 'electron';
import { LMSClient } from '../clients/lmsClient';
import { LMSClientFactory } from '../clients/lmsClientFactory';
import { Assignment, Lecture } from '../types/assignment';
import { SettingsManager } from './settingsManager';

export class AssignmentChecker {
  private settingsManager: SettingsManager;
  private client: LMSClient | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private lastAssignments: Map<string, Assignment> = new Map();
  private isChecking = false;

  constructor(settingsManager: SettingsManager) {
    this.settingsManager = settingsManager;
    this.initialize();
  }

  private async initialize() {
    const config = this.settingsManager.getSettings();
    console.log('Initializing with config:', {
      lmsUrl: config.lmsUrl,
      lmsType: config.lmsType,
      hasToken: !!config.apiToken,
      hasUsername: !!config.username,
      hasPassword: !!config.password,
      useCredentialLogin: config.useCredentialLogin
    });

    if (!this.settingsManager.isConfigured()) {
      console.log('LMS not configured yet');
      return;
    }

    try {
      this.client = LMSClientFactory.createClient(config);
      console.log('Client created successfully');

      const connected = await this.client.testConnection();
      console.log('Connection test result:', connected);

      if (connected) {
        console.log('Successfully connected to LMS');
        this.startPolling();
      } else {
        console.error('Failed to connect to LMS');
      }
    } catch (error) {
      console.error('Error initializing LMS client:', error);
    }
  }

  private startPolling() {
    this.stopPolling();

    const config = this.settingsManager.getSettings();
    const intervalMs = config.checkInterval * 60 * 1000;

    this.checkForAssignments();

    this.intervalId = setInterval(() => {
      this.checkForAssignments();
    }, intervalMs);
  }

  private stopPolling() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async checkForAssignments() {
    if (this.isChecking || !this.client) return;

    this.isChecking = true;
    console.log('Checking for assignments...');

    try {
      const assignments = await this.client.getAssignments();
      const newAssignments = this.findNewAssignments(assignments);

      if (newAssignments.length > 0) {
        this.notifyNewAssignments(newAssignments);
      }

      this.lastAssignments.clear();
      assignments.forEach(assignment => {
        this.lastAssignments.set(assignment.id, assignment);
      });

      console.log(`Found ${assignments.length} assignments, ${newAssignments.length} new`);
    } catch (error) {
      console.error('Error checking assignments:', error);
    } finally {
      this.isChecking = false;
    }
  }

  private findNewAssignments(currentAssignments: Assignment[]): Assignment[] {
    if (this.lastAssignments.size === 0) {
      return [];
    }

    return currentAssignments.filter(
      assignment => !this.lastAssignments.has(assignment.id)
    );
  }

  private notifyNewAssignments(assignments: Assignment[]) {
    const config = this.settingsManager.getSettings();

    for (const assignment of assignments) {
      const notification = new Notification({
        title: 'New Assignment',
        body: `${assignment.name}\nDue: ${this.formatDueDate(assignment.dueDate)}\nCourse: ${assignment.courseName}`,
        silent: !config.soundEnabled,
        urgency: 'critical'
      });

      notification.show();
    }
  }

  private formatDueDate(dueDate: string): string {
    const date = new Date(dueDate);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      return `in ${hours} hour${hours !== 1 ? 's' : ''}`;
    }

    return `in ${days} day${days !== 1 ? 's' : ''}`;
  }

  async checkNow() {
    await this.checkForAssignments();
  }

  async getAssignments(): Promise<Assignment[]> {
    if (!this.client) {
      console.log('No client available for getAssignments');
      return [];
    }
    try {
      console.log('Calling client.getAssignments()...');
      const assignments = await this.client.getAssignments();
      console.log(`client.getAssignments() returned ${assignments.length} assignments`);
      return assignments;
    } catch (error) {
      console.error('Error getting assignments:', error);
      return [];
    }
  }

  async getCourses() {
    if (!this.client) {
      console.log('No client available for getCourses');
      return [];
    }
    try {
      console.log('Calling client.getCourses()...');
      const courses = await this.client.getCourses();
      console.log(`client.getCourses() returned ${courses.length} courses`);
      return courses;
    } catch (error) {
      console.error('Error getting courses:', error);
      return [];
    }
  }

  async getLectures(): Promise<Lecture[]> {
    if (!this.client) {
      console.log('No client available for getLectures');
      return [];
    }
    try {
      console.log('Calling client.getLectures()...');
      const lectures = await this.client.getLectures();
      console.log(`client.getLectures() returned ${lectures.length} lectures`);
      return lectures;
    } catch (error) {
      console.error('Error getting lectures:', error);
      return [];
    }
  }

  async restart() {
    console.log('Restarting assignment checker...');
    this.stopPolling();
    await this.initialize();
  }

  stop() {
    this.stopPolling();
  }
}
