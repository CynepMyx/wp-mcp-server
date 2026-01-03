/**
 * JWT Authentication Tools
 * MCP Tools für JWT Token Management
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { WordPressClient } from '../wordpress/client.js';
import { JWTAuthManager, JWTConfig } from '../auth/jwt.js';

export function registerJwtTools(server: McpServer, wpClient: WordPressClient, jwtManager?: JWTAuthManager) {
  
  // Erstelle JWT Manager falls nicht übergeben
  const authManager = jwtManager || new JWTAuthManager(wpClient.getConfig());

  server.registerTool(
    'jwt_authenticate',
    {
      title: 'JWT Token holen',
      description: 'Authentifiziert bei WordPress und holt einen JWT Token (erfordert JWT Plugin)',
      inputSchema: {
        username: z.string().optional().describe('WordPress Benutzername (optional, nutzt Env-Variable)'),
        password: z.string().optional().describe('Passwort (optional, nutzt Env-Variable)'),
      },
    },
    async ({ username, password }) => {
      try {
        const result = await authManager.authenticate(username, password);
        
        return {
          content: [{ type: 'text', text: JSON.stringify({
            success: true,
            token: result.token,
            user: {
              email: result.user_email,
              nicename: result.user_nicename,
              displayName: result.user_display_name,
            },
            tokenInfo: authManager.getTokenInfo(),
            usage: {
              header: 'Authorization: Bearer <token>',
              envVariable: 'WORDPRESS_JWT_TOKEN=<token>',
            },
          }, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Authentication failed',
            help: {
              requirement: 'JWT Authentication Plugin muss installiert sein',
              plugins: [
                'JWT Authentication for WP REST API (by Enrique Chavez)',
                'Simple JWT Authentication',
              ],
              installUrl: 'https://wordpress.org/plugins/jwt-authentication-for-wp-rest-api/',
            },
          }, null, 2) }],
        };
      }
    }
  );

  server.registerTool(
    'jwt_validate',
    {
      title: 'JWT Token validieren',
      description: 'Validiert einen JWT Token',
      inputSchema: {
        token: z.string().optional().describe('Token zum Validieren (optional, nutzt aktuellen Token)'),
      },
    },
    async ({ token }) => {
      const isValid = await authManager.validateToken(token);
      const tokenInfo = authManager.getTokenInfo();
      
      return {
        content: [{ type: 'text', text: JSON.stringify({
          isValid,
          tokenInfo,
        }, null, 2) }],
      };
    }
  );

  server.registerTool(
    'jwt_refresh',
    {
      title: 'JWT Token erneuern',
      description: 'Erneuert den aktuellen JWT Token',
      inputSchema: {},
    },
    async () => {
      try {
        const newToken = await authManager.refreshToken();
        
        if (newToken) {
          return {
            content: [{ type: 'text', text: JSON.stringify({
              success: true,
              newToken,
              tokenInfo: authManager.getTokenInfo(),
            }, null, 2) }],
          };
        }
        
        return {
          content: [{ type: 'text', text: JSON.stringify({
            success: false,
            error: 'Token konnte nicht erneuert werden',
            suggestion: 'Verwende jwt_authenticate für neue Authentifizierung',
          }, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Refresh failed',
          }, null, 2) }],
        };
      }
    }
  );

  server.registerTool(
    'jwt_token_info',
    {
      title: 'JWT Token Info',
      description: 'Zeigt Informationen zum aktuellen JWT Token',
      inputSchema: {
        token: z.string().optional().describe('Token zum Analysieren (optional)'),
      },
    },
    async ({ token }) => {
      if (token) {
        authManager.setToken(token);
      }
      
      const info = authManager.getTokenInfo();
      const currentToken = authManager.getToken();
      
      // Dekodiere Token-Payload falls vorhanden
      let payload: Record<string, unknown> | null = null;
      if (currentToken) {
        try {
          const parts = currentToken.split('.');
          if (parts.length === 3) {
            payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
          }
        } catch {
          // Token konnte nicht dekodiert werden
        }
      }
      
      return {
        content: [{ type: 'text', text: JSON.stringify({
          ...info,
          payload: payload ? {
            issuedAt: payload.iat ? new Date((payload.iat as number) * 1000).toISOString() : null,
            expiresAt: payload.exp ? new Date((payload.exp as number) * 1000).toISOString() : null,
            issuer: payload.iss,
            data: payload.data,
          } : null,
        }, null, 2) }],
      };
    }
  );

  server.registerTool(
    'jwt_set_token',
    {
      title: 'JWT Token setzen',
      description: 'Setzt einen JWT Token manuell für die Session',
      inputSchema: {
        token: z.string().describe('JWT Token'),
      },
    },
    async ({ token }) => {
      authManager.setToken(token);
      const info = authManager.getTokenInfo();
      
      return {
        content: [{ type: 'text', text: JSON.stringify({
          success: true,
          message: 'Token wurde gesetzt',
          tokenInfo: info,
        }, null, 2) }],
      };
    }
  );

  server.registerTool(
    'jwt_check_plugin',
    {
      title: 'JWT Plugin prüfen',
      description: 'Prüft ob ein JWT Authentication Plugin installiert ist',
      inputSchema: {},
    },
    async () => {
      const siteUrl = wpClient.getSiteUrl();
      
      // Teste verschiedene JWT Endpoints
      const endpoints = [
        { name: 'JWT Authentication for WP REST API', endpoint: '/jwt-auth/v1' },
        { name: 'Simple JWT Authentication', endpoint: '/simple-jwt-login/v1' },
        { name: 'WP REST API Authentication', endpoint: '/wp-rest-api-authentication/v1' },
      ];
      
      const results = await Promise.all(
        endpoints.map(async (ep) => {
          try {
            const response = await fetch(`${siteUrl}/wp-json${ep.endpoint}`);
            return {
              plugin: ep.name,
              endpoint: ep.endpoint,
              available: response.ok || response.status === 401, // 401 = Endpoint exists but needs auth
              status: response.status,
            };
          } catch {
            return {
              plugin: ep.name,
              endpoint: ep.endpoint,
              available: false,
              status: 0,
            };
          }
        })
      );
      
      const availablePlugin = results.find(r => r.available);
      
      return {
        content: [{ type: 'text', text: JSON.stringify({
          jwtAvailable: !!availablePlugin,
          availablePlugin: availablePlugin?.plugin || null,
          checkedEndpoints: results,
          recommendation: !availablePlugin ? {
            message: 'Kein JWT Plugin gefunden',
            suggestedPlugin: 'JWT Authentication for WP REST API',
            installUrl: 'https://wordpress.org/plugins/jwt-authentication-for-wp-rest-api/',
            alternativAuth: 'Verwende stattdessen Application Passwords (WordPress 5.6+)',
          } : null,
        }, null, 2) }],
      };
    }
  );

  server.registerTool(
    'auth_status',
    {
      title: 'Authentifizierungsstatus',
      description: 'Zeigt den aktuellen Authentifizierungsstatus und -methode',
      inputSchema: {},
    },
    async () => {
      const tokenInfo = authManager.getTokenInfo();
      const authMode = process.env.WORDPRESS_AUTH_MODE || 'auto';
      
      // Teste ob Authentifizierung funktioniert
      let authWorking = false;
      let currentUser = null;
      
      try {
        const response = await wpClient.customRequest<{
          id: number;
          username: string;
          name: string;
          email: string;
          roles: string[];
        }>('/wp/v2/users/me', 'GET', undefined, { context: 'edit' });
        
        authWorking = true;
        currentUser = {
          id: response.data.id,
          username: response.data.username,
          name: response.data.name,
          email: response.data.email,
          roles: response.data.roles,
        };
      } catch {
        authWorking = false;
      }
      
      return {
        content: [{ type: 'text', text: JSON.stringify({
          authWorking,
          authMode,
          method: tokenInfo.hasToken ? 'JWT Bearer Token' : 'Basic Auth (Application Password)',
          jwt: tokenInfo,
          currentUser,
          envVariables: {
            WORDPRESS_SITE_URL: process.env.WORDPRESS_SITE_URL ? 'set' : 'missing',
            WORDPRESS_USERNAME: process.env.WORDPRESS_USERNAME ? 'set' : 'missing',
            WORDPRESS_APP_PASSWORD: process.env.WORDPRESS_APP_PASSWORD ? 'set' : 'missing',
            WORDPRESS_JWT_TOKEN: process.env.WORDPRESS_JWT_TOKEN ? 'set' : 'not set',
            WORDPRESS_AUTH_MODE: process.env.WORDPRESS_AUTH_MODE || 'not set (default: auto)',
          },
        }, null, 2) }],
      };
    }
  );
}
