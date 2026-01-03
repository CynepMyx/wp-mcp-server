/**
 * Design System & UI/UX Tools
 * MCP Tools für Styling, Design Tokens, Customizer und mehr
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod';
import { WordPressClient } from '../wordpress/client.js';
import type { ColorPaletteItem, GradientItem, FontFamily, FontSize, SpacingSize } from '../config/types.js';

// Helper to extract theme values from union types
function getThemeOrDirect<T>(value: T[] | { theme?: T[]; custom?: T[] } | undefined): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return value.theme || [];
}

export function registerDesignSystemTools(server: McpServer, wpClient: WordPressClient) {

  // === THEME.JSON / GLOBAL STYLES ===
  
  server.registerTool(
    'design_get_theme_json',
    {
      title: 'Hole Theme.json Konfiguration',
      description: 'Holt die komplette theme.json Konfiguration mit Farben, Typografie, Spacing und Layout-Einstellungen',
      inputSchema: {},
    },
    async () => {
      const settings = await wpClient.getGlobalStylesSettings();
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(settings, null, 2) }],
      };
    }
  );

  server.registerTool(
    'design_get_color_palette',
    {
      title: 'Hole Farbpalette',
      description: 'Extrahiert die Theme-Farbpalette aus den Global Styles',
      inputSchema: {},
    },
    async () => {
      const settings = await wpClient.getGlobalStylesSettings();
      const output = {
        colors: getThemeOrDirect<ColorPaletteItem>(settings?.settings?.color?.palette),
        gradients: getThemeOrDirect<GradientItem>(settings?.settings?.color?.gradients),
        duotone: settings?.settings?.color?.duotone?.theme || [],
      };
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }],
      };
    }
  );

  server.registerTool(
    'design_get_typography',
    {
      title: 'Hole Typografie-Einstellungen',
      description: 'Holt alle Typografie-Einstellungen: Schriftfamilien, Größen, Gewichte',
      inputSchema: {},
    },
    async () => {
      const settings = await wpClient.getGlobalStylesSettings();
      const output = {
        fontFamilies: getThemeOrDirect<FontFamily>(settings?.settings?.typography?.fontFamilies),
        fontSizes: getThemeOrDirect<FontSize>(settings?.settings?.typography?.fontSizes),
        lineHeights: settings?.settings?.typography?.lineHeight || false,
      };
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }],
      };
    }
  );

  server.registerTool(
    'design_get_spacing',
    {
      title: 'Hole Spacing-Einstellungen',
      description: 'Holt die Spacing/Abstands-Skala des Themes',
      inputSchema: {},
    },
    async () => {
      const settings = await wpClient.getGlobalStylesSettings();
      const output = {
        spacingSizes: getThemeOrDirect<SpacingSize>(settings?.settings?.spacing?.spacingSizes),
        units: settings?.settings?.spacing?.units || ['px', 'em', 'rem', 'vh', 'vw', '%'],
        blockGap: settings?.styles?.spacing?.blockGap || null,
      };
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }],
      };
    }
  );

  // === THEME CUSTOMIZER ===

  server.registerTool(
    'design_get_customizer_settings',
    {
      title: 'Hole Customizer-Einstellungen',
      description: 'Holt die Theme Customizer Einstellungen (Site Identity, Colors, etc.)',
      inputSchema: {},
    },
    async () => {
      const settings = await wpClient.getCustomizerSettings();
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(settings, null, 2) }],
      };
    }
  );

  server.registerTool(
    'design_get_custom_css',
    {
      title: 'Hole Custom CSS',
      description: 'Holt das benutzerdefinierte CSS aus dem Customizer',
      inputSchema: {},
    },
    async () => {
      const css = await wpClient.getCustomCSS();
      return {
        content: [{ type: 'text' as const, text: css || '/* Kein Custom CSS definiert */' }],
      };
    }
  );

  // === ELEMENTOR GLOBAL SETTINGS ===

  server.registerTool(
    'elementor_get_global_settings',
    {
      title: 'Hole Elementor Global Settings',
      description: 'Holt die globalen Elementor-Einstellungen (Farben, Fonts, Breakpoints)',
      inputSchema: {},
    },
    async () => {
      const settings = await wpClient.getElementorGlobalSettings();
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(settings, null, 2) }],
      };
    }
  );

  server.registerTool(
    'elementor_get_global_colors',
    {
      title: 'Hole Elementor Global Colors',
      description: 'Holt die globalen Elementor-Farben (Primary, Secondary, Text, Accent)',
      inputSchema: {},
    },
    async () => {
      const colors = await wpClient.getElementorGlobalColors();
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(colors, null, 2) }],
      };
    }
  );

  server.registerTool(
    'elementor_get_global_fonts',
    {
      title: 'Hole Elementor Global Fonts',
      description: 'Holt die globalen Elementor-Schriftarten (Primary, Secondary, Text, Accent)',
      inputSchema: {},
    },
    async () => {
      const fonts = await wpClient.getElementorGlobalFonts();
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(fonts, null, 2) }],
      };
    }
  );

  server.registerTool(
    'elementor_get_breakpoints',
    {
      title: 'Hole Elementor Breakpoints',
      description: 'Holt die Responsive Breakpoints (Mobile, Tablet, etc.)',
      inputSchema: {},
    },
    async () => {
      const breakpoints = await wpClient.getElementorBreakpoints();
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(breakpoints, null, 2) }],
      };
    }
  );

  // === ELEMENTOR KITS & THEME BUILDER ===

  server.registerTool(
    'elementor_list_kits',
    {
      title: 'Liste Elementor Kits',
      description: 'Listet alle Elementor Kits (Design Presets) auf',
      inputSchema: {},
    },
    async () => {
      const kits = await wpClient.getElementorKits();
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(kits, null, 2) }],
      };
    }
  );

  server.registerTool(
    'elementor_list_theme_builder_templates',
    {
      title: 'Liste Elementor Theme Builder Templates',
      description: 'Listet alle Theme Builder Templates (Header, Footer, Single, Archive)',
      inputSchema: {
        templateType: z.enum(['header', 'footer', 'single', 'archive', 'search-results', 'error-404', 'all']).optional()
          .describe('Filter nach Template-Typ'),
      },
    },
    async ({ templateType = 'all' }) => {
      const templates = await wpClient.getElementorThemeBuilderTemplates(templateType);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(templates, null, 2) }],
      };
    }
  );

  server.registerTool(
    'elementor_list_global_widgets',
    {
      title: 'Liste Elementor Global Widgets',
      description: 'Listet alle globalen/wiederverwendbaren Elementor Widgets auf',
      inputSchema: {},
    },
    async () => {
      const widgets = await wpClient.getElementorGlobalWidgets();
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(widgets, null, 2) }],
      };
    }
  );

  // === NAVIGATION & MENUS (UX) ===

  server.registerTool(
    'nav_list_menus',
    {
      title: 'Liste Navigationsmenüs',
      description: 'Listet alle WordPress Navigationsmenüs mit ihren Positionen auf',
      inputSchema: {},
    },
    async () => {
      const menus = await wpClient.getNavigationMenus();
      const locations = await wpClient.getMenuLocations();
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ menus, locations }, null, 2) }],
      };
    }
  );

  server.registerTool(
    'nav_get_menu_items',
    {
      title: 'Hole Menü-Items',
      description: 'Holt alle Items eines Navigationsmenüs mit Hierarchie',
      inputSchema: {
        menuId: z.number().describe('Menü ID'),
      },
    },
    async ({ menuId }) => {
      const items = await wpClient.getMenuItems(menuId);
      const hierarchical = buildMenuHierarchy(items || []);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(hierarchical, null, 2) }],
      };
    }
  );

  // === PATTERNS & TEMPLATES (UI) ===

  server.registerTool(
    'pattern_list_block_patterns',
    {
      title: 'Liste Block Patterns',
      description: 'Listet alle verfügbaren Gutenberg Block Patterns (vorgefertigte Layouts)',
      inputSchema: {
        category: z.string().optional().describe('Filter nach Kategorie'),
      },
    },
    async ({ category }) => {
      const patterns = await wpClient.getBlockPatterns(category);
      const categories = await wpClient.getBlockPatternCategories();
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ patterns, categories }, null, 2) }],
      };
    }
  );

  server.registerTool(
    'pattern_get_pattern',
    {
      title: 'Hole Block Pattern',
      description: 'Holt ein spezifisches Block Pattern mit dem kompletten HTML',
      inputSchema: {
        patternName: z.string().describe('Pattern Name (z.B. "core/query-standard-posts")'),
      },
    },
    async ({ patternName }) => {
      const patterns = await wpClient.getBlockPatterns();
      const pattern = (patterns || []).find((p) => p.name === patternName);
      
      if (!pattern) {
        throw new Error(`Pattern "${patternName}" nicht gefunden`);
      }
      
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(pattern, null, 2) }],
      };
    }
  );

  // === LAYOUT ANALYSIS ===

  server.registerTool(
    'design_analyze_page_layout',
    {
      title: 'Analysiere Seiten-Layout',
      description: 'Analysiert das UI/UX Layout einer Seite (Struktur, Hierarchie, Abstände)',
      inputSchema: {
        postId: z.number().describe('Post/Page ID'),
      },
    },
    async ({ postId }) => {
      let builder: 'gutenberg' | 'elementor' | 'classic' = 'classic';
      let analysis: LayoutAnalysis = {
        builder: 'classic',
        sections: 0,
        columns: 0,
        widgets: 0,
        hierarchy: [],
        recommendations: [],
      };

      try {
        const elementorData = await wpClient.getElementorData(postId) as { content?: ElementorElement[] } | null;
        if (elementorData?.content && Array.isArray(elementorData.content) && elementorData.content.length > 0) {
          builder = 'elementor';
          analysis = analyzeElementorLayout(elementorData.content);
        }
      } catch {
        // Kein Elementor, versuche Gutenberg
      }

      if (builder === 'classic') {
        const post = await wpClient.getPost(postId);
        const content = post.data?.content?.raw || post.data?.content?.rendered || '';
        if (content.includes('<!-- wp:')) {
          builder = 'gutenberg';
          analysis = analyzeGutenbergLayout(content);
        } else {
          analysis = analyzeClassicLayout(content);
        }
      }

      analysis.builder = builder;
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(analysis, null, 2) }],
      };
    }
  );

  // === CSS HELPER ===

  server.registerTool(
    'design_generate_css_variables',
    {
      title: 'Generiere CSS Variables',
      description: 'Generiert CSS Custom Properties aus den Theme-Einstellungen',
      inputSchema: {
        includeColors: z.boolean().optional().default(true),
        includeTypography: z.boolean().optional().default(true),
        includeSpacing: z.boolean().optional().default(true),
      },
    },
    async ({ includeColors = true, includeTypography = true, includeSpacing = true }) => {
      const settings = await wpClient.getGlobalStylesSettings();
      const variables: Record<string, string> = {};

      if (includeColors && settings?.settings?.color?.palette) {
        const palette = getThemeOrDirect<ColorPaletteItem>(settings.settings.color.palette);
        for (const color of palette) {
          variables[`--wp-color-${color.slug}`] = color.color;
        }
      }

      if (includeTypography && settings?.settings?.typography?.fontSizes) {
        const sizes = getThemeOrDirect<FontSize>(settings.settings.typography.fontSizes);
        for (const size of sizes) {
          variables[`--wp-font-size-${size.slug}`] = size.size;
        }
      }

      if (includeSpacing && settings?.settings?.spacing?.spacingSizes) {
        const sizes = getThemeOrDirect<SpacingSize>(settings.settings.spacing.spacingSizes);
        for (const size of sizes) {
          variables[`--wp-spacing-${size.slug}`] = size.size;
        }
      }

      const css = `:root {\n${Object.entries(variables)
        .map(([key, value]) => `  ${key}: ${value};`)
        .join('\n')}\n}`;

      return {
        content: [{ type: 'text' as const, text: css }],
      };
    }
  );

  // === RESPONSIVE DESIGN ===

  server.registerTool(
    'design_get_responsive_settings',
    {
      title: 'Hole Responsive-Einstellungen',
      description: 'Holt alle Responsive/Breakpoint-Einstellungen aus Theme und Elementor',
      inputSchema: {},
    },
    async () => {
      const themeSettings = await wpClient.getGlobalStylesSettings();
      let elementorBreakpoints = null;
      
      try {
        elementorBreakpoints = await wpClient.getElementorBreakpoints();
      } catch {
        // Elementor nicht installiert
      }

      const output = {
        themeBreakpoints: themeSettings?.settings?.layout || {},
        elementorBreakpoints: elementorBreakpoints || null,
        containerWidth: themeSettings?.settings?.layout?.contentSize || 
                        themeSettings?.settings?.layout?.wideSize || null,
      };

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }],
      };
    }
  );

  // === DESIGN TOKENS EXPORT ===

  server.registerTool(
    'design_export_tokens',
    {
      title: 'Exportiere Design Tokens',
      description: 'Exportiert alle Design Tokens (Farben, Fonts, Spacing) in verschiedenen Formaten',
      inputSchema: {
        format: z.enum(['css', 'scss', 'json', 'tailwind']).default('json').describe('Export-Format'),
      },
    },
    async ({ format }) => {
      const settings = await wpClient.getGlobalStylesSettings();
      
      const tokens = {
        colors: getThemeOrDirect<ColorPaletteItem>(settings?.settings?.color?.palette),
        gradients: getThemeOrDirect<GradientItem>(settings?.settings?.color?.gradients),
        fontFamilies: getThemeOrDirect<FontFamily>(settings?.settings?.typography?.fontFamilies),
        fontSizes: getThemeOrDirect<FontSize>(settings?.settings?.typography?.fontSizes),
        spacing: getThemeOrDirect<SpacingSize>(settings?.settings?.spacing?.spacingSizes),
        layout: settings?.settings?.layout || {},
      };

      let output: string;
      
      switch (format) {
        case 'css':
          output = generateCSSTokens(tokens);
          break;
        case 'scss':
          output = generateSCSSTokens(tokens);
          break;
        case 'tailwind':
          output = generateTailwindTokens(tokens);
          break;
        default:
          output = JSON.stringify(tokens, null, 2);
      }

      return {
        content: [{ type: 'text' as const, text: output }],
      };
    }
  );
}

