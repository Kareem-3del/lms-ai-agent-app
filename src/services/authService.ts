import axios, { AxiosInstance } from 'axios';

export interface LoginCredentials {
  username: string;
  password: string;
  lmsUrl: string;
  lmsType: 'canvas' | 'moodle' | 'blackboard';
}

export interface AuthResult {
  success: boolean;
  token?: string;
  error?: string;
}

export class AuthService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      timeout: 30000
    });
  }

  async loginCanvas(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      const response = await this.api.post(
        `${credentials.lmsUrl}/login/oauth2/token`,
        {
          grant_type: 'password',
          username: credentials.username,
          password: credentials.password
        }
      );

      if (response.data.access_token) {
        return {
          success: true,
          token: response.data.access_token
        };
      }

      return {
        success: false,
        error: 'No access token received'
      };
    } catch (error) {
      console.error('Canvas login error:', error);

      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error: error.response?.data?.error_description ||
                 error.response?.data?.message ||
                 'Login failed. Please check your credentials.'
        };
      }

      return {
        success: false,
        error: 'An unexpected error occurred during login'
      };
    }
  }

  async loginMoodle(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      const response = await this.api.post(
        `${credentials.lmsUrl}/login/token.php`,
        null,
        {
          params: {
            username: credentials.username,
            password: credentials.password,
            service: 'moodle_mobile_app'
          }
        }
      );

      if (response.data.token) {
        return {
          success: true,
          token: response.data.token
        };
      }

      return {
        success: false,
        error: response.data.error || 'No token received'
      };
    } catch (error) {
      console.error('Moodle login error:', error);

      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error: error.response?.data?.error ||
                 error.response?.data?.message ||
                 'Login failed. Please check your credentials.'
        };
      }

      return {
        success: false,
        error: 'An unexpected error occurred during login'
      };
    }
  }

  async login(credentials: LoginCredentials): Promise<AuthResult> {
    switch (credentials.lmsType) {
      case 'canvas':
        return this.loginCanvas(credentials);
      case 'moodle':
        return this.loginMoodle(credentials);
      case 'blackboard':
        return {
          success: false,
          error: 'Blackboard authentication not yet implemented'
        };
      default:
        return {
          success: false,
          error: `Unsupported LMS type: ${credentials.lmsType}`
        };
    }
  }

  async refreshToken(
    lmsUrl: string,
    lmsType: 'canvas' | 'moodle' | 'blackboard',
    refreshToken: string
  ): Promise<AuthResult> {
    try {
      if (lmsType === 'canvas') {
        const response = await this.api.post(
          `${lmsUrl}/login/oauth2/token`,
          {
            grant_type: 'refresh_token',
            refresh_token: refreshToken
          }
        );

        if (response.data.access_token) {
          return {
            success: true,
            token: response.data.access_token
          };
        }
      }

      return {
        success: false,
        error: 'Token refresh not supported for this LMS'
      };
    } catch (error) {
      console.error('Token refresh error:', error);
      return {
        success: false,
        error: 'Failed to refresh token'
      };
    }
  }
}
