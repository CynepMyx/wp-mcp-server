/**
 * Gutenberg Block Tools
 * MCP Tools für die Verwaltung von Gutenberg Blocks
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod';
import { WordPressClient } from '../wordpress/client.js';

export function registerGutenbergTools(server: McpServer, wpClient: WordPressClient) {
  
  server.registerTool(
    'gutenberg_list_block_types',
    {
      title: 'Liste Gutenberg Block-Typen',
      description: 'Zeigt alle verfügbaren Gutenberg Block-Typen an',
      inputSchema: {},
      outputSchema: {
        blocks: z.array(z.object({
          name: z.string(),
          title: z.string(),
          description: z.string(),
          category: z.string(),
        })),
      }
    },
    async () => {
      const blocks = await wpClient.getBlockEditorBlocks();
      const output = {
        blocks: Array.isArray(blocks) ? blocks.map((b: Record<string, unknown>) => ({
          name: b.name || '',
          title: b.title || '',
          description: b.description || '',
          category: b.category || '',
        })) : []
      };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    }
  );

  server.registerTool(
    'gutenberg_list_reusable_blocks',
    {
      title: 'Liste Wiederverwendbare Blocks',
      description: 'Zeigt alle wiederverwendbaren Gutenberg-Blocks an',
      inputSchema: {},
      outputSchema: {
        blocks: z.array(z.object({
          id: z.number(),
          title: z.string(),
          content: z.string(),
          slug: z.string(),
        })),
      }
    },
    async () => {
      const blocks = await wpClient.getReusableBlocks();
      const output = {
        blocks: Array.isArray(blocks) ? blocks.map((b: Record<string, unknown>) => ({
          id: (b as { id?: number }).id || 0,
          title: ((b as { title?: { rendered?: string } }).title?.rendered) || '',
          content: ((b as { content?: { raw?: string } }).content?.raw) || '',
          slug: (b as { slug?: string }).slug || '',
        })) : []
      };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    }
  );

  server.registerTool(
    'gutenberg_parse_blocks',
    {
      title: 'Parse Gutenberg Blocks',
      description: 'Analysiert den HTML-Content eines Posts und extrahiert die Gutenberg Block-Struktur',
      inputSchema: {
        content: z.string().describe('Der HTML/Block-Content zum Parsen'),
      },
      outputSchema: {
        blocks: z.array(z.object({
          blockName: z.string().nullable(),
          attrs: z.record(z.string(), z.unknown()),
          innerHTML: z.string(),
        })),
      }
    },
    async ({ content }) => {
      // Client-side block parsing using regex patterns
      const blocks = parseGutenbergBlocks(content);
      const output = { blocks };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    }
  );

  server.registerTool(
    'gutenberg_generate_block',
    {
      title: 'Generiere Gutenberg Block',
      description: 'Generiert den HTML-Code für einen Gutenberg Block basierend auf dem Block-Typ und Attributen',
      inputSchema: {
        blockType: z.string().describe('Block-Typ (z.B. "core/paragraph", "core/heading", "core/image")'),
        attributes: z.record(z.string(), z.unknown()).optional()
          .describe('Block-Attribute als JSON'),
        content: z.string().optional()
          .describe('Innerer HTML-Content des Blocks'),
      },
      outputSchema: {
        html: z.string(),
      }
    },
    async ({ blockType, attributes = {}, content = '' }) => {
      const html = generateGutenbergBlock(blockType, attributes, content);
      const output = { html };
      
      return {
        content: [{ type: 'text', text: html }],
        structuredContent: output
      };
    }
  );

  server.registerTool(
    'gutenberg_list_templates',
    {
      title: 'Liste Block Templates',
      description: 'Zeigt alle Block-Templates an (Full Site Editing)',
      inputSchema: {},
      outputSchema: {
        templates: z.array(z.object({
          id: z.string(),
          slug: z.string(),
          title: z.string(),
          description: z.string(),
          type: z.string(),
        })),
      }
    },
    async () => {
      const templates = await wpClient.getTemplates();
      const output = {
        templates: Array.isArray(templates) ? templates.map((t: Record<string, unknown>) => ({
          id: (t as { id?: string }).id || '',
          slug: (t as { slug?: string }).slug || '',
          title: ((t as { title?: { rendered?: string } }).title?.rendered) || '',
          description: ((t as { description?: { rendered?: string } }).description?.rendered) || '',
          type: (t as { type?: string }).type || '',
        })) : []
      };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    }
  );

  server.registerTool(
    'gutenberg_list_template_parts',
    {
      title: 'Liste Template Parts',
      description: 'Zeigt alle Template Parts an (Header, Footer, etc.)',
      inputSchema: {},
      outputSchema: {
        parts: z.array(z.object({
          id: z.string(),
          slug: z.string(),
          title: z.string(),
          area: z.string(),
        })),
      }
    },
    async () => {
      const parts = await wpClient.getTemplateParts();
      const output = {
        parts: Array.isArray(parts) ? parts.map((p: Record<string, unknown>) => ({
          id: (p as { id?: string }).id || '',
          slug: (p as { slug?: string }).slug || '',
          title: ((p as { title?: { rendered?: string } }).title?.rendered) || '',
          area: (p as { area?: string }).area || '',
        })) : []
      };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    }
  );

  server.registerTool(
    'gutenberg_get_global_styles',
    {
      title: 'Hole Global Styles',
      description: 'Holt die globalen Styles (theme.json Einstellungen)',
      inputSchema: {},
      outputSchema: {
        styles: z.unknown(),
      }
    },
    async () => {
      const styles = await wpClient.getGlobalStyles();
      const output = { styles };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    }
  );
}

// Helper: Parse Gutenberg Blocks from HTML
function parseGutenbergBlocks(content: string): Array<{
  blockName: string | null;
  attrs: Record<string, unknown>;
  innerHTML: string;
}> {
  const blocks: Array<{
    blockName: string | null;
    attrs: Record<string, unknown>;
    innerHTML: string;
  }> = [];
  
  // Regex to match Gutenberg block comments
  const blockRegex = /<!-- wp:([a-z0-9-]+\/)?([a-z0-9-]+)(\s+(\{[^}]*\}))?\s*(\/)?-->([\s\S]*?)(?:<!-- \/wp:\1?\2 -->)?/g;
  
  let match;
  while ((match = blockRegex.exec(content)) !== null) {
    const namespace = match[1] ? match[1].slice(0, -1) : 'core';
    const name = match[2];
    const attrsJson = match[4] || '{}';
    const isSelfClosing = match[5] === '/';
    const innerHTML = isSelfClosing ? '' : (match[6] || '').trim();
    
    let attrs: Record<string, unknown> = {};
    try {
      attrs = JSON.parse(attrsJson);
    } catch {
      attrs = {};
    }
    
    blocks.push({
      blockName: `${namespace}/${name}`,
      attrs,
      innerHTML,
    });
  }
  
  // If no blocks found, treat content as classic content
  if (blocks.length === 0 && content.trim()) {
    blocks.push({
      blockName: null,
      attrs: {},
      innerHTML: content,
    });
  }
  
  return blocks;
}

// Helper: Generate Gutenberg Block HTML
function generateGutenbergBlock(
  blockType: string,
  attributes: Record<string, unknown>,
  content: string
): string {
  const attrsJson = Object.keys(attributes).length > 0 
    ? ' ' + JSON.stringify(attributes)
    : '';
  
  // Self-closing blocks (no content)
  const selfClosingBlocks = [
    'core/separator', 'core/spacer', 'core/nextpage', 
    'core/more', 'core/page-break'
  ];
  
  if (selfClosingBlocks.includes(blockType) || !content) {
    return `<!-- wp:${blockType}${attrsJson} /-->`;
  }
  
  // Generate inner HTML based on block type
  let innerHTML = content;
  
  switch (blockType) {
    case 'core/paragraph':
      innerHTML = `<p>${content}</p>`;
      break;
    case 'core/heading':
      const level = (attributes.level as number) || 2;
      innerHTML = `<h${level}>${content}</h${level}>`;
      break;
    case 'core/list':
      const items = content.split('\n').filter(Boolean);
      const listType = attributes.ordered ? 'ol' : 'ul';
      innerHTML = `<${listType}>${items.map(i => `<li>${i}</li>`).join('')}</${listType}>`;
      break;
    case 'core/quote':
      innerHTML = `<blockquote class="wp-block-quote"><p>${content}</p></blockquote>`;
      break;
    case 'core/code':
      innerHTML = `<pre class="wp-block-code"><code>${content}</code></pre>`;
      break;
    case 'core/image':
      const src = (attributes.url as string) || '';
      const alt = (attributes.alt as string) || '';
      innerHTML = `<figure class="wp-block-image"><img src="${src}" alt="${alt}"/></figure>`;
      break;
    case 'core/button':
      const url = (attributes.url as string) || '#';
      innerHTML = `<div class="wp-block-button"><a class="wp-block-button__link" href="${url}">${content}</a></div>`;
      break;
    case 'core/columns':
      innerHTML = content; // Columns content is nested blocks
      break;
    case 'core/column':
      innerHTML = content; // Column content is nested blocks
      break;
    case 'core/group':
      innerHTML = `<div class="wp-block-group">${content}</div>`;
      break;
    default:
      // For unknown blocks, wrap in a div
      innerHTML = content;
  }
  
  return `<!-- wp:${blockType}${attrsJson} -->\n${innerHTML}\n<!-- /wp:${blockType} -->`;
}

// Export block helpers for use in other modules
export { parseGutenbergBlocks, generateGutenbergBlock };