// === HELPER TYPES ===

interface LayoutAnalysis {
  builder: 'gutenberg' | 'elementor' | 'classic';
  sections: number;
  columns: number;
  widgets: number;
  hierarchy: unknown[];
  recommendations: string[];
}

interface DesignTokens {
  colors: ColorPaletteItem[];
  gradients: GradientItem[];
  fontFamilies: FontFamily[];
  fontSizes: FontSize[];
  spacing: SpacingSize[];
  layout: Record<string, unknown>;
}

// === HELPER FUNCTIONS ===

function buildMenuHierarchy(items: Array<{
  id: number;
  title: { rendered?: string } | string;
  url: string;
  target?: string;
  parent?: number;
  menu_order?: number;
  type?: string;
  object_id?: number;
}>): unknown[] {
  interface MenuItem {
    id: number;
    title: string;
    url: string;
    target: string;
    parent: number;
    order: number;
    type: string;
    objectId?: number;
    children: MenuItem[];
  }
  
  const itemMap = new Map<number, MenuItem>();
  const roots: MenuItem[] = [];

  for (const item of items) {
    itemMap.set(item.id, {
      id: item.id,
      title: typeof item.title === 'string' ? item.title : (item.title?.rendered || ''),
      url: item.url,
      target: item.target || '',
      parent: item.parent || 0,
      order: item.menu_order || 0,
      type: item.type || '',
      objectId: item.object_id,
      children: [],
    });
  }

  for (const item of itemMap.values()) {
    if (item.parent === 0) {
      roots.push(item);
    } else {
      const parent = itemMap.get(item.parent);
      if (parent) {
        parent.children.push(item);
      }
    }
  }

  const sortItems = (arr: MenuItem[]): void => {
    arr.sort((a, b) => a.order - b.order);
    for (const item of arr) {
      sortItems(item.children);
    }
  };
  sortItems(roots);

  return roots;
}

