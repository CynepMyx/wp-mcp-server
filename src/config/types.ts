/**
 * WordPress MCP Server - Configuration Types
 */

export interface WordPressConfig {
  siteUrl: string;
  username: string;
  applicationPassword: string; // WordPress Application Password
  restApiBase?: string; // Default: /wp-json/wp/v2
}

export interface ElementorConfig {
  enabled: boolean;
}

export interface GutenbergConfig {
  enabled: boolean;
}

export interface ServerConfig {
  wordpress: WordPressConfig;
  elementor: ElementorConfig;
  gutenberg: GutenbergConfig;
}

export const defaultConfig: Partial<ServerConfig> = {
  elementor: { enabled: true },
  gutenberg: { enabled: true },
};

// === Design System Types ===

export interface ColorPaletteItem {
  name: string;
  slug: string;
  color: string;
}

export interface GradientItem {
  name: string;
  slug: string;
  gradient: string;
}

export interface FontFamily {
  name: string;
  slug: string;
  fontFamily: string;
  fontFace?: FontFace[];
}

export interface FontFace {
  fontFamily: string;
  fontStyle: string;
  fontWeight: string;
  src: string[];
}

export interface FontSize {
  name: string;
  slug: string;
  size: string;
  fluid?: {
    min: string;
    max: string;
  };
}

export interface SpacingSize {
  name: string;
  slug: string;
  size: string;
}

export interface GlobalStylesSettings {
  version?: number;
  settings?: {
    color?: {
      palette?: ColorPaletteItem[] | { theme?: ColorPaletteItem[]; custom?: ColorPaletteItem[] };
      gradients?: GradientItem[] | { theme?: GradientItem[]; custom?: GradientItem[] };
      duotone?: { theme?: unknown[] };
      defaultPalette?: boolean;
      defaultGradients?: boolean;
    };
    typography?: {
      fontFamilies?: FontFamily[] | { theme?: FontFamily[]; custom?: FontFamily[] };
      fontSizes?: FontSize[] | { theme?: FontSize[]; custom?: FontSize[] };
      lineHeight?: boolean;
      dropCap?: boolean;
    };
    spacing?: {
      spacingSizes?: SpacingSize[] | { theme?: SpacingSize[]; custom?: SpacingSize[] };
      units?: string[];
      padding?: boolean;
      margin?: boolean;
      blockGap?: boolean;
    };
    layout?: {
      contentSize?: string;
      wideSize?: string;
    };
    blocks?: Record<string, unknown>;
  };
  styles?: {
    color?: {
      background?: string;
      text?: string;
    };
    typography?: {
      fontFamily?: string;
      fontSize?: string;
      lineHeight?: string;
    };
    spacing?: {
      padding?: Record<string, string>;
      margin?: Record<string, string>;
      blockGap?: string;
    };
    elements?: Record<string, unknown>;
    blocks?: Record<string, unknown>;
  };
  customTemplates?: unknown[];
  templateParts?: unknown[];
  [key: string]: unknown;
}

// === Elementor Types ===

export interface ElementorGlobalColor {
  _id: string;
  title: string;
  color: string;
}

export interface ElementorGlobalFont {
  _id: string;
  title: string;
  typography_typography: string;
  typography_font_family?: string;
  typography_font_size?: { unit: string; size: number };
  typography_font_weight?: string;
  typography_line_height?: { unit: string; size: number };
}

export interface ElementorKit {
  id: number;
  title: string;
  status: string;
}

export interface ElementorThemeTemplate {
  id: number;
  title: string;
  type: string;
  conditions: string[];
}

export interface ElementorGlobalWidget {
  id: number;
  title: string;
  widget_type: string;
}

// === WordPress Types ===

export interface WPMenu {
  id: number;
  name: string;
  slug: string;
  locations: string[];
  items?: WPMenuItem[];
}

export interface WPMenuItem {
  id: number;
  title: string;
  url: string;
  parent: number;
  children?: WPMenuItem[];
}

export interface WPBlockPattern {
  name: string;
  title: string;
  content: string;
  description?: string;
  categories?: string[];
  keywords?: string[];
  viewportWidth?: number;
  blockTypes?: string[];
  [key: string]: unknown;
}

export interface WPBlockPatternCategory {
  name: string;
  label: string;
  description?: string;
  [key: string]: unknown;
}

// === Analysis Types ===

export interface LayoutAnalysis {
  containerTypes: string[];
  columnLayouts: string[];
  responsiveBreakpoints: string[];
  flexboxUsage: boolean;
  gridUsage: boolean;
  customClasses: string[];
  recommendations: string[];
  [key: string]: unknown;
}
