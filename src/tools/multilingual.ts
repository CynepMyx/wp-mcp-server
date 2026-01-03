/**
 * Multilingual Tools - WPML, Polylang, TranslatePress
 * Tools für mehrsprachige WordPress-Websites
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { WordPressClient } from '../wordpress/client.js';

export function registerMultilingualTools(server: McpServer, wpClient: WordPressClient) {
  
  // ============================================
  // LANGUAGE DETECTION & INFO
  // ============================================

  server.registerTool(
    'ml_detect_plugin',
    {
      title: 'Multilingual Plugin erkennen',
      description: 'Erkennt welches Multilingual-Plugin installiert ist',
      inputSchema: {},
    },
    async () => {
      const plugins: Array<{
        name: string;
        detected: boolean;
        endpoint?: string;
        details?: unknown;
      }> = [];
      
      // Check WPML
      try {
        const wpmlResponse = await wpClient.customRequest<{
          active_languages: Record<string, unknown>;
          default_language: string;
        }>('/wpml/v1/languages');
        plugins.push({
          name: 'WPML',
          detected: true,
          endpoint: '/wpml/v1',
          details: wpmlResponse.data,
        });
      } catch {
        plugins.push({ name: 'WPML', detected: false });
      }
      
      // Check Polylang
      try {
        const polylangResponse = await wpClient.customRequest<Array<{
          slug: string;
          name: string;
          locale: string;
        }>>('/pll/v1/languages');
        plugins.push({
          name: 'Polylang',
          detected: true,
          endpoint: '/pll/v1',
          details: { languages: polylangResponse.data },
        });
      } catch {
        plugins.push({ name: 'Polylang', detected: false });
      }
      
      // Check TranslatePress
      try {
        const tpResponse = await wpClient.customRequest<{
          default_language: string;
          translation_languages: string[];
        }>('/translatepress/v1/settings');
        plugins.push({
          name: 'TranslatePress',
          detected: true,
          endpoint: '/translatepress/v1',
          details: tpResponse.data,
        });
      } catch {
        plugins.push({ name: 'TranslatePress', detected: false });
      }
      
      const activePlugin = plugins.find(p => p.detected);
      
      return {
        content: [{ type: 'text', text: JSON.stringify({
          activePlugin: activePlugin?.name || 'None detected',
          plugins,
        }, null, 2) }],
      };
    }
  );

  // ============================================
  // WPML TOOLS
  // ============================================

  server.registerTool(
    'wpml_list_languages',
    {
      title: 'WPML Sprachen auflisten',
      description: 'Listet alle konfigurierten WPML-Sprachen auf',
      inputSchema: {},
    },
    async () => {
      try {
        const response = await wpClient.customRequest<{
          active_languages: Record<string, {
            code: string;
            english_name: string;
            native_name: string;
            default_locale: string;
            active: boolean;
            url: string;
          }>;
          default_language: string;
        }>('/wpml/v1/languages');
        
        const languages = Object.values(response.data.active_languages).map(lang => ({
          code: lang.code,
          englishName: lang.english_name,
          nativeName: lang.native_name,
          locale: lang.default_locale,
          isDefault: lang.code === response.data.default_language,
          url: lang.url,
        }));
        
        return {
          content: [{ type: 'text', text: JSON.stringify({
            defaultLanguage: response.data.default_language,
            languageCount: languages.length,
            languages,
          }, null, 2) }],
        };
      } catch {
        return {
          content: [{ type: 'text', text: 'WPML nicht installiert oder REST API nicht verfügbar' }],
        };
      }
    }
  );

  server.registerTool(
    'wpml_get_post_translations',
    {
      title: 'WPML Post-Übersetzungen abrufen',
      description: 'Ruft alle Übersetzungen eines Posts ab',
      inputSchema: {
        postId: z.number().describe('Post-ID'),
      },
    },
    async ({ postId }) => {
      try {
        const response = await wpClient.customRequest<{
          translations: Record<string, {
            id: number;
            post_title: string;
            post_status: string;
            language_code: string;
          }>;
        }>(`/wpml/v1/posts/${postId}/translations`);
        
        const translations = Object.entries(response.data.translations).map(([code, trans]) => ({
          languageCode: code,
          postId: trans.id,
          title: trans.post_title,
          status: trans.post_status,
        }));
        
        return {
          content: [{ type: 'text', text: JSON.stringify({
            originalPostId: postId,
            translationCount: translations.length,
            translations,
          }, null, 2) }],
        };
      } catch {
        return {
          content: [{ type: 'text', text: 'WPML nicht installiert oder Post nicht gefunden' }],
        };
      }
    }
  );

  server.registerTool(
    'wpml_create_translation',
    {
      title: 'WPML Übersetzung erstellen',
      description: 'Erstellt eine Übersetzung für einen Post',
      inputSchema: {
        postId: z.number().describe('Original Post-ID'),
        targetLanguage: z.string().describe('Zielsprache (z.B. de, en, fr)'),
        title: z.string().describe('Übersetzter Titel'),
        content: z.string().describe('Übersetzter Inhalt'),
        status: z.enum(['publish', 'draft']).optional().default('draft').describe('Status'),
      },
    },
    async ({ postId, targetLanguage, title, content, status }) => {
      try {
        const response = await wpClient.customRequest<{ id: number; link: string }>(
          '/wpml/v1/posts',
          'POST',
          {
            trid: postId, // Translation ID (original post)
            language_code: targetLanguage,
            title,
            content,
            status,
          }
        );
        
        return {
          content: [{ type: 'text', text: `Übersetzung erstellt (ID: ${response.data.id})\nSprache: ${targetLanguage}\nLink: ${response.data.link}` }],
        };
      } catch {
        return {
          content: [{ type: 'text', text: 'Fehler beim Erstellen der Übersetzung. WPML REST API möglicherweise nicht verfügbar.' }],
        };
      }
    }
  );

  server.registerTool(
    'wpml_get_string_translations',
    {
      title: 'WPML String-Übersetzungen',
      description: 'Ruft registrierte String-Übersetzungen ab',
      inputSchema: {
        domain: z.string().optional().describe('Text-Domain (z.B. theme-name, plugin-name)'),
        language: z.string().optional().describe('Sprache'),
      },
    },
    async ({ domain, language }) => {
      try {
        const params: Record<string, string> = {};
        if (domain) params.domain = domain;
        if (language) params.language = language;
        
        const response = await wpClient.customRequest<Array<{
          id: number;
          name: string;
          value: string;
          domain: string;
          translations: Record<string, string>;
        }>>('/wpml/v1/strings', 'GET', undefined, params);
        
        return {
          content: [{ type: 'text', text: JSON.stringify({
            count: response.data.length,
            strings: response.data.slice(0, 50), // Limit output
          }, null, 2) }],
        };
      } catch {
        return {
          content: [{ type: 'text', text: 'WPML String Translation nicht verfügbar' }],
        };
      }
    }
  );

  // ============================================
  // POLYLANG TOOLS
  // ============================================

  server.registerTool(
    'polylang_list_languages',
    {
      title: 'Polylang Sprachen auflisten',
      description: 'Listet alle konfigurierten Polylang-Sprachen auf',
      inputSchema: {},
    },
    async () => {
      try {
        const response = await wpClient.customRequest<Array<{
          slug: string;
          name: string;
          locale: string;
          is_default: boolean;
          flag_url: string;
          home_url: string;
        }>>('/pll/v1/languages');
        
        const languages = response.data.map(lang => ({
          slug: lang.slug,
          name: lang.name,
          locale: lang.locale,
          isDefault: lang.is_default,
          flagUrl: lang.flag_url,
          homeUrl: lang.home_url,
        }));
        
        return {
          content: [{ type: 'text', text: JSON.stringify({
            languageCount: languages.length,
            defaultLanguage: languages.find(l => l.isDefault)?.slug,
            languages,
          }, null, 2) }],
        };
      } catch {
        return {
          content: [{ type: 'text', text: 'Polylang nicht installiert oder REST API nicht verfügbar' }],
        };
      }
    }
  );

  server.registerTool(
    'polylang_get_post_language',
    {
      title: 'Polylang Post-Sprache abrufen',
      description: 'Ruft die Sprache eines Posts und seine Übersetzungen ab',
      inputSchema: {
        postId: z.number().describe('Post-ID'),
      },
    },
    async ({ postId }) => {
      try {
        // Standard WP endpoint with Polylang adds language info
        const response = await wpClient.customRequest<{
          id: number;
          title: { rendered: string };
          lang: string;
          translations: Record<string, number>;
        }>(`/posts/${postId}`);
        
        return {
          content: [{ type: 'text', text: JSON.stringify({
            postId,
            title: response.data.title.rendered,
            language: response.data.lang,
            translations: response.data.translations,
          }, null, 2) }],
        };
      } catch {
        return {
          content: [{ type: 'text', text: 'Post nicht gefunden oder Polylang nicht aktiv' }],
        };
      }
    }
  );

  server.registerTool(
    'polylang_set_post_language',
    {
      title: 'Polylang Post-Sprache setzen',
      description: 'Setzt die Sprache eines Posts',
      inputSchema: {
        postId: z.number().describe('Post-ID'),
        language: z.string().describe('Sprach-Slug (z.B. de, en, fr)'),
      },
    },
    async ({ postId, language }) => {
      try {
        await wpClient.customRequest(`/posts/${postId}`, 'PUT', { lang: language });
        
        return {
          content: [{ type: 'text', text: `Sprache für Post ${postId} auf "${language}" gesetzt` }],
        };
      } catch {
        return {
          content: [{ type: 'text', text: 'Fehler beim Setzen der Sprache' }],
        };
      }
    }
  );

  server.registerTool(
    'polylang_link_translations',
    {
      title: 'Polylang Übersetzungen verknüpfen',
      description: 'Verknüpft Posts als Übersetzungen voneinander',
      inputSchema: {
        translations: z.record(z.number()).describe('Objekt mit Sprach-Slug als Key und Post-ID als Value'),
      },
    },
    async ({ translations }) => {
      try {
        // Get first post to update
        const postIds = Object.values(translations);
        
        if (postIds.length < 2) {
          return {
            content: [{ type: 'text', text: 'Mindestens 2 Posts zum Verknüpfen erforderlich' }],
          };
        }
        
        // Update each post with translations
        for (const [lang, postId] of Object.entries(translations)) {
          await wpClient.customRequest(`/posts/${postId}`, 'PUT', { translations });
        }
        
        return {
          content: [{ type: 'text', text: `${postIds.length} Posts als Übersetzungen verknüpft` }],
        };
      } catch {
        return {
          content: [{ type: 'text', text: 'Fehler beim Verknüpfen der Übersetzungen' }],
        };
      }
    }
  );

  // ============================================
  // TRANSLATEPRESS TOOLS
  // ============================================

  server.registerTool(
    'translatepress_get_settings',
    {
      title: 'TranslatePress Einstellungen',
      description: 'Ruft TranslatePress Konfiguration ab',
      inputSchema: {},
    },
    async () => {
      try {
        const response = await wpClient.customRequest<{
          default_language: string;
          translation_languages: string[];
          url_slugs: Record<string, string>;
          native_or_english_name: string;
        }>('/translatepress/v1/settings');
        
        return {
          content: [{ type: 'text', text: JSON.stringify({
            defaultLanguage: response.data.default_language,
            translationLanguages: response.data.translation_languages,
            urlSlugs: response.data.url_slugs,
            nameDisplay: response.data.native_or_english_name,
          }, null, 2) }],
        };
      } catch {
        return {
          content: [{ type: 'text', text: 'TranslatePress nicht installiert oder REST API nicht verfügbar' }],
        };
      }
    }
  );

  // ============================================
  // GENERIC MULTILINGUAL HELPERS
  // ============================================

  server.registerTool(
    'ml_list_untranslated',
    {
      title: 'Nicht übersetzte Inhalte finden',
      description: 'Findet Posts/Seiten ohne Übersetzung in einer bestimmten Sprache',
      inputSchema: {
        postType: z.enum(['post', 'page']).default('post').describe('Post-Typ'),
        sourceLanguage: z.string().describe('Quellsprache'),
        targetLanguage: z.string().describe('Zielsprache'),
        limit: z.number().optional().default(20).describe('Maximale Anzahl'),
      },
    },
    async ({ postType, sourceLanguage, targetLanguage, limit }) => {
      try {
        // Try to get posts in source language
        const endpoint = postType === 'page' ? '/pages' : '/posts';
        
        const response = await wpClient.customRequest<Array<{
          id: number;
          title: { rendered: string };
          lang?: string;
          translations?: Record<string, number>;
        }>>(endpoint, 'GET', undefined, {
          per_page: 100,
          lang: sourceLanguage,
          _fields: 'id,title,lang,translations',
        });
        
        // Filter posts without translation in target language
        const untranslated = response.data
          .filter(post => {
            if (!post.translations) return true;
            return !post.translations[targetLanguage];
          })
          .slice(0, limit)
          .map(post => ({
            id: post.id,
            title: post.title.rendered,
            language: post.lang || sourceLanguage,
            existingTranslations: post.translations ? Object.keys(post.translations) : [],
          }));
        
        return {
          content: [{ type: 'text', text: JSON.stringify({
            sourceLanguage,
            targetLanguage,
            untranslatedCount: untranslated.length,
            posts: untranslated,
          }, null, 2) }],
        };
      } catch {
        return {
          content: [{ type: 'text', text: 'Fehler beim Abrufen nicht übersetzter Inhalte' }],
        };
      }
    }
  );

  server.registerTool(
    'ml_translation_status',
    {
      title: 'Übersetzungs-Status',
      description: 'Zeigt Übersetzungsfortschritt für alle Sprachen',
      inputSchema: {
        postType: z.enum(['post', 'page']).default('post').describe('Post-Typ'),
      },
    },
    async ({ postType }) => {
      try {
        const endpoint = postType === 'page' ? '/pages' : '/posts';
        
        const response = await wpClient.customRequest<Array<{
          id: number;
          lang?: string;
          translations?: Record<string, number>;
        }>>(endpoint, 'GET', undefined, {
          per_page: 100,
          _fields: 'id,lang,translations',
        });
        
        // Count posts per language
        const languageCounts: Record<string, number> = {};
        const translationPairs: Record<string, number> = {};
        
        response.data.forEach(post => {
          const lang = post.lang || 'unknown';
          languageCounts[lang] = (languageCounts[lang] || 0) + 1;
          
          if (post.translations) {
            Object.keys(post.translations).forEach(targetLang => {
              const pair = `${lang}->${targetLang}`;
              translationPairs[pair] = (translationPairs[pair] || 0) + 1;
            });
          }
        });
        
        return {
          content: [{ type: 'text', text: JSON.stringify({
            postType,
            totalPosts: response.data.length,
            byLanguage: languageCounts,
            translationPairs,
          }, null, 2) }],
        };
      } catch {
        return {
          content: [{ type: 'text', text: 'Fehler beim Abrufen des Übersetzungsstatus' }],
        };
      }
    }
  );

  server.registerTool(
    'ml_duplicate_for_translation',
    {
      title: 'Post für Übersetzung duplizieren',
      description: 'Erstellt eine Kopie eines Posts als Übersetzungsvorlage',
      inputSchema: {
        postId: z.number().describe('Post-ID zum Duplizieren'),
        targetLanguage: z.string().describe('Zielsprache'),
        status: z.enum(['publish', 'draft']).default('draft').describe('Status des neuen Posts'),
      },
    },
    async ({ postId, targetLanguage, status }) => {
      try {
        // Get original post
        const originalResponse = await wpClient.customRequest<{
          id: number;
          title: { rendered: string };
          content: { rendered: string };
          excerpt: { rendered: string };
          categories: number[];
          tags: number[];
          featured_media: number;
          meta: Record<string, unknown>;
        }>(`/posts/${postId}`);
        
        const original = originalResponse.data;
        
        // Create duplicate
        const newPostResponse = await wpClient.customRequest<{ id: number; link: string }>(
          '/posts',
          'POST',
          {
            title: `[${targetLanguage.toUpperCase()}] ${original.title.rendered}`,
            content: original.content.rendered,
            excerpt: original.excerpt.rendered,
            categories: original.categories,
            tags: original.tags,
            featured_media: original.featured_media,
            status,
            meta: {
              ...original.meta,
              _translation_of: postId,
              _translation_language: targetLanguage,
            },
          }
        );
        
        return {
          content: [{ type: 'text', text: `Post dupliziert für ${targetLanguage}\nNeue ID: ${newPostResponse.data.id}\nLink: ${newPostResponse.data.link}\n\nHinweis: Verknüpfen Sie diesen Post manuell mit dem Original im Multilingual-Plugin` }],
        };
      } catch {
        return {
          content: [{ type: 'text', text: 'Fehler beim Duplizieren des Posts' }],
        };
      }
    }
  );
}