interface ElementorElement {
  elType: string;
  widgetType?: string;
  elements?: ElementorElement[];
  settings?: Record<string, unknown>;
}

function analyzeElementorLayout(elements: ElementorElement[]): LayoutAnalysis {
  let sections = 0;
  let columns = 0;
  let widgets = 0;
  const hierarchy: unknown[] = [];
  const recommendations: string[] = [];

  const analyze = (els: ElementorElement[], depth: number = 0): unknown[] => {
    const result: unknown[] = [];
    for (const el of els) {
      if (el.elType === 'section' || el.elType === 'container') {
        sections++;
      } else if (el.elType === 'column') {
        columns++;
      } else if (el.elType === 'widget') {
        widgets++;
      }

      const item: { type: string; widget?: string; children?: unknown[] } = {
        type: el.elType + (el.widgetType ? `:${el.widgetType}` : ''),
      };

      if (el.elements && Array.isArray(el.elements)) {
        item.children = analyze(el.elements, depth + 1);
      }

      result.push(item);
    }
    return result;
  };

  hierarchy.push(...analyze(elements));

  if (sections > 10) {
    recommendations.push('Viele Sections - Erwäge Container statt Sections für bessere Performance');
  }
  if (widgets > 50) {
    recommendations.push('Viele Widgets - Prüfe ob Global Widgets sinnvoll wären');
  }

  return {
    builder: 'elementor',
    sections,
    columns,
    widgets,
    hierarchy,
    recommendations,
  };
}

