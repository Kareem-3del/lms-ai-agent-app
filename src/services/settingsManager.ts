import Store from 'electron-store';
import { LMSConfig } from '../types/assignment';

export class SettingsManager {
  private store: Store<LMSConfig>;

  constructor() {
    this.store = new Store<LMSConfig>({
      name: 'lms-center-config',
      encryptionKey: 'lms-center-secure-key',
      defaults: {
        lmsType: 'canvas',
        lmsUrl: '',
        apiToken: '',
        username: '',
        password: '',
        useCredentialLogin: true,
        checkInterval: 15,
        soundEnabled: true,
        autoDownload: true,
        downloadPath: '',
        geminiApiKey: '',
        geminiModel: 'gemini-2.0-flash-exp',
        extraRules: '',
        pdfHeaderFields: ['name', 'id'],
        useHandwriting: true,
        handwritingFont: 'Homemade Apple',
        handwritingColor: '#2d2d2d',
        fontSize: 18,
        paperStyle: 'aged-vintage'
      }
    });
  }

  getSettings(): LMSConfig {
    return {
      lmsType: this.store.get('lmsType'),
      lmsUrl: this.store.get('lmsUrl'),
      apiToken: this.store.get('apiToken'),
      username: this.store.get('username'),
      password: this.store.get('password'),
      useCredentialLogin: this.store.get('useCredentialLogin'),
      checkInterval: this.store.get('checkInterval'),
      soundEnabled: this.store.get('soundEnabled'),
      autoDownload: this.store.get('autoDownload'),
      downloadPath: this.store.get('downloadPath'),
      geminiApiKey: this.store.get('geminiApiKey'),
      geminiModel: this.store.get('geminiModel'),
      extraRules: this.store.get('extraRules'),
      pdfHeaderFields: this.store.get('pdfHeaderFields'),
      useHandwriting: this.store.get('useHandwriting'),
      handwritingFont: this.store.get('handwritingFont'),
      handwritingColor: this.store.get('handwritingColor'),
      fontSize: this.store.get('fontSize'),
      paperStyle: this.store.get('paperStyle')
    };
  }

  saveSettings(config: Partial<LMSConfig>): void {
    if (config.lmsType) this.store.set('lmsType', config.lmsType);
    if (config.lmsUrl) this.store.set('lmsUrl', config.lmsUrl);
    if (config.apiToken !== undefined) this.store.set('apiToken', config.apiToken);
    if (config.username !== undefined) this.store.set('username', config.username);
    if (config.password !== undefined) this.store.set('password', config.password);
    if (config.useCredentialLogin !== undefined) this.store.set('useCredentialLogin', config.useCredentialLogin);
    if (config.checkInterval !== undefined) this.store.set('checkInterval', config.checkInterval);
    if (config.soundEnabled !== undefined) this.store.set('soundEnabled', config.soundEnabled);
    if (config.autoDownload !== undefined) this.store.set('autoDownload', config.autoDownload);
    if (config.downloadPath !== undefined) this.store.set('downloadPath', config.downloadPath);
    if (config.geminiApiKey !== undefined) this.store.set('geminiApiKey', config.geminiApiKey);
    if (config.geminiModel !== undefined) this.store.set('geminiModel', config.geminiModel);
    if (config.extraRules !== undefined) this.store.set('extraRules', config.extraRules);
    if (config.pdfHeaderFields !== undefined) this.store.set('pdfHeaderFields', config.pdfHeaderFields);
    if (config.useHandwriting !== undefined) this.store.set('useHandwriting', config.useHandwriting);
    if (config.handwritingFont !== undefined) this.store.set('handwritingFont', config.handwritingFont);
    if (config.handwritingColor !== undefined) this.store.set('handwritingColor', config.handwritingColor);
    if (config.fontSize !== undefined) this.store.set('fontSize', config.fontSize);
    if (config.paperStyle !== undefined) this.store.set('paperStyle', config.paperStyle);
  }

  isConfigured(): boolean {
    const config = this.getSettings();
    if (!config.lmsUrl) return false;

    if (config.useCredentialLogin) {
      return !!(config.username && config.password);
    } else {
      return !!config.apiToken;
    }
  }

  clearSettings(): void {
    this.store.clear();
  }
}
