/**
 * Image Processing Tools
 * Tools für Bildbearbeitung und Medienverarbeitung
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { WordPressClient } from '../wordpress/client.js';

export function registerImageTools(server: McpServer, wpClient: WordPressClient) {
  
  // ============================================
  // IMAGE ANALYSIS
  // ============================================

  server.registerTool(
    'image_get_details',
    {
      title: 'Bild-Details abrufen',
      description: 'Ruft detaillierte Informationen zu einem Bild ab',
      inputSchema: {
        mediaId: z.number().describe('Media/Attachment ID'),
      },
    },
    async ({ mediaId }) => {
      const response = await wpClient.customRequest<{
        id: number;
        title: { rendered: string };
        alt_text: string;
        caption: { rendered: string };
        description: { rendered: string };
        media_type: string;
        mime_type: string;
        source_url: string;
        media_details: {
          width: number;
          height: number;
          file: string;
          filesize: number;
          sizes: Record<string, {
            file: string;
            width: number;
            height: number;
            filesize: number;
            mime_type: string;
            source_url: string;
          }>;
          image_meta: {
            aperture: string;
            credit: string;
            camera: string;
            caption: string;
            created_timestamp: string;
            copyright: string;
            focal_length: string;
            iso: string;
            shutter_speed: string;
            title: string;
            orientation: string;
            keywords: string[];
          };
        };
      }>(`/media/${mediaId}`);
      
      const m = response.data;
      const details = m.media_details;
      
      const output = {
        id: m.id,
        title: m.title.rendered,
        altText: m.alt_text,
        caption: m.caption.rendered.replace(/<[^>]*>/g, ''),
        description: m.description.rendered.replace(/<[^>]*>/g, ''),
        mediaType: m.media_type,
        mimeType: m.mime_type,
        sourceUrl: m.source_url,
        dimensions: {
          width: details.width,
          height: details.height,
          aspectRatio: (details.width / details.height).toFixed(2),
        },
        file: {
          name: details.file,
          size: details.filesize,
          sizeFormatted: formatFileSize(details.filesize),
        },
        availableSizes: Object.entries(details.sizes || {}).map(([name, size]) => ({
          name,
          width: size.width,
          height: size.height,
          filesize: size.filesize,
          url: size.source_url,
        })),
        exif: details.image_meta ? {
          camera: details.image_meta.camera,
          aperture: details.image_meta.aperture,
          focalLength: details.image_meta.focal_length,
          iso: details.image_meta.iso,
          shutterSpeed: details.image_meta.shutter_speed,
          copyright: details.image_meta.copyright,
          credit: details.image_meta.credit,
          created: details.image_meta.created_timestamp,
          orientation: details.image_meta.orientation,
          keywords: details.image_meta.keywords,
        } : null,
      };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
      };
    }
  );

  server.registerTool(
    'image_list_sizes',
    {
      title: 'Registrierte Bildgrößen auflisten',
      description: 'Listet alle in WordPress registrierten Bildgrößen auf',
      inputSchema: {},
    },
    async () => {
      // Get a sample image to see available sizes
      const response = await wpClient.customRequest<Array<{
        id: number;
        media_details: {
          sizes: Record<string, {
            width: number;
            height: number;
          }>;
        };
      }>>('/media', 'GET', undefined, { per_page: 1, media_type: 'image' });
      
      if (response.data.length === 0) {
        return {
          content: [{ type: 'text', text: 'Keine Bilder in der Mediathek gefunden' }],
        };
      }
      
      const sizes = response.data[0].media_details.sizes || {};
      
      const registeredSizes = Object.entries(sizes).map(([name, size]) => ({
        name,
        width: size.width,
        height: size.height,
        aspectRatio: (size.width / size.height).toFixed(2),
      }));
      
      // Add standard WordPress sizes info
      const standardSizes = [
        { name: 'thumbnail', description: 'Kleines Vorschaubild', defaultWidth: 150, defaultHeight: 150 },
        { name: 'medium', description: 'Mittlere Größe', defaultWidth: 300, defaultHeight: 300 },
        { name: 'medium_large', description: 'Mittelgroß (Responsive)', defaultWidth: 768, defaultHeight: 0 },
        { name: 'large', description: 'Große Größe', defaultWidth: 1024, defaultHeight: 1024 },
        { name: 'full', description: 'Original (unverändert)', defaultWidth: null, defaultHeight: null },
      ];
      
      return {
        content: [{ type: 'text', text: JSON.stringify({
          registeredSizes,
          standardSizes,
          note: 'Zusätzliche Größen können von Themes/Plugins registriert werden',
        }, null, 2) }],
      };
    }
  );

  // ============================================
  // IMAGE EDITING
  // ============================================

  server.registerTool(
    'image_update_meta',
    {
      title: 'Bild-Metadaten aktualisieren',
      description: 'Aktualisiert Alt-Text, Titel, Beschreibung eines Bildes',
      inputSchema: {
        mediaId: z.number().describe('Media/Attachment ID'),
        altText: z.string().optional().describe('Alt-Text (wichtig für SEO & Accessibility)'),
        title: z.string().optional().describe('Titel'),
        caption: z.string().optional().describe('Bildunterschrift'),
        description: z.string().optional().describe('Beschreibung'),
      },
    },
    async ({ mediaId, altText, title, caption, description }) => {
      const updateData: Record<string, unknown> = {};
      
      if (altText !== undefined) updateData.alt_text = altText;
      if (title !== undefined) updateData.title = title;
      if (caption !== undefined) updateData.caption = caption;
      if (description !== undefined) updateData.description = description;
      
      await wpClient.customRequest(`/media/${mediaId}`, 'PUT', updateData);
      
      return {
        content: [{ type: 'text', text: `Bild ${mediaId} aktualisiert` }],
      };
    }
  );

  server.registerTool(
    'image_edit',
    {
      title: 'Bild bearbeiten',
      description: 'Bearbeitet ein Bild (Zuschneiden, Drehen, Spiegeln) - nutzt WordPress Image Editor API',
      inputSchema: {
        mediaId: z.number().describe('Media/Attachment ID'),
        action: z.enum(['crop', 'rotate', 'flip']).describe('Bearbeitungsaktion'),
        cropData: z.object({
          x: z.number().describe('X-Startposition'),
          y: z.number().describe('Y-Startposition'),
          width: z.number().describe('Breite'),
          height: z.number().describe('Höhe'),
        }).optional().describe('Zuschnitt-Daten (nur für crop)'),
        rotateAngle: z.enum(['90', '180', '270']).optional().describe('Drehwinkel (nur für rotate)'),
        flipDirection: z.enum(['horizontal', 'vertical']).optional().describe('Spiegelrichtung (nur für flip)'),
        applyToSizes: z.array(z.string()).optional().describe('Bildgrößen zum Anwenden (oder "all")'),
      },
    },
    async ({ mediaId, action, cropData, rotateAngle, flipDirection, applyToSizes }) => {
      // WordPress REST API doesn't have native image editing
      // This would need the custom plugin endpoint
      try {
        const editData: Record<string, unknown> = {
          action,
        };
        
        if (action === 'crop' && cropData) {
          editData.crop = cropData;
        }
        if (action === 'rotate' && rotateAngle) {
          editData.angle = parseInt(rotateAngle);
        }
        if (action === 'flip' && flipDirection) {
          editData.direction = flipDirection;
        }
        if (applyToSizes) {
          editData.sizes = applyToSizes;
        }
        
        // Try custom endpoint first
        const response = await wpClient.customRequest<{ success: boolean; message: string }>(
          `/wp-mcp/v1/media/${mediaId}/edit`,
          'POST',
          editData
        );
        
        return {
          content: [{ type: 'text', text: response.data.message || 'Bild bearbeitet' }],
        };
      } catch {
        return {
          content: [{ type: 'text', text: `Bildbearbeitung erfordert das WP-MCP Extensions Plugin.\n\nAlternativ können Sie die WordPress Admin-Oberfläche verwenden:\n${wpClient['config'].siteUrl}/wp-admin/post.php?post=${mediaId}&action=edit` }],
        };
      }
    }
  );

  server.registerTool(
    'image_regenerate_thumbnails',
    {
      title: 'Thumbnails regenerieren',
      description: 'Regeneriert alle Bildgrößen für ein oder mehrere Bilder',
      inputSchema: {
        mediaIds: z.array(z.number()).optional().describe('Array von Media-IDs (leer = alle Bilder)'),
        onlyMissing: z.boolean().optional().default(true).describe('Nur fehlende Größen generieren'),
      },
    },
    async ({ mediaIds, onlyMissing }) => {
      try {
        const response = await wpClient.customRequest<{ 
          success: boolean; 
          processed: number;
          message: string;
        }>(
          '/wp-mcp/v1/media/regenerate',
          'POST',
          {
            media_ids: mediaIds || [],
            only_missing: onlyMissing,
          }
        );
        
        return {
          content: [{ type: 'text', text: response.data.message || `${response.data.processed} Bilder verarbeitet` }],
        };
      } catch {
        return {
          content: [{ type: 'text', text: 'Thumbnail-Regenerierung erfordert das WP-MCP Extensions Plugin oder "Regenerate Thumbnails" Plugin' }],
        };
      }
    }
  );

  // ============================================
  // IMAGE OPTIMIZATION ANALYSIS
  // ============================================

  server.registerTool(
    'image_analyze_optimization',
    {
      title: 'Bildoptimierung analysieren',
      description: 'Analysiert Bilder auf Optimierungspotential',
      inputSchema: {
        limit: z.number().optional().default(20).describe('Anzahl der zu analysierenden Bilder'),
      },
    },
    async ({ limit }) => {
      const response = await wpClient.customRequest<Array<{
        id: number;
        title: { rendered: string };
        source_url: string;
        media_details: {
          width: number;
          height: number;
          filesize: number;
          sizes: Record<string, { filesize: number }>;
        };
        alt_text: string;
      }>>('/media', 'GET', undefined, { 
        per_page: limit, 
        media_type: 'image',
        _fields: 'id,title,source_url,media_details,alt_text',
      });
      
      const analysis = response.data.map(img => {
        const issues: string[] = [];
        const suggestions: string[] = [];
        let score = 100;
        
        const filesize = img.media_details.filesize || 0;
        const width = img.media_details.width || 0;
        const height = img.media_details.height || 0;
        
        // Check filesize
        if (filesize > 500000) { // > 500KB
          issues.push(`Große Datei: ${formatFileSize(filesize)}`);
          suggestions.push('Bild komprimieren oder WebP-Format verwenden');
          score -= 20;
        } else if (filesize > 200000) { // > 200KB
          issues.push(`Mittlere Datei: ${formatFileSize(filesize)}`);
          suggestions.push('Komprimierung prüfen');
          score -= 10;
        }
        
        // Check dimensions
        if (width > 2500 || height > 2500) {
          issues.push(`Sehr große Dimensionen: ${width}x${height}px`);
          suggestions.push('Bildgröße reduzieren, falls nicht für Fullscreen benötigt');
          score -= 15;
        }
        
        // Check alt text
        if (!img.alt_text || img.alt_text.trim().length === 0) {
          issues.push('Kein Alt-Text');
          suggestions.push('Alt-Text für SEO & Accessibility hinzufügen');
          score -= 25;
        } else if (img.alt_text.length < 10) {
          issues.push('Alt-Text sehr kurz');
          suggestions.push('Beschreibenderen Alt-Text verwenden');
          score -= 10;
        }
        
        // Check available sizes
        const sizeCount = Object.keys(img.media_details.sizes || {}).length;
        if (sizeCount < 3) {
          issues.push(`Wenige Bildgrößen: ${sizeCount}`);
          suggestions.push('Thumbnails regenerieren');
          score -= 10;
        }
        
        return {
          id: img.id,
          title: img.title.rendered,
          url: img.source_url,
          dimensions: `${width}x${height}`,
          filesize: formatFileSize(filesize),
          altText: img.alt_text || '(fehlt)',
          score: Math.max(0, score),
          issues,
          suggestions,
        };
      });
      
      // Sort by score (worst first)
      analysis.sort((a, b) => a.score - b.score);
      
      const withIssues = analysis.filter(a => a.issues.length > 0);
      const averageScore = analysis.reduce((sum, a) => sum + a.score, 0) / analysis.length;
      
      return {
        content: [{ type: 'text', text: JSON.stringify({
          analyzed: analysis.length,
          withIssues: withIssues.length,
          averageScore: Math.round(averageScore),
          images: analysis,
        }, null, 2) }],
      };
    }
  );

  server.registerTool(
    'image_find_unused',
    {
      title: 'Unbenutzte Bilder finden',
      description: 'Findet Bilder die in keinem Post/Seite verwendet werden',
      inputSchema: {
        limit: z.number().optional().default(50).describe('Maximale Anzahl'),
      },
    },
    async ({ limit }) => {
      // Get all media
      const mediaResponse = await wpClient.customRequest<Array<{
        id: number;
        title: { rendered: string };
        source_url: string;
        media_details: { filesize: number };
      }>>('/media', 'GET', undefined, { 
        per_page: 100, 
        media_type: 'image',
        _fields: 'id,title,source_url,media_details',
      });
      
      // Get all posts and pages to check usage
      const [postsResponse, pagesResponse] = await Promise.all([
        wpClient.customRequest<Array<{ id: number; content: { rendered: string }; featured_media: number }>>('/posts', 'GET', undefined, { per_page: 100, _fields: 'id,content,featured_media' }),
        wpClient.customRequest<Array<{ id: number; content: { rendered: string }; featured_media: number }>>('/pages', 'GET', undefined, { per_page: 100, _fields: 'id,content,featured_media' }),
      ]);
      
      const allContent = [...postsResponse.data, ...pagesResponse.data];
      const usedMediaIds = new Set<number>();
      
      // Check featured images
      allContent.forEach(post => {
        if (post.featured_media) {
          usedMediaIds.add(post.featured_media);
        }
      });
      
      // Check content for image references
      allContent.forEach(post => {
        const content = post.content.rendered;
        
        // Find wp-image-{id} classes
        const wpImageMatches = content.match(/wp-image-(\d+)/g) || [];
        wpImageMatches.forEach(match => {
          const id = parseInt(match.replace('wp-image-', ''));
          usedMediaIds.add(id);
        });
        
        // Find attachment URLs
        mediaResponse.data.forEach(media => {
          if (content.includes(media.source_url)) {
            usedMediaIds.add(media.id);
          }
        });
      });
      
      // Find unused
      const unused = mediaResponse.data
        .filter(media => !usedMediaIds.has(media.id))
        .slice(0, limit)
        .map(media => ({
          id: media.id,
          title: media.title.rendered,
          url: media.source_url,
          filesize: formatFileSize(media.media_details?.filesize || 0),
        }));
      
      const totalUnusedSize = unused.reduce((sum, img) => {
        const media = mediaResponse.data.find(m => m.id === img.id);
        return sum + (media?.media_details?.filesize || 0);
      }, 0);
      
      return {
        content: [{ type: 'text', text: JSON.stringify({
          totalImages: mediaResponse.data.length,
          usedImages: usedMediaIds.size,
          unusedCount: unused.length,
          potentialSavings: formatFileSize(totalUnusedSize),
          unusedImages: unused,
          note: 'Vorsicht: Bilder können auch in Widgets, Optionen oder via Shortcodes verwendet werden',
        }, null, 2) }],
      };
    }
  );

  server.registerTool(
    'image_find_missing_alt',
    {
      title: 'Bilder ohne Alt-Text finden',
      description: 'Findet alle Bilder ohne Alt-Text',
      inputSchema: {
        limit: z.number().optional().default(50).describe('Maximale Anzahl'),
      },
    },
    async ({ limit }) => {
      const response = await wpClient.customRequest<Array<{
        id: number;
        title: { rendered: string };
        source_url: string;
        alt_text: string;
      }>>('/media', 'GET', undefined, { 
        per_page: 100, 
        media_type: 'image',
        _fields: 'id,title,source_url,alt_text',
      });
      
      const missingAlt = response.data
        .filter(media => !media.alt_text || media.alt_text.trim().length === 0)
        .slice(0, limit)
        .map(media => ({
          id: media.id,
          title: media.title.rendered,
          url: media.source_url,
          editUrl: `${wpClient['config'].siteUrl}/wp-admin/post.php?post=${media.id}&action=edit`,
        }));
      
      return {
        content: [{ type: 'text', text: JSON.stringify({
          totalImages: response.data.length,
          withAlt: response.data.length - missingAlt.length,
          missingAlt: missingAlt.length,
          percentage: `${Math.round((missingAlt.length / response.data.length) * 100)}% ohne Alt-Text`,
          images: missingAlt,
        }, null, 2) }],
      };
    }
  );

  // ============================================
  // BULK OPERATIONS
  // ============================================

  server.registerTool(
    'image_bulk_update_alt',
    {
      title: 'Bulk Alt-Text aktualisieren',
      description: 'Aktualisiert Alt-Text für mehrere Bilder',
      inputSchema: {
        updates: z.array(z.object({
          mediaId: z.number(),
          altText: z.string(),
        })).describe('Array von {mediaId, altText} Objekten'),
      },
    },
    async ({ updates }) => {
      let success = 0;
      let failed = 0;
      
      for (const update of updates) {
        try {
          await wpClient.customRequest(`/media/${update.mediaId}`, 'PUT', { alt_text: update.altText });
          success++;
        } catch {
          failed++;
        }
      }
      
      return {
        content: [{ type: 'text', text: `Alt-Text aktualisiert: ${success} erfolgreich, ${failed} fehlgeschlagen` }],
      };
    }
  );

  server.registerTool(
    'image_delete_unused',
    {
      title: 'Unbenutzte Bilder löschen',
      description: 'Löscht Bilder die nicht verwendet werden (VORSICHT!)',
      inputSchema: {
        mediaIds: z.array(z.number()).describe('Array von Media-IDs zum Löschen'),
        force: z.boolean().optional().default(false).describe('Endgültig löschen'),
      },
    },
    async ({ mediaIds, force }) => {
      if (mediaIds.length === 0) {
        return {
          content: [{ type: 'text', text: 'Keine Bilder zum Löschen angegeben' }],
        };
      }
      
      let deleted = 0;
      let failed = 0;
      
      for (const id of mediaIds) {
        try {
          await wpClient.customRequest(`/media/${id}`, 'DELETE', undefined, { force });
          deleted++;
        } catch {
          failed++;
        }
      }
      
      return {
        content: [{ type: 'text', text: `${deleted} Bilder ${force ? 'endgültig gelöscht' : 'in Papierkorb verschoben'}, ${failed} fehlgeschlagen` }],
      };
    }
  );

  // ============================================
  // FOCAL POINT
  // ============================================

  server.registerTool(
    'image_set_focal_point',
    {
      title: 'Fokuspunkt setzen',
      description: 'Setzt den Fokuspunkt eines Bildes (für Smart Cropping)',
      inputSchema: {
        mediaId: z.number().describe('Media ID'),
        x: z.number().min(0).max(100).describe('X-Position in Prozent (0-100)'),
        y: z.number().min(0).max(100).describe('Y-Position in Prozent (0-100)'),
      },
    },
    async ({ mediaId, x, y }) => {
      try {
        // Try custom endpoint
        await wpClient.customRequest(`/wp-mcp/v1/media/${mediaId}/focal-point`, 'POST', { x, y });
        
        return {
          content: [{ type: 'text', text: `Fokuspunkt für Bild ${mediaId} auf ${x}%, ${y}% gesetzt` }],
        };
      } catch {
        // Fallback: Store in meta
        await wpClient.customRequest(`/media/${mediaId}`, 'PUT', {
          meta: {
            _focal_point_x: x,
            _focal_point_y: y,
          },
        });
        
        return {
          content: [{ type: 'text', text: `Fokuspunkt in Meta gespeichert. Hinweis: Theme muss Focal Points unterstützen.` }],
        };
      }
    }
  );
}

// Helper function
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