function analyzeGutenbergLayout(content: string): LayoutAnalysis {
  const blockRegex = /<!-- wp:([a-z0-9-/]+)/g;
  const blocks: string[] = [];
  let match;
  
  while ((match = blockRegex.exec(content)) !== null) {
    blocks.push(match[1]);
  }

  const sections = blocks.filter(b => b.includes('group') || b.includes('cover') || b.includes('columns')).length;
  const columns = blocks.filter(b => b === 'column' || b === 'core/column').length;
  const widgets = blocks.length - sections - columns;

  const recommendations: string[] = [];
  if (!content.includes('wp:group')) {
    recommendations.push('Verwende Group-Blocks für bessere Strukturierung');
  }
  if (blocks.filter(b => b === 'core/paragraph').length > 20) {
    recommendations.push('Viele Paragraphen - Erwäge Columns oder Grid für besseres Layout');
  }

  return {
    builder: 'gutenberg',
    sections,
    columns,
    widgets,
    hierarchy: blocks.slice(0, 20).map(b => ({ type: b })),
    recommendations,
  };
}

function analyzeClassicLayout(_content: string): LayoutAnalysis {
  return {
    builder: 'classic',
    sections: 0,
    columns: 0,
    widgets: 0,
    hierarchy: [{ type: 'classic-content' }],
    recommendations: [
      'Classic Editor erkannt - Erwäge Migration zu Gutenberg oder Elementor für bessere UI/UX Kontrolle',
    ],
  };
}

