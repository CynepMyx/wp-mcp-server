/**
 * JWT Authentication Support für WordPress MCP
 * Ermöglicht Token-basierte Authentifizierung als Alternative zu Application Passwords
 * 
 * Unterstützt:
 * - JWT Authentication for WP REST API (Plugin)
 * - Simple JWT Authentication
 * - Custom JWT Implementierungen
 */

import { WordPressConfig } from '../config/types.js';

export interface JWTConfig {
  token?: string;
  tokenEndpoint?: string;  // Standard: /jwt-auth/v1/token
  refreshEndpoint?: string;
  validateEndpoint?: string;
}

export interface JWTTokenResponse {
  token: string;
  user_email: string;
  user_nicename: string;
  user_display_name: string;
}

export interface JWTValidationResponse {
  code: string;
  data: {
    status: number;
  };
}

/**
 * JWT Authentication Manager
 * Verwaltet JWT Token-Authentifizierung für WordPress REST API
 */
export class JWTAuthManager {
  private config: WordPressConfig;
  private jwtConfig: JWTConfig;
  private currentToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(config: WordPressConfig, jwtConfig?: JWTConfig) {
    this.config = config;
    this.jwtConfig = {
      tokenEndpoint: '/jwt-auth/v1/token',
      refreshEndpoint: '/jwt-auth/v1/token/refresh',
      validateEndpoint: '/jwt-auth/v1/token/validate',
      ...jwtConfig,
    };
    
    // Wenn ein Token bereits übergeben wurde, verwende ihn
    if (jwtConfig?.token) {
      this.currentToken = jwtConfig.token;
    }
  }

  /**
   * Holt einen neuen JWT Token mit Username/Password
   */
  async authenticate(username?: string, password?: string): Promise<JWTTokenResponse> {
    const user = username || this.config.username;
    const pass = password || this.config.applicationPassword;

    const url = `${this.config.siteUrl}/wp-json${this.jwtConfig.tokenEndpoint}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: user,
        password: pass,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' })) as { message?: string };
      throw new Error(`JWT Authentication failed: ${error.message || response.statusText}`);
    }

    const data = await response.json() as JWTTokenResponse;
    this.currentToken = data.token;
    
    // JWT Token dekodieren um Expiry zu extrahieren
    try {
      const payload = this.decodeToken(data.token);
      if (payload.exp) {
        this.tokenExpiry = new Date(payload.exp * 1000);
      }
    } catch {
      // Token-Expiry konnte nicht extrahiert werden
      // Setze Standard-Expiry auf 1 Stunde
      this.tokenExpiry = new Date(Date.now() + 3600 * 1000);
    }

    return data;
  }

  /**
   * Validiert den aktuellen Token
   */
  async validateToken(token?: string): Promise<boolean> {
    const tokenToValidate = token || this.currentToken;
    
    if (!tokenToValidate) {
      return false;
    }

    const url = `${this.config.siteUrl}/wp-json${this.jwtConfig.validateEndpoint}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenToValidate}`,
        },
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json() as JWTValidationResponse;
      return data.code === 'jwt_auth_valid_token';
    } catch {
      return false;
    }
  }

  /**
   * Erneuert den aktuellen Token
   */
  async refreshToken(): Promise<string | null> {
    if (!this.currentToken) {
      return null;
    }

    const url = `${this.config.siteUrl}/wp-json${this.jwtConfig.refreshEndpoint}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.currentToken}`,
        },
      });

      if (!response.ok) {
        // Token konnte nicht erneuert werden, neu authentifizieren
        await this.authenticate();
        return this.currentToken;
      }

      const data = await response.json() as { token: string };
      this.currentToken = data.token;
      
      return this.currentToken;
    } catch {
      return null;
    }
  }

  /**
   * Gibt den Authorization Header für Requests zurück
   */
  getAuthHeader(): string {
    if (this.currentToken) {
      return `Bearer ${this.currentToken}`;
    }
    
    // Fallback zu Basic Auth mit Application Password
    return 'Basic ' + Buffer.from(
      `${this.config.username}:${this.config.applicationPassword}`
    ).toString('base64');
  }

  /**
   * Prüft ob der Token noch gültig ist
   */
  isTokenValid(): boolean {
    if (!this.currentToken) {
      return false;
    }

    if (this.tokenExpiry && this.tokenExpiry < new Date()) {
      return false;
    }

    return true;
  }

  /**
   * Gibt den aktuellen Token zurück
   */
  getToken(): string | null {
    return this.currentToken;
  }

  /**
   * Setzt einen Token manuell
   */
  setToken(token: string): void {
    this.currentToken = token;
    
    try {
      const payload = this.decodeToken(token);
      if (payload.exp) {
        this.tokenExpiry = new Date(payload.exp * 1000);
      }
    } catch {
      this.tokenExpiry = null;
    }
  }

  /**
   * Dekodiert einen JWT Token (ohne Validierung)
   */
  private decodeToken(token: string): { exp?: number; iat?: number; data?: unknown } {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT token format');
    }

    const payload = parts[1];
    const decoded = Buffer.from(payload, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  }

  /**
   * Gibt Token-Informationen zurück
   */
  getTokenInfo(): {
    hasToken: boolean;
    isValid: boolean;
    expiresAt: string | null;
    expiresIn: number | null;
  } {
    return {
      hasToken: !!this.currentToken,
      isValid: this.isTokenValid(),
      expiresAt: this.tokenExpiry?.toISOString() || null,
      expiresIn: this.tokenExpiry 
        ? Math.max(0, Math.floor((this.tokenExpiry.getTime() - Date.now()) / 1000))
        : null,
    };
  }
}

/**
 * Erstellt Konfiguration aus Umgebungsvariablen
 */
export function getJWTConfigFromEnv(): JWTConfig {
  return {
    token: process.env.WORDPRESS_JWT_TOKEN,
    tokenEndpoint: process.env.WORDPRESS_JWT_ENDPOINT || '/jwt-auth/v1/token',
    refreshEndpoint: process.env.WORDPRESS_JWT_REFRESH_ENDPOINT || '/jwt-auth/v1/token/refresh',
    validateEndpoint: process.env.WORDPRESS_JWT_VALIDATE_ENDPOINT || '/jwt-auth/v1/token/validate',
  };
}

/**
 * Erkennt den Authentifizierungsmodus aus Umgebungsvariablen
 */
export function detectAuthMode(): 'jwt' | 'basic' | 'auto' {
  const mode = process.env.WORDPRESS_AUTH_MODE?.toLowerCase();
  
  if (mode === 'jwt') return 'jwt';
  if (mode === 'basic') return 'basic';
  
  // Auto-Detection
  if (process.env.WORDPRESS_JWT_TOKEN) {
    return 'jwt';
  }
  
  return 'basic';
}
