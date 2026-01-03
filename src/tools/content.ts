/**
 * WordPress Content Tools
 * MCP Tools für die Verwaltung von Posts, Pages und Media
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod';
import { WordPressClient } from '../wordpress/client.js';

export function registerContentTools(server: McpServer, wpClient: WordPressClient) {
  
  // === POSTS ===
  
  server.registerTool(
    'wp_list_posts',
    {
      title: 'Liste WordPress Posts',
      description: 'Holt eine Liste aller WordPress-Beiträge mit optionalen Filtern',
      inputSchema: {
        status: z.enum(['publish', 'draft', 'pending', 'private', 'any']).optional()
          .describe('Filtere nach Status'),
        per_page: z.number().min(1).max(100).optional()
          .describe('Anzahl der Ergebnisse pro Seite (max 100)'),
        page: z.number().min(1).optional()
          .describe('Seitennummer für Pagination'),
        search: z.string().optional()
          .describe('Suchbegriff'),
        categories: z.string().optional()
          .describe('Kategorie-IDs (kommagetrennt)'),
        tags: z.string().optional()
          .describe('Tag-IDs (kommagetrennt)'),
      },
      outputSchema: {
        posts: z.array(z.object({
          id: z.number(),
          title: z.string(),
          slug: z.string(),
          status: z.string(),
          date: z.string(),
          link: z.string(),
        })),
        total: z.number(),
      }
    },
    async (params) => {
      const response = await wpClient.getPosts(params as Record<string, string | number>);
      const posts = response.data.map(p => ({
        id: p.id,
        title: p.title.rendered,
        slug: p.slug,
        status: p.status,
        date: p.date,
        link: p.link,
      }));
      const total = parseInt(response.headers.get('X-WP-Total') || '0');
      
      const output = { posts, total };
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    }
  );

  server.registerTool(
    'wp_get_post',
    {
      title: 'Hole WordPress Post',
      description: 'Holt einen einzelnen Post mit vollständigem Inhalt',
      inputSchema: {
        id: z.number().describe('Post ID'),
      },
      outputSchema: {
        id: z.number(),
        title: z.string(),
        content: z.string(),
        excerpt: z.string(),
        slug: z.string(),
        status: z.string(),
        date: z.string(),
        modified: z.string(),
        link: z.string(),
        author: z.number(),
        categories: z.array(z.number()),
        tags: z.array(z.number()),
        template: z.string(),
      }
    },
    async ({ id }) => {
      const response = await wpClient.getPost(id);
      const p = response.data;
      
      const output = {
        id: p.id,
        title: p.title.rendered,
        content: p.content.raw || p.content.rendered,
        excerpt: p.excerpt.rendered,
        slug: p.slug,
        status: p.status,
        date: p.date,
        modified: p.modified,
        link: p.link,
        author: p.author,
        categories: p.categories,
        tags: p.tags,
        template: p.template,
      };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    }
  );

  server.registerTool(
    'wp_create_post',
    {
      title: 'Erstelle WordPress Post',
      description: 'Erstellt einen neuen WordPress-Beitrag',
      inputSchema: {
        title: z.string().describe('Titel des Posts'),
        content: z.string().describe('Inhalt des Posts (kann HTML oder Gutenberg-Blocks enthalten)'),
        status: z.enum(['publish', 'draft', 'pending', 'private']).optional()
          .describe('Veröffentlichungsstatus'),
        excerpt: z.string().optional().describe('Kurzbeschreibung'),
        slug: z.string().optional().describe('URL-Slug'),
        categories: z.array(z.number()).optional().describe('Kategorie-IDs'),
        tags: z.array(z.number()).optional().describe('Tag-IDs'),
      },
      outputSchema: {
        id: z.number(),
        link: z.string(),
        status: z.string(),
      }
    },
    async (params) => {
      const response = await wpClient.createPost(params);
      const output = {
        id: response.data.id,
        link: response.data.link,
        status: response.data.status,
      };
      
      return {
        content: [{ type: 'text', text: `Post erstellt: ${output.link}` }],
        structuredContent: output
      };
    }
  );

  server.registerTool(
    'wp_update_post',
    {
      title: 'Aktualisiere WordPress Post',
      description: 'Aktualisiert einen bestehenden WordPress-Beitrag',
      inputSchema: {
        id: z.number().describe('Post ID'),
        title: z.string().optional().describe('Neuer Titel'),
        content: z.string().optional().describe('Neuer Inhalt'),
        status: z.enum(['publish', 'draft', 'pending', 'private']).optional()
          .describe('Neuer Status'),
        excerpt: z.string().optional().describe('Neue Kurzbeschreibung'),
        slug: z.string().optional().describe('Neuer URL-Slug'),
        categories: z.array(z.number()).optional().describe('Neue Kategorie-IDs'),
        tags: z.array(z.number()).optional().describe('Neue Tag-IDs'),
      },
      outputSchema: {
        success: z.boolean(),
        id: z.number(),
        link: z.string(),
      }
    },
    async ({ id, ...params }) => {
      const response = await wpClient.updatePost(id, params);
      const output = {
        success: true,
        id: response.data.id,
        link: response.data.link,
      };
      
      return {
        content: [{ type: 'text', text: `Post aktualisiert: ${output.link}` }],
        structuredContent: output
      };
    }
  );

  server.registerTool(
    'wp_delete_post',
    {
      title: 'Lösche WordPress Post',
      description: 'Löscht einen WordPress-Beitrag (verschiebt in Papierkorb oder endgültig)',
      inputSchema: {
        id: z.number().describe('Post ID'),
        force: z.boolean().optional().describe('Endgültig löschen statt Papierkorb'),
      },
      outputSchema: {
        success: z.boolean(),
        message: z.string(),
      }
    },
    async ({ id, force = false }) => {
      await wpClient.deletePost(id, force);
      const output = {
        success: true,
        message: force ? `Post ${id} endgültig gelöscht` : `Post ${id} in Papierkorb verschoben`,
      };
      
      return {
        content: [{ type: 'text', text: output.message }],
        structuredContent: output
      };
    }
  );

  // === PAGES ===
  
  server.registerTool(
    'wp_list_pages',
    {
      title: 'Liste WordPress Seiten',
      description: 'Holt eine Liste aller WordPress-Seiten',
      inputSchema: {
        status: z.enum(['publish', 'draft', 'pending', 'private', 'any']).optional(),
        per_page: z.number().min(1).max(100).optional(),
        parent: z.number().optional().describe('Parent-Seiten-ID für Unterseiten'),
        search: z.string().optional(),
      },
      outputSchema: {
        pages: z.array(z.object({
          id: z.number(),
          title: z.string(),
          slug: z.string(),
          status: z.string(),
          parent: z.number(),
          link: z.string(),
        })),
        total: z.number(),
      }
    },
    async (params) => {
      const response = await wpClient.getPages(params as Record<string, string | number>);
      const pages = response.data.map(p => ({
        id: p.id,
        title: p.title.rendered,
        slug: p.slug,
        status: p.status,
        parent: p.parent,
        link: p.link,
      }));
      const total = parseInt(response.headers.get('X-WP-Total') || '0');
      
      const output = { pages, total };
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    }
  );

  server.registerTool(
    'wp_get_page',
    {
      title: 'Hole WordPress Seite',
      description: 'Holt eine einzelne Seite mit vollständigem Inhalt',
      inputSchema: {
        id: z.number().describe('Seiten ID'),
      },
      outputSchema: {
        id: z.number(),
        title: z.string(),
        content: z.string(),
        slug: z.string(),
        status: z.string(),
        parent: z.number(),
        template: z.string(),
        link: z.string(),
      }
    },
    async ({ id }) => {
      const response = await wpClient.getPage(id);
      const p = response.data;
      
      const output = {
        id: p.id,
        title: p.title.rendered,
        content: p.content.raw || p.content.rendered,
        slug: p.slug,
        status: p.status,
        parent: p.parent,
        template: p.template,
        link: p.link,
      };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    }
  );

  server.registerTool(
    'wp_create_page',
    {
      title: 'Erstelle WordPress Seite',
      description: 'Erstellt eine neue WordPress-Seite',
      inputSchema: {
        title: z.string().describe('Titel der Seite'),
        content: z.string().describe('Inhalt der Seite'),
        status: z.enum(['publish', 'draft', 'pending', 'private']).optional(),
        parent: z.number().optional().describe('Parent-Seiten-ID'),
        template: z.string().optional().describe('Template-Dateiname'),
        slug: z.string().optional(),
      },
      outputSchema: {
        id: z.number(),
        link: z.string(),
        status: z.string(),
      }
    },
    async (params) => {
      const response = await wpClient.createPage(params);
      const output = {
        id: response.data.id,
        link: response.data.link,
        status: response.data.status,
      };
      
      return {
        content: [{ type: 'text', text: `Seite erstellt: ${output.link}` }],
        structuredContent: output
      };
    }
  );

  server.registerTool(
    'wp_update_page',
    {
      title: 'Aktualisiere WordPress Seite',
      description: 'Aktualisiert eine bestehende WordPress-Seite',
      inputSchema: {
        id: z.number().describe('Seiten ID'),
        title: z.string().optional(),
        content: z.string().optional(),
        status: z.enum(['publish', 'draft', 'pending', 'private']).optional(),
        parent: z.number().optional(),
        template: z.string().optional(),
        slug: z.string().optional(),
      },
      outputSchema: {
        success: z.boolean(),
        id: z.number(),
        link: z.string(),
      }
    },
    async ({ id, ...params }) => {
      const response = await wpClient.updatePage(id, params);
      const output = {
        success: true,
        id: response.data.id,
        link: response.data.link,
      };
      
      return {
        content: [{ type: 'text', text: `Seite aktualisiert: ${output.link}` }],
        structuredContent: output
      };
    }
  );

  // === MEDIA ===
  
  server.registerTool(
    'wp_list_media',
    {
      title: 'Liste WordPress Medien',
      description: 'Holt eine Liste aller Mediendateien',
      inputSchema: {
        media_type: z.enum(['image', 'video', 'audio', 'application']).optional(),
        per_page: z.number().min(1).max(100).optional(),
        search: z.string().optional(),
      },
      outputSchema: {
        media: z.array(z.object({
          id: z.number(),
          title: z.string(),
          source_url: z.string(),
          mime_type: z.string(),
          alt_text: z.string(),
        })),
        total: z.number(),
      }
    },
    async (params) => {
      const response = await wpClient.getMedia(params as Record<string, string | number>);
      const media = response.data.map(m => ({
        id: m.id,
        title: m.title.rendered,
        source_url: m.source_url,
        mime_type: m.mime_type,
        alt_text: m.alt_text,
      }));
      const total = parseInt(response.headers.get('X-WP-Total') || '0');
      
      const output = { media, total };
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    }
  );

  server.registerTool(
    'wp_get_media',
    {
      title: 'Hole Mediendetails',
      description: 'Holt Details zu einer einzelnen Mediendatei inklusive aller Bildgrößen',
      inputSchema: {
        id: z.number().describe('Media ID'),
      },
      outputSchema: {
        id: z.number(),
        title: z.string(),
        source_url: z.string(),
        mime_type: z.string(),
        alt_text: z.string(),
        caption: z.string(),
        width: z.number().optional(),
        height: z.number().optional(),
        sizes: z.record(z.string(), z.object({
          source_url: z.string(),
          width: z.number(),
          height: z.number(),
        })).optional(),
      }
    },
    async ({ id }) => {
      const response = await wpClient.getMediaItem(id);
      const m = response.data;
      
      const output = {
        id: m.id,
        title: m.title.rendered,
        source_url: m.source_url,
        mime_type: m.mime_type,
        alt_text: m.alt_text,
        caption: m.caption.rendered,
        width: m.media_details?.width,
        height: m.media_details?.height,
        sizes: m.media_details?.sizes,
      };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    }
  );

  // === CATEGORIES & TAGS ===
  
  server.registerTool(
    'wp_list_categories',
    {
      title: 'Liste Kategorien',
      description: 'Holt alle WordPress-Kategorien',
      inputSchema: {},
      outputSchema: {
        categories: z.array(z.object({
          id: z.number(),
          name: z.string(),
          slug: z.string(),
          count: z.number(),
          parent: z.number(),
        })),
      }
    },
    async () => {
      const response = await wpClient.getCategories();
      const categories = response.data.map(c => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        count: c.count,
        parent: c.parent,
      }));
      
      const output = { categories };
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    }
  );

  server.registerTool(
    'wp_list_tags',
    {
      title: 'Liste Tags',
      description: 'Holt alle WordPress-Tags',
      inputSchema: {},
      outputSchema: {
        tags: z.array(z.object({
          id: z.number(),
          name: z.string(),
          slug: z.string(),
          count: z.number(),
        })),
      }
    },
    async () => {
      const response = await wpClient.getTags();
      const tags = response.data.map(t => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        count: t.count,
      }));
      
      const output = { tags };
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    }
  );
}