function generateCSSTokens(tokens: DesignTokens): string {
  let css = ':root {\n';
  
  for (const color of tokens.colors) {
    css += `  --color-${color.slug}: ${color.color};\n`;
  }
  
  for (const size of tokens.fontSizes) {
    css += `  --font-size-${size.slug}: ${size.size};\n`;
  }
  
  for (const space of tokens.spacing) {
    css += `  --spacing-${space.slug}: ${space.size};\n`;
  }
  
  css += '}\n';
  return css;
}

function generateSCSSTokens(tokens: DesignTokens): string {
  let scss = '// Design Tokens\n\n// Colors\n';
  
  for (const color of tokens.colors) {
    scss += `$color-${color.slug}: ${color.color};\n`;
  }
  
  scss += '\n// Font Sizes\n';
  for (const size of tokens.fontSizes) {
    scss += `$font-size-${size.slug}: ${size.size};\n`;
  }
  
  scss += '\n// Spacing\n';
  for (const space of tokens.spacing) {
    scss += `$spacing-${space.slug}: ${space.size};\n`;
  }
  
  return scss;
}

function generateTailwindTokens(tokens: DesignTokens): string {
  const config = {
    theme: {
      extend: {
        colors: {} as Record<string, string>,
        fontSize: {} as Record<string, string>,
        spacing: {} as Record<string, string>,
      },
    },
  };
  
  for (const color of tokens.colors) {
    config.theme.extend.colors[color.slug] = color.color;
  }
  
  for (const size of tokens.fontSizes) {
    config.theme.extend.fontSize[size.slug] = size.size;
  }
  
  for (const space of tokens.spacing) {
    config.theme.extend.spacing[space.slug] = space.size;
  }
  
  return `// tailwind.config.js\nmodule.exports = ${JSON.stringify(config, null, 2)};`;
}
