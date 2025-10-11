import { LMSClient } from './lmsClient';
import { CanvasClient } from './canvasClient';
import { MoodleClient } from './moodleClient';
import { LMSConfig } from '../types/assignment';

export class LMSClientFactory {
  static createClient(config: LMSConfig): LMSClient {
    const { lmsType, lmsUrl, apiToken } = config;

    switch (lmsType) {
      case 'canvas':
        return new CanvasClient(lmsUrl, apiToken);
      case 'moodle':
        return new MoodleClient(lmsUrl, apiToken);
      case 'blackboard':
        throw new Error('Blackboard support coming soon');
      default:
        throw new Error(`Unsupported LMS type: ${lmsType}`);
    }
  }
}
