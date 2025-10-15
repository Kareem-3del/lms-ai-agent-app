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
        fontSize: 18, // Basic handwriting font size (used when useHandwriting is true in basic mode)
        paperStyle: 'aged-vintage',
        rotationVariance: 0.5,
        spacingVariance: 5,
        wordSpacingVariance: 10,
        baselineVariance: 0.8,
        inkDensityVariance: 25,
        blurVariance: 15,
        sizeVariance: 3,
        enableMarginDoodles: true,
        enableInkSpots: true,
        // Advanced handwriting settings
        paperBackground: 'plain-white',
        tableBackground: 'none',
        customFont: 'font1',
        fontSizeAdvanced: 30, // Advanced handwriting font size (used in advanced settings section)
        lineHeight: 1.30,
        letterSpacing: 0,
        wordSpacing: 0,
        enableBlur: false,
        enableShading: false,
        enablePaperShadow: false,
        enablePaperTexture: true,
        enableShadowSilhouette: false,
        enablePaperRotation: false,
        enableInkFlow: false,
        marginTop: 20,
        marginRight: 20,
        marginBottom: 20,
        marginLeft: 20,
        mirrorMargins: false,
        marginTopEven: 20,
        marginRightEven: 20,
        marginBottomEven: 20,
        marginLeftEven: 20,
        randomWordRotation: false,
        randomLetterRotation: false,
        randomIndentation: false,
        indentationRange: 5,
        enableHyphenation: false,
        paragraphSpacing: 0,
        outputFormat: 'pdf',
        outputQuality: 'normal',
        pageSize: 'a4'
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
      paperStyle: this.store.get('paperStyle'),
      rotationVariance: this.store.get('rotationVariance'),
      spacingVariance: this.store.get('spacingVariance'),
      wordSpacingVariance: this.store.get('wordSpacingVariance'),
      baselineVariance: this.store.get('baselineVariance'),
      inkDensityVariance: this.store.get('inkDensityVariance'),
      blurVariance: this.store.get('blurVariance'),
      sizeVariance: this.store.get('sizeVariance'),
      enableMarginDoodles: this.store.get('enableMarginDoodles'),
      enableInkSpots: this.store.get('enableInkSpots'),
      // Advanced handwriting settings
      paperBackground: this.store.get('paperBackground'),
      tableBackground: this.store.get('tableBackground'),
      customFont: this.store.get('customFont'),
      fontSizeAdvanced: this.store.get('fontSizeAdvanced'),
      lineHeight: this.store.get('lineHeight'),
      letterSpacing: this.store.get('letterSpacing'),
      wordSpacing: this.store.get('wordSpacing'),
      enableBlur: this.store.get('enableBlur'),
      enableShading: this.store.get('enableShading'),
      enablePaperShadow: this.store.get('enablePaperShadow'),
      enablePaperTexture: this.store.get('enablePaperTexture'),
      enableShadowSilhouette: this.store.get('enableShadowSilhouette'),
      enablePaperRotation: this.store.get('enablePaperRotation'),
      enableInkFlow: this.store.get('enableInkFlow'),
      marginTop: this.store.get('marginTop'),
      marginRight: this.store.get('marginRight'),
      marginBottom: this.store.get('marginBottom'),
      marginLeft: this.store.get('marginLeft'),
      mirrorMargins: this.store.get('mirrorMargins'),
      marginTopEven: this.store.get('marginTopEven'),
      marginRightEven: this.store.get('marginRightEven'),
      marginBottomEven: this.store.get('marginBottomEven'),
      marginLeftEven: this.store.get('marginLeftEven'),
      randomWordRotation: this.store.get('randomWordRotation'),
      randomLetterRotation: this.store.get('randomLetterRotation'),
      randomIndentation: this.store.get('randomIndentation'),
      indentationRange: this.store.get('indentationRange'),
      enableHyphenation: this.store.get('enableHyphenation'),
      paragraphSpacing: this.store.get('paragraphSpacing'),
      outputFormat: this.store.get('outputFormat'),
      outputQuality: this.store.get('outputQuality'),
      pageSize: this.store.get('pageSize')
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
    if (config.rotationVariance !== undefined) this.store.set('rotationVariance', config.rotationVariance);
    if (config.spacingVariance !== undefined) this.store.set('spacingVariance', config.spacingVariance);
    if (config.wordSpacingVariance !== undefined) this.store.set('wordSpacingVariance', config.wordSpacingVariance);
    if (config.baselineVariance !== undefined) this.store.set('baselineVariance', config.baselineVariance);
    if (config.inkDensityVariance !== undefined) this.store.set('inkDensityVariance', config.inkDensityVariance);
    if (config.blurVariance !== undefined) this.store.set('blurVariance', config.blurVariance);
    if (config.sizeVariance !== undefined) this.store.set('sizeVariance', config.sizeVariance);
    if (config.enableMarginDoodles !== undefined) this.store.set('enableMarginDoodles', config.enableMarginDoodles);
    if (config.enableInkSpots !== undefined) this.store.set('enableInkSpots', config.enableInkSpots);
    // Advanced handwriting settings
    if (config.paperBackground !== undefined) this.store.set('paperBackground', config.paperBackground);
    if (config.tableBackground !== undefined) this.store.set('tableBackground', config.tableBackground);
    if (config.customFont !== undefined) this.store.set('customFont', config.customFont);
    if (config.fontSizeAdvanced !== undefined) this.store.set('fontSizeAdvanced', config.fontSizeAdvanced);
    if (config.lineHeight !== undefined) this.store.set('lineHeight', config.lineHeight);
    if (config.letterSpacing !== undefined) this.store.set('letterSpacing', config.letterSpacing);
    if (config.wordSpacing !== undefined) this.store.set('wordSpacing', config.wordSpacing);
    if (config.enableBlur !== undefined) this.store.set('enableBlur', config.enableBlur);
    if (config.enableShading !== undefined) this.store.set('enableShading', config.enableShading);
    if (config.enablePaperShadow !== undefined) this.store.set('enablePaperShadow', config.enablePaperShadow);
    if (config.enablePaperTexture !== undefined) this.store.set('enablePaperTexture', config.enablePaperTexture);
    if (config.enableShadowSilhouette !== undefined) this.store.set('enableShadowSilhouette', config.enableShadowSilhouette);
    if (config.enablePaperRotation !== undefined) this.store.set('enablePaperRotation', config.enablePaperRotation);
    if (config.enableInkFlow !== undefined) this.store.set('enableInkFlow', config.enableInkFlow);
    if (config.marginTop !== undefined) this.store.set('marginTop', config.marginTop);
    if (config.marginRight !== undefined) this.store.set('marginRight', config.marginRight);
    if (config.marginBottom !== undefined) this.store.set('marginBottom', config.marginBottom);
    if (config.marginLeft !== undefined) this.store.set('marginLeft', config.marginLeft);
    if (config.mirrorMargins !== undefined) this.store.set('mirrorMargins', config.mirrorMargins);
    if (config.marginTopEven !== undefined) this.store.set('marginTopEven', config.marginTopEven);
    if (config.marginRightEven !== undefined) this.store.set('marginRightEven', config.marginRightEven);
    if (config.marginBottomEven !== undefined) this.store.set('marginBottomEven', config.marginBottomEven);
    if (config.marginLeftEven !== undefined) this.store.set('marginLeftEven', config.marginLeftEven);
    if (config.randomWordRotation !== undefined) this.store.set('randomWordRotation', config.randomWordRotation);
    if (config.randomLetterRotation !== undefined) this.store.set('randomLetterRotation', config.randomLetterRotation);
    if (config.randomIndentation !== undefined) this.store.set('randomIndentation', config.randomIndentation);
    if (config.indentationRange !== undefined) this.store.set('indentationRange', config.indentationRange);
    if (config.enableHyphenation !== undefined) this.store.set('enableHyphenation', config.enableHyphenation);
    if (config.paragraphSpacing !== undefined) this.store.set('paragraphSpacing', config.paragraphSpacing);
    if (config.outputFormat !== undefined) this.store.set('outputFormat', config.outputFormat);
    if (config.outputQuality !== undefined) this.store.set('outputQuality', config.outputQuality);
    if (config.pageSize !== undefined) this.store.set('pageSize', config.pageSize);
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
