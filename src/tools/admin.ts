/**
 * WordPress Admin Tools
 * Admin-Verwaltung, Dashboard, Settings, Options
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { WordPressClient } from '../wordpress/client.js';

export function registerAdminTools(server: McpServer, wpClient: WordPressClient) {
  
  // ============================================
  // SITE SETTINGS & OPTIONS
  // ============================================

  server.registerTool(
    'admin_get_settings',
    {
      title: 'Site Settings abrufen',
      description: 'Ruft WordPress Site-Einstellungen ab (Titel, Beschreibung, Zeitzone, etc.)',
      inputSchema: {},
    },
    async () => {
      const response = await wpClient.customRequest<{
        name: string;
        description: string;
        url: string;
        home: string;
        gmt_offset: number;
        timezone_string: string;
        namespaces: string[];
        authentication: Record<string, unknown>;
      }>('', 'GET');
      
      return {
        content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }],
      };
    }
  );

  server.registerTool(
    'admin_get_option',
    {
      title: 'WordPress Option abrufen',
      description: 'Ruft eine einzelne WordPress Option aus der wp_options Tabelle ab',
      inputSchema: {
        option: z.string().describe('Option-Name (z.B. blogname, admin_email, etc.)'),
      },
    },
    async ({ option }) => {
      // Versuche über Settings API
      const response = await wpClient.customRequest<{
        [key: string]: unknown;
      }>('/wp/v2/settings', 'GET');
      
      const value = response.data[option];
      
      if (value !== undefined) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ option, value }, null, 2) }],
        };
      }
      
      // Option nicht in Settings API verfügbar
      return {
        content: [{ 
          type: 'text', 
          text: JSON.stringify({ 
            error: 'Option nicht über REST API verfügbar',
            option,
            availableOptions: Object.keys(response.data),
          }, null, 2) 
        }],
      };
    }
  );

  server.registerTool(
    'admin_update_option',
    {
      title: 'WordPress Option aktualisieren',
      description: 'Aktualisiert eine WordPress Option (erfordert Admin-Rechte)',
      inputSchema: {
        option: z.string().describe('Option-Name'),
        value: z.unknown().describe('Neuer Wert'),
      },
    },
    async ({ option, value }) => {
      const response = await wpClient.customRequest<Record<string, unknown>>(
        '/wp/v2/settings',
        'POST',
        { [option]: value }
      );
      
      return {
        content: [{ type: 'text', text: JSON.stringify({
          success: true,
          option,
          newValue: response.data[option],
        }, null, 2) }],
      };
    }
  );

  server.registerTool(
    'admin_list_settings',
    {
      title: 'Alle Settings auflisten',
      description: 'Listet alle über REST API verfügbaren WordPress Settings auf',
      inputSchema: {},
    },
    async () => {
      const response = await wpClient.customRequest<Record<string, unknown>>(
        '/wp/v2/settings',
        'GET'
      );
      
      const settings = Object.entries(response.data).map(([key, value]) => ({
        option: key,
        value: value,
        type: typeof value,
      }));
      
      return {
        content: [{ type: 'text', text: JSON.stringify({
          count: settings.length,
          settings,
        }, null, 2) }],
      };
    }
  );

  // ============================================
  // USER MANAGEMENT
  // ============================================

  server.registerTool(
    'admin_list_users',
    {
      title: 'Benutzer auflisten',
      description: 'Listet alle WordPress-Benutzer mit Rollen und Details auf',
      inputSchema: {
        role: z.string().optional().describe('Filter nach Rolle (administrator, editor, author, etc.)'),
        perPage: z.number().optional().default(20).describe('Anzahl pro Seite'),
        page: z.number().optional().default(1).describe('Seitennummer'),
        search: z.string().optional().describe('Suchbegriff'),
        orderby: z.enum(['id', 'name', 'email', 'registered_date']).optional().describe('Sortierung'),
      },
    },
    async ({ role, perPage, page, search, orderby }) => {
      const response = await wpClient.customRequest<Array<{
        id: number;
        username: string;
        name: string;
        email: string;
        url: string;
        description: string;
        link: string;
        slug: string;
        roles: string[];
        registered_date: string;
        capabilities: Record<string, boolean>;
        avatar_urls: Record<string, string>;
      }>>('/wp/v2/users', 'GET', undefined, {
        per_page: perPage,
        page,
        search,
        roles: role,
        orderby,
        context: 'edit', // Mehr Details
      });
      
      const users = response.data.map(user => ({
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        roles: user.roles,
        registeredDate: user.registered_date,
        profileUrl: user.link,
      }));
      
      return {
        content: [{ type: 'text', text: JSON.stringify({
          count: users.length,
          users,
        }, null, 2) }],
      };
    }
  );

  server.registerTool(
    'admin_get_user',
    {
      title: 'Benutzer-Details abrufen',
      description: 'Ruft detaillierte Informationen zu einem Benutzer ab',
      inputSchema: {
        userId: z.number().describe('Benutzer-ID'),
      },
    },
    async ({ userId }) => {
      const response = await wpClient.customRequest<{
        id: number;
        username: string;
        name: string;
        first_name: string;
        last_name: string;
        email: string;
        url: string;
        description: string;
        link: string;
        locale: string;
        nickname: string;
        slug: string;
        roles: string[];
        registered_date: string;
        capabilities: Record<string, boolean>;
        extra_capabilities: Record<string, boolean>;
        avatar_urls: Record<string, string>;
        meta: Record<string, unknown>;
      }>(`/wp/v2/users/${userId}`, 'GET', undefined, { context: 'edit' });
      
      return {
        content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }],
      };
    }
  );

  server.registerTool(
    'admin_create_user',
    {
      title: 'Benutzer erstellen',
      description: 'Erstellt einen neuen WordPress-Benutzer',
      inputSchema: {
        username: z.string().describe('Benutzername'),
        email: z.string().email().describe('E-Mail-Adresse'),
        password: z.string().describe('Passwort'),
        firstName: z.string().optional().describe('Vorname'),
        lastName: z.string().optional().describe('Nachname'),
        roles: z.array(z.string()).optional().describe('Rollen (z.B. ["subscriber"])'),
        description: z.string().optional().describe('Biografie'),
        url: z.string().optional().describe('Website URL'),
      },
    },
    async ({ username, email, password, firstName, lastName, roles, description, url }) => {
      const response = await wpClient.customRequest<{ id: number; username: string }>(
        '/wp/v2/users',
        'POST',
        {
          username,
          email,
          password,
          first_name: firstName,
          last_name: lastName,
          roles: roles || ['subscriber'],
          description,
          url,
        }
      );
      
      return {
        content: [{ type: 'text', text: JSON.stringify({
          success: true,
          userId: response.data.id,
          username: response.data.username,
        }, null, 2) }],
      };
    }
  );

  server.registerTool(
    'admin_update_user',
    {
      title: 'Benutzer aktualisieren',
      description: 'Aktualisiert einen WordPress-Benutzer',
      inputSchema: {
        userId: z.number().describe('Benutzer-ID'),
        email: z.string().email().optional().describe('Neue E-Mail'),
        firstName: z.string().optional().describe('Vorname'),
        lastName: z.string().optional().describe('Nachname'),
        roles: z.array(z.string()).optional().describe('Neue Rollen'),
        description: z.string().optional().describe('Biografie'),
        nickname: z.string().optional().describe('Nickname'),
        url: z.string().optional().describe('Website URL'),
      },
    },
    async ({ userId, email, firstName, lastName, roles, description, nickname, url }) => {
      const updateData: Record<string, unknown> = {};
      if (email) updateData.email = email;
      if (firstName) updateData.first_name = firstName;
      if (lastName) updateData.last_name = lastName;
      if (roles) updateData.roles = roles;
      if (description) updateData.description = description;
      if (nickname) updateData.nickname = nickname;
      if (url) updateData.url = url;
      
      await wpClient.customRequest(`/wp/v2/users/${userId}`, 'PUT', updateData);
      
      return {
        content: [{ type: 'text', text: JSON.stringify({
          success: true,
          userId,
          updated: Object.keys(updateData),
        }, null, 2) }],
      };
    }
  );

  server.registerTool(
    'admin_delete_user',
    {
      title: 'Benutzer löschen',
      description: 'Löscht einen WordPress-Benutzer (erfordert Reassign)',
      inputSchema: {
        userId: z.number().describe('Benutzer-ID zum Löschen'),
        reassign: z.number().describe('Benutzer-ID für Inhalts-Übernahme'),
        force: z.boolean().optional().default(true).describe('Endgültig löschen'),
      },
    },
    async ({ userId, reassign, force }) => {
      await wpClient.customRequest(`/wp/v2/users/${userId}`, 'DELETE', undefined, {
        reassign,
        force,
      });
      
      return {
        content: [{ type: 'text', text: JSON.stringify({
          success: true,
          deletedUserId: userId,
          contentReassignedTo: reassign,
        }, null, 2) }],
      };
    }
  );

  // ============================================
  // ROLES & CAPABILITIES
  // ============================================

  server.registerTool(
    'admin_list_roles',
    {
      title: 'Benutzerrollen auflisten',
      description: 'Listet alle WordPress-Benutzerrollen mit Capabilities auf',
      inputSchema: {},
    },
    async () => {
      // Rollen werden nicht direkt über REST API exponiert
      // Wir holen sie über einen Custom Endpoint oder inferieren aus Benutzern
      const usersResponse = await wpClient.customRequest<Array<{
        id: number;
        roles: string[];
        capabilities: Record<string, boolean>;
      }>>('/wp/v2/users', 'GET', undefined, { 
        context: 'edit',
        per_page: 100,
      });
      
      // Sammle alle Rollen
      const rolesMap = new Map<string, Set<string>>();
      
      for (const user of usersResponse.data) {
        for (const role of user.roles) {
          if (!rolesMap.has(role)) {
            rolesMap.set(role, new Set());
          }
          // Sammle Capabilities für diese Rolle
          for (const [cap, hasIt] of Object.entries(user.capabilities || {})) {
            if (hasIt) {
              rolesMap.get(role)!.add(cap);
            }
          }
        }
      }
      
      const roles = Array.from(rolesMap.entries()).map(([name, caps]) => ({
        name,
        capabilities: Array.from(caps).sort(),
        capabilityCount: caps.size,
      }));
      
      // Standard WordPress Rollen hinzufügen falls nicht gefunden
      const standardRoles = ['administrator', 'editor', 'author', 'contributor', 'subscriber'];
      for (const role of standardRoles) {
        if (!roles.find(r => r.name === role)) {
          roles.push({ name: role, capabilities: [], capabilityCount: 0 });
        }
      }
      
      return {
        content: [{ type: 'text', text: JSON.stringify({
          count: roles.length,
          roles: roles.sort((a, b) => b.capabilityCount - a.capabilityCount),
        }, null, 2) }],
      };
    }
  );

  // ============================================
  // SITE HEALTH & STATUS
  // ============================================

  server.registerTool(
    'admin_site_health',
    {
      title: 'Site Health Status',
      description: 'Prüft den WordPress Site Health Status (Security, Performance)',
      inputSchema: {},
    },
    async () => {
      // Site Health wird über Custom Endpoint oder Analyse ermittelt
      const [siteInfo, plugins, themes] = await Promise.all([
        wpClient.customRequest<{
          name: string;
          description: string;
          url: string;
          namespaces: string[];
        }>('', 'GET').catch(() => ({ data: null })),
        wpClient.customRequest<Array<{
          plugin: string;
          status: string;
          name: string;
          version: string;
          requires_wp: string;
          requires_php: string;
        }>>('/wp/v2/plugins', 'GET').catch(() => ({ data: [] })),
        wpClient.customRequest<Array<{
          stylesheet: string;
          status: string;
          name: string;
          version: string;
          requires_wp: string;
          requires_php: string;
        }>>('/wp/v2/themes', 'GET').catch(() => ({ data: [] })),
      ]);
      
      const activePlugins = plugins.data?.filter(p => p.status === 'active') || [];
      const inactivePlugins = plugins.data?.filter(p => p.status === 'inactive') || [];
      const activeTheme = themes.data?.find(t => t.status === 'active');
      
      // Sicherheits-Checks
      const securityChecks = [
        {
          check: 'REST API erreichbar',
          status: siteInfo.data ? 'pass' : 'fail',
        },
        {
          check: 'Plugins aktuell',
          status: activePlugins.length > 0 ? 'info' : 'pass',
          info: `${activePlugins.length} aktive Plugins`,
        },
        {
          check: 'Inaktive Plugins',
          status: inactivePlugins.length > 5 ? 'warning' : 'pass',
          info: `${inactivePlugins.length} inaktive Plugins (sollten entfernt werden)`,
        },
      ];
      
      const output = {
        site: {
          name: siteInfo.data?.name,
          url: siteInfo.data?.url,
          restApiNamespaces: siteInfo.data?.namespaces?.length || 0,
        },
        plugins: {
          total: plugins.data?.length || 0,
          active: activePlugins.length,
          inactive: inactivePlugins.length,
        },
        theme: activeTheme ? {
          name: activeTheme.name,
          version: activeTheme.version,
        } : null,
        securityChecks,
        recommendations: [
          inactivePlugins.length > 3 ? 'Entferne nicht benötigte Plugins' : null,
          !activeTheme?.version ? 'Theme-Version prüfen' : null,
        ].filter(Boolean),
      };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
      };
    }
  );

  // ============================================
  // APPLICATION PASSWORDS
  // ============================================

  server.registerTool(
    'admin_list_app_passwords',
    {
      title: 'Application Passwords auflisten',
      description: 'Listet alle Application Passwords für einen Benutzer auf',
      inputSchema: {
        userId: z.number().optional().describe('Benutzer-ID (Standard: aktueller Benutzer)'),
      },
    },
    async ({ userId }) => {
      const endpoint = userId 
        ? `/wp/v2/users/${userId}/application-passwords`
        : '/wp/v2/users/me/application-passwords';
        
      const response = await wpClient.customRequest<Array<{
        uuid: string;
        app_id: string;
        name: string;
        created: string;
        last_used: string | null;
        last_ip: string | null;
      }>>(endpoint, 'GET');
      
      const passwords = response.data.map(pw => ({
        uuid: pw.uuid,
        name: pw.name,
        appId: pw.app_id,
        created: pw.created,
        lastUsed: pw.last_used,
        lastIp: pw.last_ip,
      }));
      
      return {
        content: [{ type: 'text', text: JSON.stringify({
          count: passwords.length,
          passwords,
        }, null, 2) }],
      };
    }
  );

  server.registerTool(
    'admin_create_app_password',
    {
      title: 'Application Password erstellen',
      description: 'Erstellt ein neues Application Password für API-Zugriff',
      inputSchema: {
        userId: z.number().optional().describe('Benutzer-ID (Standard: aktueller Benutzer)'),
        name: z.string().describe('Name für das Application Password'),
        appId: z.string().optional().describe('App-ID (optional)'),
      },
    },
    async ({ userId, name, appId }) => {
      const endpoint = userId 
        ? `/wp/v2/users/${userId}/application-passwords`
        : '/wp/v2/users/me/application-passwords';
        
      const response = await wpClient.customRequest<{
        uuid: string;
        app_id: string;
        name: string;
        password: string;
        created: string;
      }>(endpoint, 'POST', { name, app_id: appId });
      
      return {
        content: [{ type: 'text', text: JSON.stringify({
          success: true,
          uuid: response.data.uuid,
          name: response.data.name,
          password: response.data.password,
          warning: 'Das Passwort wird nur einmal angezeigt! Sichere es jetzt.',
        }, null, 2) }],
      };
    }
  );

  server.registerTool(
    'admin_delete_app_password',
    {
      title: 'Application Password löschen',
      description: 'Löscht ein Application Password',
      inputSchema: {
        userId: z.number().optional().describe('Benutzer-ID'),
        uuid: z.string().describe('UUID des Application Passwords'),
      },
    },
    async ({ userId, uuid }) => {
      const endpoint = userId 
        ? `/wp/v2/users/${userId}/application-passwords/${uuid}`
        : `/wp/v2/users/me/application-passwords/${uuid}`;
        
      await wpClient.customRequest(endpoint, 'DELETE');
      
      return {
        content: [{ type: 'text', text: JSON.stringify({
          success: true,
          deletedUuid: uuid,
        }, null, 2) }],
      };
    }
  );

  // ============================================
  // EXPORT & IMPORT
  // ============================================

  server.registerTool(
    'admin_export_content',
    {
      title: 'Content Export vorbereiten',
      description: 'Bereitet WordPress-Content für Export vor (Posts, Pages, etc.)',
      inputSchema: {
        contentType: z.enum(['posts', 'pages', 'media', 'all']).describe('Content-Typ'),
        status: z.enum(['publish', 'draft', 'all']).optional().default('all').describe('Status-Filter'),
        dateFrom: z.string().optional().describe('Datum von (YYYY-MM-DD)'),
        dateTo: z.string().optional().describe('Datum bis (YYYY-MM-DD)'),
      },
    },
    async ({ contentType, status, dateFrom, dateTo }) => {
      const results: Record<string, unknown[]> = {};
      
      const fetchContent = async (endpoint: string, type: string) => {
        const params: Record<string, string | number | undefined> = {
          per_page: 100,
          status: status === 'all' ? undefined : status,
          after: dateFrom ? `${dateFrom}T00:00:00` : undefined,
          before: dateTo ? `${dateTo}T23:59:59` : undefined,
        };
        
        const response = await wpClient.customRequest<Array<Record<string, unknown>>>(
          endpoint, 'GET', undefined, params
        );
        
        results[type] = response.data;
      };
      
      if (contentType === 'all' || contentType === 'posts') {
        await fetchContent('/wp/v2/posts', 'posts');
      }
      if (contentType === 'all' || contentType === 'pages') {
        await fetchContent('/wp/v2/pages', 'pages');
      }
      if (contentType === 'all' || contentType === 'media') {
        await fetchContent('/wp/v2/media', 'media');
      }
      
      const summary = {
        exportDate: new Date().toISOString(),
        contentType,
        filters: { status, dateFrom, dateTo },
        counts: Object.fromEntries(
          Object.entries(results).map(([k, v]) => [k, v.length])
        ),
        data: results,
      };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }],
      };
    }
  );

  // ============================================
  // TRANSIENTS & CACHE
  // ============================================

  server.registerTool(
    'admin_flush_cache',
    {
      title: 'Cache leeren',
      description: 'Leert WordPress Object Cache (falls verfügbar via REST)',
      inputSchema: {
        type: z.enum(['all', 'transients', 'object']).optional().default('all')
          .describe('Cache-Typ'),
      },
    },
    async ({ type }) => {
      // Cache-Flush benötigt Custom Endpoint im Plugin
      try {
        const response = await wpClient.customRequest<{ success: boolean; message: string }>(
          '/wp-mcp/v1/cache/flush',
          'POST',
          { type }
        );
        
        return {
          content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }],
        };
      } catch {
        return {
          content: [{ type: 'text', text: JSON.stringify({
            info: 'Cache-Flush erfordert das WP-MCP Plugin',
            recommendation: 'Installiere das mitgelieferte WordPress Plugin für Cache-Funktionen',
            manualAction: 'Alternativ: wp cache flush via WP-CLI',
          }, null, 2) }],
        };
      }
    }
  );

  // ============================================
  // SYSTEM INFO
  // ============================================

  server.registerTool(
    'admin_system_info',
    {
      title: 'System-Informationen',
      description: 'Ruft WordPress System-Informationen ab',
      inputSchema: {},
    },
    async () => {
      const [siteInfo, plugins, themes, users] = await Promise.all([
        wpClient.customRequest<{
          name: string;
          description: string;
          url: string;
          home: string;
          namespaces: string[];
          routes: Record<string, unknown>;
        }>('', 'GET').catch(() => ({ data: null })),
        wpClient.customRequest<unknown[]>('/wp/v2/plugins', 'GET').catch(() => ({ data: [] })),
        wpClient.customRequest<unknown[]>('/wp/v2/themes', 'GET').catch(() => ({ data: [] })),
        wpClient.customRequest<unknown[]>('/wp/v2/users', 'GET', undefined, { per_page: 1 })
          .catch(() => ({ data: [], headers: new Headers() })),
      ]);
      
      // Zähle REST API Endpoints
      const routeCount = siteInfo.data?.routes ? Object.keys(siteInfo.data.routes).length : 0;
      
      const output = {
        site: {
          name: siteInfo.data?.name,
          description: siteInfo.data?.description,
          url: siteInfo.data?.url,
          home: siteInfo.data?.home,
        },
        restApi: {
          namespaces: siteInfo.data?.namespaces || [],
          namespaceCount: siteInfo.data?.namespaces?.length || 0,
          routeCount,
        },
        content: {
          plugins: (plugins.data as unknown[])?.length || 0,
          themes: (themes.data as unknown[])?.length || 0,
        },
        capabilities: {
          hasPluginAccess: (plugins.data as unknown[])?.length > 0,
          hasThemeAccess: (themes.data as unknown[])?.length > 0,
          hasUserAccess: (users.data as unknown[])?.length > 0,
        },
        timestamp: new Date().toISOString(),
      };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
      };
    }
  );

  // ============================================
  // REWRITE RULES & PERMALINKS
  // ============================================

  server.registerTool(
    'admin_get_permalink_structure',
    {
      title: 'Permalink-Struktur abrufen',
      description: 'Ruft die aktuelle Permalink-Struktur ab',
      inputSchema: {},
    },
    async () => {
      // Permalink-Struktur ist in Settings
      const response = await wpClient.customRequest<{
        permalink_structure?: string;
        default_comment_status?: string;
        default_ping_status?: string;
      }>('/wp/v2/settings', 'GET');
      
      const structure = response.data.permalink_structure || '/%postname%/';
      
      const output = {
        structure,
        type: structure.includes('%postname%') ? 'post_name' :
              structure.includes('%post_id%') ? 'numeric' :
              structure.includes('%year%') ? 'date_based' : 'custom',
        examples: {
          post: `${wpClient.getSiteUrl()}${structure.replace('%postname%', 'example-post').replace('%year%', '2024').replace('%monthnum%', '01').replace('%day%', '15')}`,
        },
        defaultCommentStatus: response.data.default_comment_status,
        defaultPingStatus: response.data.default_ping_status,
      };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
      };
    }
  );

  // ============================================
  // MAINTENANCE MODE
  // ============================================

  server.registerTool(
    'admin_maintenance_mode',
    {
      title: 'Wartungsmodus verwalten',
      description: 'Aktiviert/Deaktiviert den WordPress Wartungsmodus',
      inputSchema: {
        action: z.enum(['status', 'enable', 'disable']).describe('Aktion'),
        message: z.string().optional().describe('Wartungsmeldung'),
      },
    },
    async ({ action, message }) => {
      // Wartungsmodus benötigt Custom Endpoint
      try {
        const response = await wpClient.customRequest<{
          enabled: boolean;
          message?: string;
        }>('/wp-mcp/v1/maintenance', action === 'status' ? 'GET' : 'POST', 
          action === 'status' ? undefined : { action, message }
        );
        
        return {
          content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }],
        };
      } catch {
        return {
          content: [{ type: 'text', text: JSON.stringify({
            info: 'Wartungsmodus erfordert das WP-MCP Plugin oder manuellen Eingriff',
            manualAction: action === 'enable' 
              ? 'Erstelle .maintenance Datei im WordPress Root'
              : 'Lösche .maintenance Datei im WordPress Root',
          }, null, 2) }],
        };
      }
    }
  );
}
