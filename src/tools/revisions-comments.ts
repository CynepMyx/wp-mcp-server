/**
 * Revision & Comment Tools
 * Tools für Revisionsverwaltung und Kommentarmoderation
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { WordPressClient } from '../wordpress/client.js';

export function registerRevisionTools(server: McpServer, wpClient: WordPressClient) {
  
  // ============================================
  // REVISIONS
  // ============================================

  server.registerTool(
    'revision_list',
    {
      title: 'Revisionen auflisten',
      description: 'Listet alle Revisionen eines Posts/einer Seite auf',
      inputSchema: {
        postId: z.number().describe('Post/Page ID'),
        postType: z.enum(['post', 'page']).default('post').describe('Post-Typ'),
      },
    },
    async ({ postId, postType }) => {
      const endpoint = postType === 'page' ? `/pages/${postId}/revisions` : `/posts/${postId}/revisions`;
      
      const response = await wpClient.customRequest<Array<{
        id: number;
        author: number;
        date: string;
        date_gmt: string;
        modified: string;
        modified_gmt: string;
        parent: number;
        slug: string;
        title: { rendered: string };
        content: { rendered: string };
        excerpt: { rendered: string };
      }>>(endpoint);
      
      const revisions = response.data.map((r, index) => ({
        id: r.id,
        version: response.data.length - index,
        author: r.author,
        date: r.date,
        modified: r.modified,
        title: r.title.rendered,
        contentLength: r.content.rendered.length,
        excerptLength: r.excerpt.rendered.length,
      }));
      
      return {
        content: [{ type: 'text', text: JSON.stringify({ 
          postId, 
          totalRevisions: revisions.length, 
          revisions 
        }, null, 2) }],
      };
    }
  );

  server.registerTool(
    'revision_get',
    {
      title: 'Revision Details abrufen',
      description: 'Ruft den vollständigen Inhalt einer spezifischen Revision ab',
      inputSchema: {
        postId: z.number().describe('Post/Page ID'),
        revisionId: z.number().describe('Revision ID'),
        postType: z.enum(['post', 'page']).default('post').describe('Post-Typ'),
      },
    },
    async ({ postId, revisionId, postType }) => {
      const endpoint = postType === 'page' 
        ? `/pages/${postId}/revisions/${revisionId}` 
        : `/posts/${postId}/revisions/${revisionId}`;
      
      const response = await wpClient.customRequest<{
        id: number;
        author: number;
        date: string;
        title: { rendered: string };
        content: { rendered: string };
        excerpt: { rendered: string };
      }>(endpoint);
      
      const r = response.data;
      
      return {
        content: [{ type: 'text', text: JSON.stringify({
          id: r.id,
          postId,
          author: r.author,
          date: r.date,
          title: r.title.rendered,
          content: r.content.rendered,
          excerpt: r.excerpt.rendered,
        }, null, 2) }],
      };
    }
  );

  server.registerTool(
    'revision_compare',
    {
      title: 'Revisionen vergleichen',
      description: 'Vergleicht zwei Revisionen und zeigt Unterschiede',
      inputSchema: {
        postId: z.number().describe('Post/Page ID'),
        revisionId1: z.number().describe('Erste Revision ID'),
        revisionId2: z.number().describe('Zweite Revision ID'),
        postType: z.enum(['post', 'page']).default('post').describe('Post-Typ'),
      },
    },
    async ({ postId, revisionId1, revisionId2, postType }) => {
      const baseEndpoint = postType === 'page' ? `/pages/${postId}/revisions` : `/posts/${postId}/revisions`;
      
      const [rev1, rev2] = await Promise.all([
        wpClient.customRequest<{
          id: number;
          date: string;
          title: { rendered: string };
          content: { rendered: string };
          excerpt: { rendered: string };
        }>(`${baseEndpoint}/${revisionId1}`),
        wpClient.customRequest<{
          id: number;
          date: string;
          title: { rendered: string };
          content: { rendered: string };
          excerpt: { rendered: string };
        }>(`${baseEndpoint}/${revisionId2}`),
      ]);
      
      const r1 = rev1.data;
      const r2 = rev2.data;
      
      // Simple diff analysis
      const titleChanged = r1.title.rendered !== r2.title.rendered;
      const contentChanged = r1.content.rendered !== r2.content.rendered;
      const excerptChanged = r1.excerpt.rendered !== r2.excerpt.rendered;
      
      // Content length changes
      const contentLengthDiff = r2.content.rendered.length - r1.content.rendered.length;
      
      // Word count changes
      const wordCount1 = r1.content.rendered.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(w => w.length > 0).length;
      const wordCount2 = r2.content.rendered.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(w => w.length > 0).length;
      
      return {
        content: [{ type: 'text', text: JSON.stringify({
          postId,
          comparison: {
            from: { id: revisionId1, date: r1.date },
            to: { id: revisionId2, date: r2.date },
          },
          changes: {
            titleChanged,
            contentChanged,
            excerptChanged,
          },
          details: {
            titleBefore: titleChanged ? r1.title.rendered : null,
            titleAfter: titleChanged ? r2.title.rendered : null,
            contentLengthChange: contentLengthDiff,
            wordCountChange: wordCount2 - wordCount1,
            wordCountBefore: wordCount1,
            wordCountAfter: wordCount2,
          },
        }, null, 2) }],
      };
    }
  );

  server.registerTool(
    'revision_restore',
    {
      title: 'Revision wiederherstellen',
      description: 'Stellt eine ältere Revision als aktuelle Version wieder her',
      inputSchema: {
        postId: z.number().describe('Post/Page ID'),
        revisionId: z.number().describe('Revision ID zum Wiederherstellen'),
        postType: z.enum(['post', 'page']).default('post').describe('Post-Typ'),
      },
    },
    async ({ postId, revisionId, postType }) => {
      // Get revision content
      const baseEndpoint = postType === 'page' ? `/pages/${postId}/revisions` : `/posts/${postId}/revisions`;
      
      const revisionResponse = await wpClient.customRequest<{
        id: number;
        title: { rendered: string };
        content: { rendered: string };
        excerpt: { rendered: string };
      }>(`${baseEndpoint}/${revisionId}`);
      
      const revision = revisionResponse.data;
      
      // Update post with revision content
      const updateEndpoint = postType === 'page' ? `/pages/${postId}` : `/posts/${postId}`;
      
      await wpClient.customRequest(updateEndpoint, 'PUT', {
        title: revision.title.rendered,
        content: revision.content.rendered,
        excerpt: revision.excerpt.rendered,
      });
      
      return {
        content: [{ type: 'text', text: `Revision ${revisionId} für ${postType} ${postId} wiederhergestellt` }],
      };
    }
  );

  server.registerTool(
    'revision_delete',
    {
      title: 'Revision löschen',
      description: 'Löscht eine spezifische Revision',
      inputSchema: {
        postId: z.number().describe('Post/Page ID'),
        revisionId: z.number().describe('Revision ID'),
        postType: z.enum(['post', 'page']).default('post').describe('Post-Typ'),
      },
    },
    async ({ postId, revisionId, postType }) => {
      const endpoint = postType === 'page' 
        ? `/pages/${postId}/revisions/${revisionId}` 
        : `/posts/${postId}/revisions/${revisionId}`;
      
      await wpClient.customRequest(endpoint, 'DELETE', undefined, { force: true });
      
      return {
        content: [{ type: 'text', text: `Revision ${revisionId} gelöscht` }],
      };
    }
  );

  server.registerTool(
    'revision_cleanup',
    {
      title: 'Alte Revisionen aufräumen',
      description: 'Löscht alte Revisionen und behält nur die letzten N Versionen',
      inputSchema: {
        postId: z.number().describe('Post/Page ID'),
        keepCount: z.number().min(1).max(50).default(5).describe('Anzahl der zu behaltenden Revisionen'),
        postType: z.enum(['post', 'page']).default('post').describe('Post-Typ'),
      },
    },
    async ({ postId, keepCount, postType }) => {
      const endpoint = postType === 'page' ? `/pages/${postId}/revisions` : `/posts/${postId}/revisions`;
      
      const response = await wpClient.customRequest<Array<{ id: number; date: string }>>(endpoint);
      
      const revisions = response.data;
      
      if (revisions.length <= keepCount) {
        return {
          content: [{ type: 'text', text: `Keine Revisionen zum Löschen (${revisions.length} vorhanden, ${keepCount} behalten)` }],
        };
      }
      
      // Keep the newest ones, delete the rest
      const toDelete = revisions.slice(keepCount);
      
      let deleted = 0;
      for (const rev of toDelete) {
        try {
          await wpClient.customRequest(`${endpoint}/${rev.id}`, 'DELETE', undefined, { force: true });
          deleted++;
        } catch {
          // Skip failed deletions
        }
      }
      
      return {
        content: [{ type: 'text', text: `${deleted} von ${toDelete.length} alten Revisionen gelöscht (${keepCount} behalten)` }],
      };
    }
  );
}

export function registerCommentTools(server: McpServer, wpClient: WordPressClient) {
  
  // ============================================
  // COMMENTS
  // ============================================

  server.registerTool(
    'comment_list',
    {
      title: 'Kommentare auflisten',
      description: 'Listet Kommentare mit verschiedenen Filtern auf',
      inputSchema: {
        postId: z.number().optional().describe('Nur Kommentare dieses Posts'),
        status: z.enum(['approve', 'hold', 'spam', 'trash', 'all']).optional().default('approve').describe('Status'),
        page: z.number().optional().default(1).describe('Seite'),
        perPage: z.number().optional().default(20).describe('Kommentare pro Seite'),
        orderby: z.enum(['date', 'date_gmt', 'id', 'parent']).optional().default('date').describe('Sortierung'),
        order: z.enum(['asc', 'desc']).optional().default('desc').describe('Reihenfolge'),
        search: z.string().optional().describe('Suchbegriff'),
      },
    },
    async (params) => {
      const queryParams: Record<string, string | number> = {
        page: params.page || 1,
        per_page: params.perPage || 20,
        orderby: params.orderby || 'date',
        order: params.order || 'desc',
      };
      
      if (params.postId) queryParams.post = params.postId;
      if (params.status && params.status !== 'all') queryParams.status = params.status;
      if (params.search) queryParams.search = params.search;
      
      const response = await wpClient.customRequest<Array<{
        id: number;
        post: number;
        parent: number;
        author: number;
        author_name: string;
        author_email: string;
        author_url: string;
        author_ip: string;
        date: string;
        content: { rendered: string };
        status: string;
        type: string;
      }>>('/comments', 'GET', undefined, queryParams);
      
      const comments = response.data.map(c => ({
        id: c.id,
        postId: c.post,
        parentId: c.parent,
        author: {
          id: c.author,
          name: c.author_name,
          email: c.author_email,
          url: c.author_url,
        },
        date: c.date,
        content: c.content.rendered.replace(/<[^>]*>/g, '').substring(0, 200) + (c.content.rendered.length > 200 ? '...' : ''),
        status: c.status,
        type: c.type,
      }));
      
      return {
        content: [{ type: 'text', text: JSON.stringify({ count: comments.length, comments }, null, 2) }],
      };
    }
  );

  server.registerTool(
    'comment_get',
    {
      title: 'Kommentar Details abrufen',
      description: 'Ruft Details eines einzelnen Kommentars ab',
      inputSchema: {
        commentId: z.number().describe('Kommentar-ID'),
      },
    },
    async ({ commentId }) => {
      const response = await wpClient.customRequest<{
        id: number;
        post: number;
        parent: number;
        author: number;
        author_name: string;
        author_email: string;
        author_url: string;
        author_ip: string;
        author_user_agent: string;
        date: string;
        date_gmt: string;
        content: { rendered: string; raw?: string };
        link: string;
        status: string;
        type: string;
        meta: Record<string, unknown>;
      }>(`/comments/${commentId}`);
      
      const c = response.data;
      
      return {
        content: [{ type: 'text', text: JSON.stringify({
          id: c.id,
          postId: c.post,
          parentId: c.parent,
          author: {
            id: c.author,
            name: c.author_name,
            email: c.author_email,
            url: c.author_url,
            ip: c.author_ip,
            userAgent: c.author_user_agent,
          },
          date: c.date,
          content: c.content.rendered,
          contentRaw: c.content.raw,
          link: c.link,
          status: c.status,
          type: c.type,
          meta: c.meta,
        }, null, 2) }],
      };
    }
  );

  server.registerTool(
    'comment_create',
    {
      title: 'Kommentar erstellen',
      description: 'Erstellt einen neuen Kommentar',
      inputSchema: {
        postId: z.number().describe('Post-ID'),
        content: z.string().describe('Kommentar-Inhalt'),
        authorName: z.string().optional().describe('Autor-Name (wenn nicht eingeloggt)'),
        authorEmail: z.string().optional().describe('Autor-Email'),
        authorUrl: z.string().optional().describe('Autor-Website'),
        parentId: z.number().optional().describe('Parent-Kommentar-ID für Antworten'),
        status: z.enum(['approve', 'hold']).optional().describe('Status'),
      },
    },
    async (params) => {
      const commentData: Record<string, unknown> = {
        post: params.postId,
        content: params.content,
      };
      
      if (params.authorName) commentData.author_name = params.authorName;
      if (params.authorEmail) commentData.author_email = params.authorEmail;
      if (params.authorUrl) commentData.author_url = params.authorUrl;
      if (params.parentId) commentData.parent = params.parentId;
      if (params.status) commentData.status = params.status;
      
      const response = await wpClient.customRequest<{ id: number; link: string }>(
        '/comments',
        'POST',
        commentData
      );
      
      return {
        content: [{ type: 'text', text: `Kommentar erstellt (ID: ${response.data.id})\nLink: ${response.data.link}` }],
      };
    }
  );

  server.registerTool(
    'comment_update',
    {
      title: 'Kommentar aktualisieren',
      description: 'Aktualisiert einen bestehenden Kommentar',
      inputSchema: {
        commentId: z.number().describe('Kommentar-ID'),
        content: z.string().optional().describe('Neuer Inhalt'),
        status: z.enum(['approve', 'hold', 'spam', 'trash']).optional().describe('Neuer Status'),
      },
    },
    async ({ commentId, content, status }) => {
      const updateData: Record<string, unknown> = {};
      
      if (content) updateData.content = content;
      if (status) updateData.status = status;
      
      await wpClient.customRequest(`/comments/${commentId}`, 'PUT', updateData);
      
      return {
        content: [{ type: 'text', text: `Kommentar ${commentId} aktualisiert` }],
      };
    }
  );

  server.registerTool(
    'comment_delete',
    {
      title: 'Kommentar löschen',
      description: 'Löscht einen Kommentar',
      inputSchema: {
        commentId: z.number().describe('Kommentar-ID'),
        force: z.boolean().optional().default(false).describe('Endgültig löschen (ohne Papierkorb)'),
      },
    },
    async ({ commentId, force }) => {
      await wpClient.customRequest(`/comments/${commentId}`, 'DELETE', undefined, { force });
      
      return {
        content: [{ type: 'text', text: `Kommentar ${commentId} ${force ? 'endgültig gelöscht' : 'in Papierkorb verschoben'}` }],
      };
    }
  );

  server.registerTool(
    'comment_moderate_bulk',
    {
      title: 'Kommentare Bulk-Moderation',
      description: 'Moderiert mehrere Kommentare auf einmal',
      inputSchema: {
        commentIds: z.array(z.number()).describe('Array von Kommentar-IDs'),
        action: z.enum(['approve', 'hold', 'spam', 'trash', 'delete']).describe('Aktion'),
      },
    },
    async ({ commentIds, action }) => {
      let success = 0;
      let failed = 0;
      
      for (const id of commentIds) {
        try {
          if (action === 'delete') {
            await wpClient.customRequest(`/comments/${id}`, 'DELETE', undefined, { force: true });
          } else {
            await wpClient.customRequest(`/comments/${id}`, 'PUT', { status: action });
          }
          success++;
        } catch {
          failed++;
        }
      }
      
      return {
        content: [{ type: 'text', text: `Bulk-Moderation abgeschlossen: ${success} erfolgreich, ${failed} fehlgeschlagen` }],
      };
    }
  );

  server.registerTool(
    'comment_get_pending_count',
    {
      title: 'Ausstehende Kommentare zählen',
      description: 'Zählt Kommentare nach Status',
      inputSchema: {},
    },
    async () => {
      const statuses = ['approve', 'hold', 'spam', 'trash'];
      
      const counts = await Promise.all(
        statuses.map(async (status) => {
          const response = await wpClient.customRequest<Array<unknown>>(
            '/comments',
            'GET',
            undefined,
            { status, per_page: 1 }
          );
          
          // Get total from headers (X-WP-Total)
          const total = response.headers?.get('X-WP-Total') || response.data.length;
          return { status, count: parseInt(String(total), 10) };
        })
      );
      
      const result = counts.reduce((acc, { status, count }) => {
        acc[status] = count;
        return acc;
      }, {} as Record<string, number>);
      
      return {
        content: [{ type: 'text', text: JSON.stringify({
          approved: result.approve || 0,
          pending: result.hold || 0,
          spam: result.spam || 0,
          trash: result.trash || 0,
          total: Object.values(result).reduce((a, b) => a + b, 0),
        }, null, 2) }],
      };
    }
  );

  server.registerTool(
    'comment_reply',
    {
      title: 'Auf Kommentar antworten',
      description: 'Antwortet auf einen bestehenden Kommentar',
      inputSchema: {
        commentId: z.number().describe('Kommentar-ID auf den geantwortet wird'),
        content: z.string().describe('Antwort-Inhalt'),
      },
    },
    async ({ commentId, content }) => {
      // Get original comment to find post ID
      const originalResponse = await wpClient.customRequest<{ id: number; post: number }>(
        `/comments/${commentId}`
      );
      
      const response = await wpClient.customRequest<{ id: number; link: string }>(
        '/comments',
        'POST',
        {
          post: originalResponse.data.post,
          parent: commentId,
          content,
          status: 'approve',
        }
      );
      
      return {
        content: [{ type: 'text', text: `Antwort erstellt (ID: ${response.data.id})\nLink: ${response.data.link}` }],
      };
    }
  );
}
