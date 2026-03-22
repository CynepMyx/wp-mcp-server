/**
 * Theme & Plugin Tools
 * MCP Tools für die Verwaltung von WordPress Themes und Plugins
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod';
import { WordPressClient } from '../wordpress/client.js';

export function registerThemePluginTools(server: McpServer, wpClient: WordPressClient) {
  
  // === THEMES ===
  
  server.registerTool(
    'wp_list_themes',
    {
      title: 'Liste WordPress Themes',
      description: 'Zeigt alle installierten WordPress-Themes an',
      inputSchema: {},
      outputSchema: {
        themes: z.array(z.object({
          stylesheet: z.string(),
          name: z.string(),
          version: z.string(),
          status: z.string(),
          template: z.string(),
        })),
        activeTheme: z.string(),
      }
    },
    async () => {
      const themes = await wpClient.getThemes();
      let activeTheme = '';
      
      const themeList = Array.isArray(themes) ? themes.map((t: Record<string, unknown>) => {
        const status = (t as { status?: string }).status || '';
        if (status === 'active') {
          activeTheme = (t as { stylesheet?: string }).stylesheet || '';
        }
        return {
          stylesheet: (t as { stylesheet?: string }).stylesheet || '',
          name: ((t as { name?: { rendered?: string } }).name?.rendered) || '',
          version: (t as { version?: string }).version || '',
          status,
          template: (t as { template?: string }).template || '',
        };
      }) : [];
      
      const output = { themes: themeList, activeTheme };
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    }
  );

  // === PLUGINS ===
  
  server.registerTool(
    'wp_list_plugins',
    {
      title: 'Liste WordPress Plugins',
      description: 'Zeigt alle installierten WordPress-Plugins an',
      inputSchema: {},
      outputSchema: {
        plugins: z.array(z.object({
          plugin: z.string(),
          name: z.string(),
          version: z.string(),
          status: z.string(),
          description: z.string(),
        })),
      }
    },
    async () => {
      const plugins = await wpClient.getPlugins();
      
      const pluginList = Array.isArray(plugins) ? plugins.map((p: Record<string, unknown>) => ({
        plugin: (p as { plugin?: string }).plugin || '',
        name: ((p as { name?: { rendered?: string; raw?: string } }).name?.rendered) || 
              ((p as { name?: string }).name as string) || '',
        version: (p as { version?: string }).version || '',
        status: (p as { status?: string }).status || '',
        description: ((p as { description?: { rendered?: string; raw?: string } }).description?.rendered) || '',
      })) : [];
      
      const output = { plugins: pluginList };
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    }
  );

  // === WIDGETS & SIDEBARS ===
  
  server.registerTool(
    'wp_list_sidebars',
    {
      title: 'Liste Widget-Bereiche',
      description: 'Zeigt alle registrierten Widget-Bereiche (Sidebars) an',
      inputSchema: {},
      outputSchema: {
        sidebars: z.array(z.object({
          id: z.string(),
          name: z.string(),
          description: z.string(),
          status: z.string(),
        })),
      }
    },
    async () => {
      const sidebars = await wpClient.getSidebars();
      
      const sidebarList = Array.isArray(sidebars) ? sidebars.map((s: Record<string, unknown>) => ({
        id: (s as { id?: string }).id || '',
        name: (s as { name?: string }).name || '',
        description: (s as { description?: string }).description || '',
        status: (s as { status?: string }).status || '',
      })) : [];
      
      const output = { sidebars: sidebarList };
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    }
  );

  server.registerTool(
    'wp_list_widgets',
    {
      title: 'Liste Widgets',
      description: 'Zeigt alle aktiven Widgets in den Sidebars an',
      inputSchema: {},
      outputSchema: {
        widgets: z.array(z.object({
          id: z.string(),
          id_base: z.string(),
          sidebar: z.string(),
          instance: z.unknown(),
        })),
      }
    },
    async () => {
      const widgets = await wpClient.getWidgets();
      
      const widgetList = Array.isArray(widgets) ? widgets.map((w: Record<string, unknown>) => ({
        id: (w as { id?: string }).id || '',
        id_base: (w as { id_base?: string }).id_base || '',
        sidebar: (w as { sidebar?: string }).sidebar || '',
        instance: (w as { instance?: unknown }).instance || {},
      })) : [];
      
      const output = { widgets: widgetList };
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    }
  );

  // === MENUS ===
  
  server.registerTool(
    'wp_list_menus',
    {
      title: 'Liste Navigation Menus',
      description: 'Zeigt alle WordPress-Navigationsmenüs an (benötigt Menus REST API Plugin)',
      inputSchema: {},
      outputSchema: {
        menus: z.array(z.unknown()),
      }
    },
    async () => {
      try {
        const menus = await wpClient.getMenus();
        const output = { menus: Array.isArray(menus) ? menus : [] };
        return {
          content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
          structuredContent: output
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: 'Menus API nicht verfügbar. Bitte installieren Sie das "WP REST API Menus" Plugin.' 
          }],
          structuredContent: { menus: [], error: 'API not available' }
        };
      }
    }
  );

  // === SITE SETTINGS ===
  
  server.registerTool(
    'wp_get_site_info',
    {
      title: 'Hole Website-Informationen',
      description: 'Holt allgemeine Informationen über die WordPress-Installation',
      inputSchema: {},
      outputSchema: {
        name: z.string(),
        description: z.string(),
        url: z.string(),
        home: z.string(),
        gmt_offset: z.number(),
        timezone_string: z.string(),
        namespaces: z.array(z.string()),
      }
    },
    async () => {
      const settings = await wpClient.getSiteSettings();
      
      const output = {
        name: (settings as { name?: string }).name || '',
        description: (settings as { description?: string }).description || '',
        url: (settings as { url?: string }).url || '',
        home: (settings as { home?: string }).home || '',
        gmt_offset: Number((settings as { gmt_offset?: unknown }).gmt_offset) || 0,
        timezone_string: (settings as { timezone_string?: string }).timezone_string || '',
        namespaces: (settings as { namespaces?: string[] }).namespaces || [],
      };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    }
  );

  // === USERS ===
  
  server.registerTool(
    'wp_list_users',
    {
      title: 'Liste WordPress Benutzer',
      description: 'Zeigt alle WordPress-Benutzer an (erfordert entsprechende Berechtigung)',
      inputSchema: {},
      outputSchema: {
        users: z.array(z.object({
          id: z.number(),
          username: z.string(),
          name: z.string(),
          email: z.string(),
          roles: z.array(z.string()),
        })),
      }
    },
    async () => {
      const response = await wpClient.getUsers();
      
      const users = response.data.map(u => ({
        id: u.id,
        username: u.username,
        name: u.name,
        email: u.email || '',
        roles: u.roles || [],
      }));
      
      const output = { users };
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    }
  );

  server.registerTool(
    'wp_get_current_user',
    {
      title: 'Hole aktuellen Benutzer',
      description: 'Zeigt Informationen über den aktuell authentifizierten Benutzer',
      inputSchema: {},
      outputSchema: {
        id: z.number(),
        username: z.string(),
        name: z.string(),
        email: z.string(),
        roles: z.array(z.string()),
        capabilities: z.array(z.string()),
      }
    },
    async () => {
      const response = await wpClient.getCurrentUser();
      const u = response.data;
      
      const output = {
        id: u.id,
        username: u.username,
        name: u.name,
        email: u.email || '',
        roles: u.roles || [],
        capabilities: [], // Would need extended API for capabilities
      };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    }
  );
}
