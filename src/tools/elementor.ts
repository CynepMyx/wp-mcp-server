/**
 * Elementor Tools
 * MCP Tools für die Verwaltung von Elementor-Inhalten
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod';
import { WordPressClient } from '../wordpress/client.js';

// Elementor Data Types
interface ElementorElement {
  id: string;
  elType: 'container' | 'section' | 'column' | 'widget';
  widgetType?: string;
  settings: Record<string, unknown>;
  elements?: ElementorElement[];
}

interface ElementorDocument {
  content: ElementorElement[];
  page_settings: Record<string, unknown>;
  version: string;
}

export function registerElementorTools(server: McpServer, wpClient: WordPressClient) {
  
  server.registerTool(
    'elementor_get_page_data',
    {
      title: 'Hole Elementor Seitendaten',
      description: 'Holt die komplette Elementor-Datenstruktur einer Seite inklusive aller Widgets und Einstellungen',
      inputSchema: {
        postId: z.number().describe('Post/Page ID'),
      },
      outputSchema: {
        content: z.unknown(),
        page_settings: z.unknown(),
        version: z.string().optional(),
      }
    },
    async ({ postId }) => {
      const data = await wpClient.getElementorData(postId) as ElementorDocument;
      const output = {
        content: data.content || [],
        page_settings: data.page_settings || {},
        version: data.version,
      };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    }
  );

  server.registerTool(
    'elementor_analyze_structure',
    {
      title: 'Analysiere Elementor Struktur',
      description: 'Analysiert die Elementor-Seitenstruktur und gibt eine Übersicht aller Container, Sections und Widgets',
      inputSchema: {
        postId: z.number().describe('Post/Page ID'),
      },
      outputSchema: {
        summary: z.object({
          totalElements: z.number(),
          containers: z.number(),
          sections: z.number(),
          columns: z.number(),
          widgets: z.number(),
        }),
        widgetTypes: z.array(z.object({
          type: z.string(),
          count: z.number(),
        })),
        structure: z.array(z.unknown()),
      }
    },
    async ({ postId }) => {
      const data = await wpClient.getElementorData(postId) as ElementorDocument;
      const analysis = analyzeElementorStructure(data.content || []);
      
      return {
        content: [{ type: 'text', text: JSON.stringify(analysis, null, 2) }],
        structuredContent: analysis
      };
    }
  );

  server.registerTool(
    'elementor_list_widgets',
    {
      title: 'Liste Elementor Widgets',
      description: 'Listet alle Widgets einer Elementor-Seite mit ihren IDs und Einstellungen auf',
      inputSchema: {
        postId: z.number().describe('Post/Page ID'),
        widgetType: z.string().optional()
          .describe('Filter nach Widget-Typ (z.B. "heading", "text-editor", "image")'),
      },
      outputSchema: {
        widgets: z.array(z.object({
          id: z.string(),
          widgetType: z.string(),
          settings: z.unknown(),
        })),
      }
    },
    async ({ postId, widgetType }) => {
      const data = await wpClient.getElementorData(postId) as ElementorDocument;
      const widgets = extractWidgets(data.content || [], widgetType);
      
      const output = { widgets };
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    }
  );

  server.registerTool(
    'elementor_get_widget',
    {
      title: 'Hole Elementor Widget',
      description: 'Holt die Details eines spezifischen Elementor-Widgets anhand seiner ID',
      inputSchema: {
        postId: z.number().describe('Post/Page ID'),
        widgetId: z.string().describe('Elementor Widget ID'),
      },
      outputSchema: {
        id: z.string(),
        widgetType: z.string(),
        settings: z.unknown(),
        parentPath: z.array(z.string()),
      }
    },
    async ({ postId, widgetId }) => {
      const data = await wpClient.getElementorData(postId) as ElementorDocument;
      const widget = findElementById(data.content || [], widgetId);
      
      if (!widget) {
        throw new Error(`Widget mit ID ${widgetId} nicht gefunden`);
      }
      
      const output = {
        id: widget.element.id,
        widgetType: widget.element.widgetType || widget.element.elType,
        settings: widget.element.settings,
        parentPath: widget.path,
      };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    }
  );

  server.registerTool(
    'elementor_generate_widget',
    {
      title: 'Generiere Elementor Widget',
      description: 'Generiert eine Elementor Widget-Datenstruktur',
      inputSchema: {
        widgetType: z.string()
          .describe('Widget-Typ (z.B. "heading", "text-editor", "image", "button")'),
        settings: z.record(z.string(), z.unknown())
          .describe('Widget-Einstellungen'),
      },
      outputSchema: {
        widget: z.unknown(),
      }
    },
    async ({ widgetType, settings }) => {
      const widget = generateElementorWidget(widgetType, settings);
      const output = { widget };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    }
  );

  server.registerTool(
    'elementor_generate_section',
    {
      title: 'Generiere Elementor Section',
      description: 'Generiert eine komplette Elementor Section mit Columns und Widgets',
      inputSchema: {
        columns: z.number().min(1).max(6)
          .describe('Anzahl der Spalten'),
        layout: z.enum(['equal', 'left-wide', 'right-wide', 'custom']).optional()
          .describe('Spalten-Layout'),
        widgets: z.array(z.object({
          column: z.number().describe('Spalten-Index (0-basiert)'),
          widgetType: z.string(),
          settings: z.record(z.string(), z.unknown()),
        })).optional()
          .describe('Widgets pro Spalte'),
      },
      outputSchema: {
        section: z.unknown(),
      }
    },
    async ({ columns, layout = 'equal', widgets = [] }) => {
      const section = generateElementorSection(columns, layout, widgets);
      const output = { section };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    }
  );

  server.registerTool(
    'elementor_generate_container',
    {
      title: 'Generiere Elementor Container',
      description: 'Generiert einen modernen Elementor Container (Flexbox-basiert)',
      inputSchema: {
        direction: z.enum(['row', 'column']).optional()
          .describe('Flex Direction'),
        justify: z.enum(['flex-start', 'center', 'flex-end', 'space-between', 'space-around']).optional()
          .describe('Justify Content'),
        align: z.enum(['flex-start', 'center', 'flex-end', 'stretch']).optional()
          .describe('Align Items'),
        gap: z.number().optional()
          .describe('Gap zwischen Elementen in px'),
        widgets: z.array(z.object({
          widgetType: z.string(),
          settings: z.record(z.string(), z.unknown()),
        })).optional()
          .describe('Widgets im Container'),
      },
      outputSchema: {
        container: z.unknown(),
      }
    },
    async ({ direction = 'row', justify = 'flex-start', align = 'stretch', gap = 20, widgets = [] }) => {
      const container = generateElementorContainer(direction, justify, align, gap, widgets);
      const output = { container };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    }
  );

  server.registerTool(
    'elementor_common_widgets',
    {
      title: 'Zeige häufige Widget-Konfigurationen',
      description: 'Zeigt Beispielkonfigurationen für häufig verwendete Elementor Widgets',
      inputSchema: {
        widgetType: z.enum([
          'heading', 'text-editor', 'image', 'button', 'icon', 
          'divider', 'spacer', 'google-maps', 'video', 'icon-box',
          'image-box', 'testimonial', 'accordion', 'tabs', 'form'
        ]).describe('Widget-Typ'),
      },
      outputSchema: {
        widgetType: z.string(),
        description: z.string(),
        commonSettings: z.unknown(),
        example: z.unknown(),
      }
    },
    async ({ widgetType }) => {
      const info = getWidgetInfo(widgetType);
      
      return {
        content: [{ type: 'text', text: JSON.stringify(info, null, 2) }],
        structuredContent: info
      };
    }
  );
}

// Helper Functions

function analyzeElementorStructure(elements: ElementorElement[]): {
  summary: {
    totalElements: number;
    containers: number;
    sections: number;
    columns: number;
    widgets: number;
  };
  widgetTypes: Array<{ type: string; count: number }>;
  structure: unknown[];
} {
  const counts = {
    totalElements: 0,
    containers: 0,
    sections: 0,
    columns: 0,
    widgets: 0,
  };
  const widgetCounts: Record<string, number> = {};

  function traverse(els: ElementorElement[], depth: number = 0): unknown[] {
    return els.map(el => {
      counts.totalElements++;
      
      switch (el.elType) {
        case 'container':
          counts.containers++;
          break;
        case 'section':
          counts.sections++;
          break;
        case 'column':
          counts.columns++;
          break;
        case 'widget':
          counts.widgets++;
          if (el.widgetType) {
            widgetCounts[el.widgetType] = (widgetCounts[el.widgetType] || 0) + 1;
          }
          break;
      }
      
      return {
        id: el.id,
        type: el.elType,
        widgetType: el.widgetType,
        children: el.elements ? traverse(el.elements, depth + 1) : [],
      };
    });
  }

  const structure = traverse(elements);
  const widgetTypes = Object.entries(widgetCounts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  return {
    summary: counts,
    widgetTypes,
    structure,
  };
}

function extractWidgets(
  elements: ElementorElement[], 
  filterType?: string
): Array<{ id: string; widgetType: string; settings: unknown }> {
  const widgets: Array<{ id: string; widgetType: string; settings: unknown }> = [];

  function traverse(els: ElementorElement[]) {
    for (const el of els) {
      if (el.elType === 'widget' && el.widgetType) {
        if (!filterType || el.widgetType === filterType) {
          widgets.push({
            id: el.id,
            widgetType: el.widgetType,
            settings: el.settings,
          });
        }
      }
      if (el.elements) {
        traverse(el.elements);
      }
    }
  }

  traverse(elements);
  return widgets;
}

function findElementById(
  elements: ElementorElement[], 
  id: string, 
  path: string[] = []
): { element: ElementorElement; path: string[] } | null {
  for (const el of elements) {
    if (el.id === id) {
      return { element: el, path };
    }
    if (el.elements) {
      const found = findElementById(el.elements, id, [...path, el.id]);
      if (found) return found;
    }
  }
  return null;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function generateElementorWidget(
  widgetType: string, 
  settings: Record<string, unknown>
): ElementorElement {
  return {
    id: generateId(),
    elType: 'widget',
    widgetType,
    settings: {
      ...getDefaultWidgetSettings(widgetType),
      ...settings,
    },
    elements: [],
  };
}

function generateElementorSection(
  columnCount: number,
  layout: string,
  widgets: Array<{ column: number; widgetType: string; settings: Record<string, unknown> }>
): ElementorElement {
  const columnWidths = getColumnWidths(columnCount, layout);
  
  const columns: ElementorElement[] = columnWidths.map((width, index) => ({
    id: generateId(),
    elType: 'column',
    settings: {
      _column_size: width,
    },
    elements: widgets
      .filter(w => w.column === index)
      .map(w => generateElementorWidget(w.widgetType, w.settings)),
  }));

  return {
    id: generateId(),
    elType: 'section',
    settings: {
      structure: getStructureValue(columnCount),
    },
    elements: columns,
  };
}

function generateElementorContainer(
  direction: string,
  justify: string,
  align: string,
  gap: number,
  widgets: Array<{ widgetType: string; settings: Record<string, unknown> }>
): ElementorElement {
  return {
    id: generateId(),
    elType: 'container',
    settings: {
      flex_direction: direction,
      justify_content: justify,
      align_items: align,
      flex_gap: {
        size: gap,
        unit: 'px',
      },
    },
    elements: widgets.map(w => generateElementorWidget(w.widgetType, w.settings)),
  };
}

function getColumnWidths(count: number, layout: string): number[] {
  const layouts: Record<string, Record<number, number[]>> = {
    equal: {
      1: [100],
      2: [50, 50],
      3: [33, 33, 33],
      4: [25, 25, 25, 25],
      5: [20, 20, 20, 20, 20],
      6: [16, 16, 16, 16, 16, 16],
    },
    'left-wide': {
      2: [66, 33],
      3: [50, 25, 25],
    },
    'right-wide': {
      2: [33, 66],
      3: [25, 25, 50],
    },
  };
  
  return layouts[layout]?.[count] || layouts.equal[count] || [100];
}

function getStructureValue(columns: number): string {
  const structures: Record<number, string> = {
    1: '10',
    2: '20',
    3: '30',
    4: '40',
    5: '50',
    6: '60',
  };
  return structures[columns] || '10';
}

function getDefaultWidgetSettings(widgetType: string): Record<string, unknown> {
  const defaults: Record<string, Record<string, unknown>> = {
    'heading': {
      title: 'Überschrift',
      header_size: 'h2',
      align: 'left',
    },
    'text-editor': {
      editor: '<p>Text hier einfügen</p>',
    },
    'image': {
      image: { url: '', id: '' },
      image_size: 'full',
    },
    'button': {
      text: 'Button',
      link: { url: '#', is_external: false },
      button_type: 'default',
    },
    'icon': {
      icon: { value: 'fas fa-star', library: 'fa-solid' },
    },
    'divider': {
      style: 'solid',
      width: { size: 100, unit: '%' },
    },
    'spacer': {
      space: { size: 50, unit: 'px' },
    },
  };
  
  return defaults[widgetType] || {};
}

function getWidgetInfo(widgetType: string): {
  widgetType: string;
  description: string;
  commonSettings: unknown;
  example: unknown;
} {
  const widgetInfos: Record<string, { description: string; commonSettings: unknown; example: unknown }> = {
    'heading': {
      description: 'Überschriften-Widget für H1-H6 Tags',
      commonSettings: {
        title: 'String - Der Überschriftentext',
        header_size: 'h1|h2|h3|h4|h5|h6 - HTML Tag',
        align: 'left|center|right|justify - Ausrichtung',
        title_color: '#HEXCODE - Textfarbe',
        typography_typography: 'custom - Aktiviert Typografie',
        typography_font_size: '{ size: 32, unit: "px" }',
      },
      example: {
        title: 'Willkommen auf unserer Website',
        header_size: 'h1',
        align: 'center',
        title_color: '#333333',
      },
    },
    'text-editor': {
      description: 'WYSIWYG Text-Editor Widget',
      commonSettings: {
        editor: 'String - HTML Content',
        align: 'left|center|right|justify',
        text_color: '#HEXCODE',
      },
      example: {
        editor: '<p>Dies ist ein <strong>Beispieltext</strong> mit HTML-Formatierung.</p>',
        align: 'left',
      },
    },
    'image': {
      description: 'Bild-Widget mit Verlinkung und Lightbox',
      commonSettings: {
        image: '{ url: "...", id: 123 }',
        image_size: 'thumbnail|medium|large|full|custom',
        align: 'left|center|right',
        link_to: 'none|file|custom',
        open_lightbox: 'yes|no',
      },
      example: {
        image: { url: 'https://example.com/image.jpg', id: '' },
        image_size: 'large',
        align: 'center',
      },
    },
    'button': {
      description: 'Button-Widget mit verschiedenen Styles',
      commonSettings: {
        text: 'String - Button Text',
        link: '{ url: "...", is_external: true/false, nofollow: true/false }',
        button_type: 'default|info|success|warning|danger',
        size: 'xs|sm|md|lg|xl',
        icon: '{ value: "fas fa-...", library: "fa-solid" }',
      },
      example: {
        text: 'Jetzt kaufen',
        link: { url: '/shop', is_external: false },
        button_type: 'success',
        size: 'lg',
      },
    },
    'icon': {
      description: 'Icon-Widget mit Font Awesome Icons',
      commonSettings: {
        icon: '{ value: "fas fa-...", library: "fa-solid|fa-regular|fa-brands" }',
        view: 'default|stacked|framed',
        shape: 'circle|square',
        primary_color: '#HEXCODE',
      },
      example: {
        icon: { value: 'fas fa-check', library: 'fa-solid' },
        view: 'stacked',
        shape: 'circle',
        primary_color: '#28a745',
      },
    },
    'divider': {
      description: 'Trennlinien-Widget',
      commonSettings: {
        style: 'solid|double|dotted|dashed',
        weight: '{ size: 2, unit: "px" }',
        color: '#HEXCODE',
        width: '{ size: 100, unit: "%" }',
        align: 'left|center|right',
      },
      example: {
        style: 'solid',
        weight: { size: 2, unit: 'px' },
        color: '#dddddd',
        width: { size: 50, unit: '%' },
        align: 'center',
      },
    },
    'spacer': {
      description: 'Abstandshalter-Widget',
      commonSettings: {
        space: '{ size: 50, unit: "px" }',
      },
      example: {
        space: { size: 100, unit: 'px' },
      },
    },
    'google-maps': {
      description: 'Google Maps Einbettung',
      commonSettings: {
        address: 'String - Adresse',
        zoom: '{ size: 10 } - Zoom Level 1-20',
        height: '{ size: 400, unit: "px" }',
      },
      example: {
        address: 'Berlin, Deutschland',
        zoom: { size: 14 },
        height: { size: 400, unit: 'px' },
      },
    },
    'video': {
      description: 'Video-Widget für YouTube, Vimeo, etc.',
      commonSettings: {
        video_type: 'youtube|vimeo|dailymotion|hosted',
        youtube_url: 'String - YouTube URL',
        autoplay: 'yes|no',
        mute: 'yes|no',
        loop: 'yes|no',
      },
      example: {
        video_type: 'youtube',
        youtube_url: 'https://www.youtube.com/watch?v=XHOmBV4js_E',
        autoplay: 'no',
      },
    },
    'icon-box': {
      description: 'Icon mit Titel und Beschreibung',
      commonSettings: {
        icon: '{ value: "fas fa-...", library: "..." }',
        title_text: 'String',
        description_text: 'String',
        position: 'top|left|right',
      },
      example: {
        icon: { value: 'fas fa-rocket', library: 'fa-solid' },
        title_text: 'Schnelle Lieferung',
        description_text: 'Wir liefern innerhalb von 24 Stunden',
        position: 'top',
      },
    },
    'image-box': {
      description: 'Bild mit Titel und Beschreibung',
      commonSettings: {
        image: '{ url: "...", id: 123 }',
        title_text: 'String',
        description_text: 'String',
        position: 'top|left|right',
      },
      example: {
        image: { url: 'https://example.com/image.jpg', id: '' },
        title_text: 'Unser Produkt',
        description_text: 'Beschreibung des Produkts',
      },
    },
    'testimonial': {
      description: 'Testimonial/Bewertungs-Widget',
      commonSettings: {
        testimonial_content: 'String - Bewertungstext',
        testimonial_name: 'String - Name',
        testimonial_job: 'String - Position/Job',
        testimonial_image: '{ url: "...", id: 123 }',
      },
      example: {
        testimonial_content: 'Fantastischer Service! Absolut empfehlenswert.',
        testimonial_name: 'Max Mustermann',
        testimonial_job: 'CEO, Firma GmbH',
      },
    },
    'accordion': {
      description: 'Aufklappbare Accordion-Elemente',
      commonSettings: {
        tabs: 'Array von { tab_title: "...", tab_content: "..." }',
        icon: '{ value: "...", library: "..." }',
        icon_active: '{ value: "...", library: "..." }',
      },
      example: {
        tabs: [
          { tab_title: 'Frage 1', tab_content: 'Antwort auf Frage 1' },
          { tab_title: 'Frage 2', tab_content: 'Antwort auf Frage 2' },
        ],
      },
    },
    'tabs': {
      description: 'Tab-basierte Inhaltsorganisation',
      commonSettings: {
        tabs: 'Array von { tab_title: "...", tab_content: "..." }',
        type: 'horizontal|vertical',
      },
      example: {
        tabs: [
          { tab_title: 'Tab 1', tab_content: 'Inhalt von Tab 1' },
          { tab_title: 'Tab 2', tab_content: 'Inhalt von Tab 2' },
        ],
        type: 'horizontal',
      },
    },
    'form': {
      description: 'Kontaktformular (Elementor Pro)',
      commonSettings: {
        form_name: 'String',
        form_fields: 'Array von Formularfeldern',
        submit_actions: 'Array von Aktionen nach Submit',
        button_text: 'String',
      },
      example: {
        form_name: 'Kontaktformular',
        button_text: 'Absenden',
      },
    },
  };

  const info = widgetInfos[widgetType];
  if (!info) {
    return {
      widgetType,
      description: 'Keine detaillierten Informationen verfügbar',
      commonSettings: {},
      example: {},
    };
  }

  return {
    widgetType,
    ...info,
  };
}

export { analyzeElementorStructure, extractWidgets, generateElementorWidget };
