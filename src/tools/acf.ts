/**
 * ACF (Advanced Custom Fields) Tools
 * Tools für Custom Fields Management
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { WordPressClient } from '../wordpress/client.js';

export function registerAcfTools(server: McpServer, wpClient: WordPressClient) {
  
  // ACF API Base (requires ACF to REST API plugin or ACF Pro)
  const acfApiBase = '/acf/v3';
  
  // ============================================
  // FIELD GROUPS
  // ============================================

  server.registerTool(
    'acf_list_field_groups',
    {
      title: 'ACF Field Groups auflisten',
      description: 'Listet alle ACF Field Groups auf',
      inputSchema: {},
    },
    async () => {
      // Try ACF REST API endpoint first
      try {
        const response = await wpClient.customRequest<Array<{
          id: number;
          title: string;
          key: string;
          active: boolean;
          menu_order: number;
          position: string;
          style: string;
          label_placement: string;
          instruction_placement: string;
          location: Array<Array<{ param: string; operator: string; value: string }>>;
          fields: Array<{ key: string; label: string; name: string; type: string }>;
        }>>(`${acfApiBase}/field-groups`);
        
        const groups = response.data.map(g => ({
          id: g.id,
          title: g.title,
          key: g.key,
          active: g.active,
          menuOrder: g.menu_order,
          position: g.position,
          style: g.style,
          labelPlacement: g.label_placement,
          location: g.location,
          fieldCount: g.fields?.length || 0,
        }));
        
        return {
          content: [{ type: 'text', text: JSON.stringify({ count: groups.length, groups }, null, 2) }],
        };
      } catch {
        // Fallback: Get from post type acf-field-group
        const response = await wpClient.customRequest<Array<{
          id: number;
          title: { rendered: string };
          status: string;
          acf: Record<string, unknown>;
        }>>('/acf-field-group', 'GET', undefined, { per_page: 100 });
        
        const groups = response.data.map(g => ({
          id: g.id,
          title: g.title.rendered,
          status: g.status,
          acf: g.acf,
        }));
        
        return {
          content: [{ type: 'text', text: JSON.stringify({ count: groups.length, groups, note: 'Using fallback API' }, null, 2) }],
        };
      }
    }
  );

  server.registerTool(
    'acf_get_field_group',
    {
      title: 'ACF Field Group Details',
      description: 'Ruft Details einer Field Group ab, inklusive aller Felder',
      inputSchema: {
        groupId: z.union([z.number(), z.string()]).describe('Field Group ID oder Key'),
      },
    },
    async ({ groupId }) => {
      try {
        const response = await wpClient.customRequest<{
          id: number;
          title: string;
          key: string;
          active: boolean;
          position: string;
          style: string;
          label_placement: string;
          instruction_placement: string;
          hide_on_screen: string[];
          location: Array<Array<{ param: string; operator: string; value: string }>>;
          fields: Array<{
            key: string;
            label: string;
            name: string;
            type: string;
            instructions: string;
            required: boolean;
            conditional_logic: unknown;
            default_value: unknown;
            placeholder: string;
            choices?: Record<string, string>;
            sub_fields?: Array<{ key: string; label: string; name: string; type: string }>;
            layouts?: Array<{ key: string; name: string; label: string; sub_fields: Array<{ name: string; type: string }> }>;
          }>;
        }>(`${acfApiBase}/field-groups/${groupId}`);
        
        const g = response.data;
        
        const output = {
          id: g.id,
          title: g.title,
          key: g.key,
          active: g.active,
          settings: {
            position: g.position,
            style: g.style,
            labelPlacement: g.label_placement,
            instructionPlacement: g.instruction_placement,
            hideOnScreen: g.hide_on_screen,
          },
          location: g.location,
          fields: g.fields.map(f => ({
            key: f.key,
            label: f.label,
            name: f.name,
            type: f.type,
            instructions: f.instructions,
            required: f.required,
            conditionalLogic: f.conditional_logic,
            defaultValue: f.default_value,
            placeholder: f.placeholder,
            choices: f.choices,
            subFields: f.sub_fields?.map(sf => ({ key: sf.key, label: sf.label, name: sf.name, type: sf.type })),
            layouts: f.layouts?.map(l => ({ key: l.key, name: l.name, label: l.label, subFieldCount: l.sub_fields?.length || 0 })),
          })),
        };
        
        return {
          content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        };
      } catch {
        return {
          content: [{ type: 'text', text: `Field Group ${groupId} nicht gefunden oder ACF REST API nicht verfügbar` }],
        };
      }
    }
  );

  // ============================================
  // POST/PAGE ACF FIELDS
  // ============================================

  server.registerTool(
    'acf_get_post_fields',
    {
      title: 'ACF Felder eines Posts abrufen',
      description: 'Ruft alle ACF Custom Fields eines Posts/einer Seite ab',
      inputSchema: {
        postId: z.number().describe('Post/Page ID'),
        postType: z.enum(['post', 'page', 'custom']).default('post').describe('Post-Typ'),
        customPostType: z.string().optional().describe('Custom Post Type (wenn postType = custom)'),
      },
    },
    async ({ postId, postType, customPostType }) => {
      // Try ACF REST API
      try {
        const endpoint = postType === 'custom' && customPostType 
          ? `${acfApiBase}/${customPostType}/${postId}`
          : `${acfApiBase}/${postType === 'page' ? 'pages' : 'posts'}/${postId}`;
        
        const response = await wpClient.customRequest<{
          acf: Record<string, unknown>;
        }>(endpoint);
        
        return {
          content: [{ type: 'text', text: JSON.stringify({ postId, fields: response.data.acf || {} }, null, 2) }],
        };
      } catch {
        // Fallback: Get from standard post endpoint
        const endpoint = postType === 'page' ? '/pages' : '/posts';
        const response = await wpClient.customRequest<{
          id: number;
          acf: Record<string, unknown>;
          meta: Record<string, unknown>;
        }>(`${endpoint}/${postId}`);
        
        // ACF fields are usually in .acf or .meta
        const fields = response.data.acf || {};
        
        // Also check meta for ACF fields (they start with _)
        const metaFields: Record<string, unknown> = {};
        if (response.data.meta) {
          Object.entries(response.data.meta).forEach(([key, value]) => {
            if (!key.startsWith('_')) {
              metaFields[key] = value;
            }
          });
        }
        
        return {
          content: [{ type: 'text', text: JSON.stringify({ 
            postId, 
            acfFields: fields, 
            metaFields,
            note: 'Using fallback API - install ACF to REST API plugin for full support' 
          }, null, 2) }],
        };
      }
    }
  );

  server.registerTool(
    'acf_update_post_fields',
    {
      title: 'ACF Felder aktualisieren',
      description: 'Aktualisiert ACF Custom Fields eines Posts/einer Seite',
      inputSchema: {
        postId: z.number().describe('Post/Page ID'),
        postType: z.enum(['post', 'page']).default('post').describe('Post-Typ'),
        fields: z.record(z.unknown()).describe('Felder als Key-Value Objekt'),
      },
    },
    async ({ postId, postType, fields }) => {
      // Try ACF REST API
      try {
        const endpoint = `${acfApiBase}/${postType === 'page' ? 'pages' : 'posts'}/${postId}`;
        
        await wpClient.customRequest(endpoint, 'PUT', { acf: fields });
        
        return {
          content: [{ type: 'text', text: `ACF Felder für ${postType} ${postId} aktualisiert` }],
        };
      } catch {
        // Fallback: Update via standard endpoint with meta
        const endpoint = postType === 'page' ? `/pages/${postId}` : `/posts/${postId}`;
        
        await wpClient.customRequest(endpoint, 'PUT', { acf: fields, meta: fields });
        
        return {
          content: [{ type: 'text', text: `ACF Felder für ${postType} ${postId} aktualisiert (Fallback API)` }],
        };
      }
    }
  );

  // ============================================
  // OPTIONS PAGES
  // ============================================

  server.registerTool(
    'acf_get_options',
    {
      title: 'ACF Options Page abrufen',
      description: 'Ruft ACF Options Page Felder ab (ACF Pro Feature)',
      inputSchema: {
        optionsPage: z.string().optional().default('options').describe('Options Page ID/Slug'),
      },
    },
    async ({ optionsPage }) => {
      try {
        const response = await wpClient.customRequest<{
          acf: Record<string, unknown>;
        }>(`${acfApiBase}/options/${optionsPage}`);
        
        return {
          content: [{ type: 'text', text: JSON.stringify({ optionsPage, fields: response.data.acf || {} }, null, 2) }],
        };
      } catch {
        return {
          content: [{ type: 'text', text: `Options Page "${optionsPage}" nicht gefunden oder ACF Pro/REST API nicht verfügbar` }],
        };
      }
    }
  );

  server.registerTool(
    'acf_update_options',
    {
      title: 'ACF Options Page aktualisieren',
      description: 'Aktualisiert ACF Options Page Felder (ACF Pro Feature)',
      inputSchema: {
        optionsPage: z.string().optional().default('options').describe('Options Page ID/Slug'),
        fields: z.record(z.unknown()).describe('Felder als Key-Value Objekt'),
      },
    },
    async ({ optionsPage, fields }) => {
      try {
        await wpClient.customRequest(`${acfApiBase}/options/${optionsPage}`, 'PUT', { acf: fields });
        
        return {
          content: [{ type: 'text', text: `ACF Options Page "${optionsPage}" aktualisiert` }],
        };
      } catch {
        return {
          content: [{ type: 'text', text: `Options Page "${optionsPage}" konnte nicht aktualisiert werden` }],
        };
      }
    }
  );

  // ============================================
  // USER FIELDS
  // ============================================

  server.registerTool(
    'acf_get_user_fields',
    {
      title: 'ACF User Felder abrufen',
      description: 'Ruft ACF Custom Fields eines Benutzers ab',
      inputSchema: {
        userId: z.number().describe('User ID'),
      },
    },
    async ({ userId }) => {
      try {
        const response = await wpClient.customRequest<{
          acf: Record<string, unknown>;
        }>(`${acfApiBase}/users/${userId}`);
        
        return {
          content: [{ type: 'text', text: JSON.stringify({ userId, fields: response.data.acf || {} }, null, 2) }],
        };
      } catch {
        // Fallback
        const response = await wpClient.customRequest<{
          id: number;
          acf: Record<string, unknown>;
          meta: Record<string, unknown>;
        }>(`/users/${userId}`);
        
        return {
          content: [{ type: 'text', text: JSON.stringify({ 
            userId, 
            acfFields: response.data.acf || {},
            metaFields: response.data.meta || {},
            note: 'Using fallback API'
          }, null, 2) }],
        };
      }
    }
  );

  server.registerTool(
    'acf_update_user_fields',
    {
      title: 'ACF User Felder aktualisieren',
      description: 'Aktualisiert ACF Custom Fields eines Benutzers',
      inputSchema: {
        userId: z.number().describe('User ID'),
        fields: z.record(z.unknown()).describe('Felder als Key-Value Objekt'),
      },
    },
    async ({ userId, fields }) => {
      try {
        await wpClient.customRequest(`${acfApiBase}/users/${userId}`, 'PUT', { acf: fields });
        
        return {
          content: [{ type: 'text', text: `ACF Felder für User ${userId} aktualisiert` }],
        };
      } catch {
        await wpClient.customRequest(`/users/${userId}`, 'PUT', { acf: fields, meta: fields });
        
        return {
          content: [{ type: 'text', text: `ACF Felder für User ${userId} aktualisiert (Fallback API)` }],
        };
      }
    }
  );

  // ============================================
  // TERM FIELDS
  // ============================================

  server.registerTool(
    'acf_get_term_fields',
    {
      title: 'ACF Term Felder abrufen',
      description: 'Ruft ACF Custom Fields eines Terms (Kategorie, Tag, etc.) ab',
      inputSchema: {
        taxonomy: z.string().describe('Taxonomie (z.B. category, post_tag, product_cat)'),
        termId: z.number().describe('Term ID'),
      },
    },
    async ({ taxonomy, termId }) => {
      try {
        const response = await wpClient.customRequest<{
          acf: Record<string, unknown>;
        }>(`${acfApiBase}/${taxonomy}/${termId}`);
        
        return {
          content: [{ type: 'text', text: JSON.stringify({ taxonomy, termId, fields: response.data.acf || {} }, null, 2) }],
        };
      } catch {
        return {
          content: [{ type: 'text', text: `Term ${termId} in Taxonomie "${taxonomy}" nicht gefunden oder ACF REST API nicht verfügbar` }],
        };
      }
    }
  );

  // ============================================
  // FIELD TYPE HELPERS
  // ============================================

  server.registerTool(
    'acf_list_field_types',
    {
      title: 'ACF Feldtypen auflisten',
      description: 'Zeigt alle verfügbaren ACF Feldtypen mit Beschreibung',
      inputSchema: {},
    },
    async () => {
      const fieldTypes = [
        // Basic
        { name: 'text', category: 'Basic', description: 'Einzeiliges Textfeld' },
        { name: 'textarea', category: 'Basic', description: 'Mehrzeiliges Textfeld' },
        { name: 'number', category: 'Basic', description: 'Numerisches Feld' },
        { name: 'range', category: 'Basic', description: 'Schieberegler für Zahlen' },
        { name: 'email', category: 'Basic', description: 'E-Mail-Feld mit Validierung' },
        { name: 'url', category: 'Basic', description: 'URL-Feld mit Validierung' },
        { name: 'password', category: 'Basic', description: 'Passwort-Feld' },
        
        // Content
        { name: 'image', category: 'Content', description: 'Bildauswahl aus Mediathek' },
        { name: 'file', category: 'Content', description: 'Dateiauswahl aus Mediathek' },
        { name: 'wysiwyg', category: 'Content', description: 'WYSIWYG-Editor (TinyMCE)' },
        { name: 'oembed', category: 'Content', description: 'oEmbed (YouTube, Vimeo, etc.)' },
        { name: 'gallery', category: 'Content', description: 'Bildergalerie' },
        
        // Choice
        { name: 'select', category: 'Choice', description: 'Dropdown-Auswahl' },
        { name: 'checkbox', category: 'Choice', description: 'Checkbox(en)' },
        { name: 'radio', category: 'Choice', description: 'Radio Buttons' },
        { name: 'button_group', category: 'Choice', description: 'Button-Gruppe' },
        { name: 'true_false', category: 'Choice', description: 'Ja/Nein Toggle' },
        
        // Relational
        { name: 'link', category: 'Relational', description: 'Link-Picker' },
        { name: 'post_object', category: 'Relational', description: 'Post-Auswahl' },
        { name: 'page_link', category: 'Relational', description: 'Seiten-Link' },
        { name: 'relationship', category: 'Relational', description: 'Beziehung zu Posts' },
        { name: 'taxonomy', category: 'Relational', description: 'Taxonomie-Auswahl' },
        { name: 'user', category: 'Relational', description: 'Benutzer-Auswahl' },
        
        // jQuery
        { name: 'google_map', category: 'jQuery', description: 'Google Maps Picker' },
        { name: 'date_picker', category: 'jQuery', description: 'Datumsauswahl' },
        { name: 'date_time_picker', category: 'jQuery', description: 'Datum & Zeit Auswahl' },
        { name: 'time_picker', category: 'jQuery', description: 'Zeitauswahl' },
        { name: 'color_picker', category: 'jQuery', description: 'Farbauswahl' },
        
        // Layout
        { name: 'message', category: 'Layout', description: 'Nachricht/Hinweis (nur Anzeige)' },
        { name: 'accordion', category: 'Layout', description: 'Akkordeon-Container' },
        { name: 'tab', category: 'Layout', description: 'Tab-Container' },
        { name: 'group', category: 'Layout', description: 'Feld-Gruppe' },
        { name: 'repeater', category: 'Layout', description: 'Repeater (wiederholbare Felder) - Pro' },
        { name: 'flexible_content', category: 'Layout', description: 'Flexible Content (Layouts) - Pro' },
        { name: 'clone', category: 'Layout', description: 'Clone (Feld kopieren) - Pro' },
      ];
      
      const grouped = fieldTypes.reduce((acc, ft) => {
        if (!acc[ft.category]) acc[ft.category] = [];
        acc[ft.category].push({ name: ft.name, description: ft.description });
        return acc;
      }, {} as Record<string, Array<{ name: string; description: string }>>);
      
      return {
        content: [{ type: 'text', text: JSON.stringify({ totalTypes: fieldTypes.length, byCategory: grouped }, null, 2) }],
      };
    }
  );

  // ============================================
  // REPEATER & FLEXIBLE CONTENT HELPERS
  // ============================================

  server.registerTool(
    'acf_get_repeater_rows',
    {
      title: 'ACF Repeater Rows abrufen',
      description: 'Ruft alle Zeilen eines Repeater-Feldes ab',
      inputSchema: {
        postId: z.number().describe('Post/Page ID'),
        fieldName: z.string().describe('Repeater Feldname'),
      },
    },
    async ({ postId, fieldName }) => {
      try {
        const response = await wpClient.customRequest<{
          acf: Record<string, unknown>;
        }>(`${acfApiBase}/posts/${postId}`);
        
        const repeaterData = response.data.acf?.[fieldName];
        
        if (!repeaterData) {
          return {
            content: [{ type: 'text', text: `Repeater Feld "${fieldName}" nicht gefunden` }],
          };
        }
        
        const rows = Array.isArray(repeaterData) ? repeaterData : [];
        
        return {
          content: [{ type: 'text', text: JSON.stringify({ 
            postId, 
            fieldName, 
            rowCount: rows.length,
            rows 
          }, null, 2) }],
        };
      } catch {
        return {
          content: [{ type: 'text', text: `Fehler beim Abrufen des Repeater-Feldes` }],
        };
      }
    }
  );

  server.registerTool(
    'acf_get_flexible_layouts',
    {
      title: 'ACF Flexible Content Layouts abrufen',
      description: 'Ruft alle Layouts eines Flexible Content Feldes ab',
      inputSchema: {
        postId: z.number().describe('Post/Page ID'),
        fieldName: z.string().describe('Flexible Content Feldname'),
      },
    },
    async ({ postId, fieldName }) => {
      try {
        const response = await wpClient.customRequest<{
          acf: Record<string, unknown>;
        }>(`${acfApiBase}/posts/${postId}`);
        
        const flexibleData = response.data.acf?.[fieldName];
        
        if (!flexibleData) {
          return {
            content: [{ type: 'text', text: `Flexible Content Feld "${fieldName}" nicht gefunden` }],
          };
        }
        
        const layouts = Array.isArray(flexibleData) ? flexibleData : [];
        
        // Group by layout type
        const layoutCounts = layouts.reduce((acc, layout) => {
          const type = layout.acf_fc_layout || 'unknown';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        return {
          content: [{ type: 'text', text: JSON.stringify({ 
            postId, 
            fieldName, 
            layoutCount: layouts.length,
            layoutTypes: layoutCounts,
            layouts 
          }, null, 2) }],
        };
      } catch {
        return {
          content: [{ type: 'text', text: `Fehler beim Abrufen des Flexible Content Feldes` }],
        };
      }
    }
  );

  // ============================================
  // BULK OPERATIONS
  // ============================================

  server.registerTool(
    'acf_bulk_get_fields',
    {
      title: 'ACF Bulk Felder abrufen',
      description: 'Ruft ACF Felder für mehrere Posts ab',
      inputSchema: {
        postIds: z.array(z.number()).describe('Array von Post-IDs'),
        fields: z.array(z.string()).optional().describe('Nur diese Felder abrufen (optional)'),
      },
    },
    async ({ postIds, fields }) => {
      const results = await Promise.all(
        postIds.map(async (postId) => {
          try {
            const response = await wpClient.customRequest<{
              acf: Record<string, unknown>;
            }>(`${acfApiBase}/posts/${postId}`);
            
            let acfData = response.data.acf || {};
            
            // Filter fields if specified
            if (fields && fields.length > 0) {
              acfData = Object.fromEntries(
                Object.entries(acfData).filter(([key]) => fields.includes(key))
              );
            }
            
            return { postId, fields: acfData, error: null };
          } catch (error) {
            return { postId, fields: null, error: 'Nicht gefunden' };
          }
        })
      );
      
      return {
        content: [{ type: 'text', text: JSON.stringify({ count: results.length, results }, null, 2) }],
      };
    }
  );
}
