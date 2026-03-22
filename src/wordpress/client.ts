/**
 * WordPress REST API Client
 * Handles authentication and communication with WordPress REST API
 */

import { WordPressConfig } from '../config/types.js';
import type {
  GlobalStylesSettings,
  ElementorGlobalColor,
  ElementorGlobalFont,
  ElementorKit,
  ElementorThemeTemplate,
  ElementorGlobalWidget,
  WPMenu,
  WPMenuItem,
  WPBlockPattern,
  WPBlockPatternCategory,
} from '../config/types.js';

// Re-export types from config for backward compatibility
export type {
  GlobalStylesSettings,
  ElementorGlobalColor,
  ElementorGlobalFont,
  ElementorKit,
  ElementorThemeTemplate,
  ElementorGlobalWidget,
  WPMenu,
  WPMenuItem,
  WPBlockPattern,
  WPBlockPatternCategory,
} from '../config/types.js';

// Input types for creating/updating content (WordPress API accepts simple strings)
export interface WPPostCreateInput {
  title: string;
  content: string;
  status?: 'publish' | 'draft' | 'pending' | 'private' | 'future';
  excerpt?: string;
  slug?: string;
  author?: number;
  featured_media?: number;
  categories?: number[];
  tags?: number[];
  meta?: Record<string, unknown>;
}

export interface WPPageCreateInput {
  title: string;
  content: string;
  status?: 'publish' | 'draft' | 'pending' | 'private' | 'future';
  excerpt?: string;
  slug?: string;
  author?: number;
  featured_media?: number;
  parent?: number;
  menu_order?: number;
  template?: string;
  meta?: Record<string, unknown>;
}

export interface WPRestResponse<T> {
  data: T;
  headers: Headers;
  status: number;
}

export class WordPressClient {
  private config: WordPressConfig;
  private baseUrl: string;
  private authHeader: string;

  constructor(config: WordPressConfig) {
    this.config = config;
    this.baseUrl = `${config.siteUrl}${config.restApiBase || '/wp-json/wp/v2'}`;
    // WordPress Application Password Authentication
    this.authHeader = 'Basic ' + Buffer.from(
      `${config.username}:${config.applicationPassword}`
    ).toString('base64');
  }

  // Public getter for config (needed by some tools)
  getConfig(): WordPressConfig {
    return this.config;
  }

  // Public getter for site URL
  getSiteUrl(): string {
    return this.config.siteUrl;
  }

  // Public getter for auth header
  getAuthHeader(): string {
    return this.authHeader;
  }

  private async request<T>(
    endpoint: string,
    method: string = 'GET',
    body?: unknown
  ): Promise<WPRestResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Authorization': this.authHeader,
      'Content-Type': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json() as T;

    return {
      data,
      headers: response.headers,
      status: response.status,
    };
  }

  // Public generic request method for custom endpoints (WooCommerce, ACF, etc.)
  async customRequest<T>(
    fullEndpoint: string,
    method: string = 'GET',
    body?: unknown,
    queryParams?: Record<string, string | number | boolean | undefined>
  ): Promise<WPRestResponse<T>> {
    let url = `${this.config.siteUrl}/wp-json${fullEndpoint}`;
    
    // Add query parameters
    if (queryParams && Object.keys(queryParams).length > 0) {
      const filteredParams = Object.entries(queryParams)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]);
      if (filteredParams.length > 0) {
        url += '?' + new URLSearchParams(Object.fromEntries(filteredParams)).toString();
      }
    }
    
    const headers: Record<string, string> = {
      'Authorization': this.authHeader,
      'Content-Type': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json() as T;

    return {
      data,
      headers: response.headers,
      status: response.status,
    };
  }

  // Posts
  async getPosts(params?: Record<string, string | number>) {
    const queryString = params 
      ? '?' + new URLSearchParams(params as Record<string, string>).toString()
      : '';
    return this.request<WPPost[]>(`/posts${queryString}`);
  }

  async getPost(id: number) {
    return this.request<WPPost>(`/posts/${id}`);
  }

  async createPost(data: WPPostCreateInput) {
    return this.request<WPPost>('/posts', 'POST', data);
  }

  async updatePost(id: number, data: Partial<WPPostCreateInput>) {
    return this.request<WPPost>(`/posts/${id}`, 'PUT', data);
  }

  async deletePost(id: number, force: boolean = false) {
    return this.request<WPPost>(`/posts/${id}?force=${force}`, 'DELETE');
  }

  // Pages
  async getPages(params?: Record<string, string | number>) {
    const queryString = params 
      ? '?' + new URLSearchParams(params as Record<string, string>).toString()
      : '';
    return this.request<WPPage[]>(`/pages${queryString}`);
  }

  async getPage(id: number) {
    return this.request<WPPage>(`/pages/${id}`);
  }

  async createPage(data: WPPageCreateInput) {
    return this.request<WPPage>('/pages', 'POST', data);
  }

  async updatePage(id: number, data: Partial<WPPageCreateInput>) {
    return this.request<WPPage>(`/pages/${id}`, 'PUT', data);
  }

  // Media
  async getMedia(params?: Record<string, string | number>) {
    const queryString = params 
      ? '?' + new URLSearchParams(params as Record<string, string>).toString()
      : '';
    return this.request<WPMedia[]>(`/media${queryString}`);
  }

  async getMediaItem(id: number) {
    return this.request<WPMedia>(`/media/${id}`);
  }

  // Categories & Tags
  async getCategories() {
    return this.request<WPCategory[]>('/categories');
  }

  async getTags() {
    return this.request<WPTag[]>('/tags');
  }

  // Users — context=edit is required to return username, email and roles
  async getUsers() {
    return this.request<WPUser[]>('/users?context=edit');
  }

  async getCurrentUser() {
    return this.request<WPUser>('/users/me?context=edit');
  }

  // Menus (requires menus endpoint plugin or custom endpoint)
  async getMenus() {
    const url = `${this.config.siteUrl}/wp-json/menus/v1/menus`;
    const response = await fetch(url, {
      headers: { 'Authorization': this.authHeader }
    });
    return response.json();
  }

  // Site Settings
  async getSiteSettings() {
    const url = `${this.config.siteUrl}/wp-json`;
    const response = await fetch(url);
    return response.json();
  }

  // Plugins
  async getPlugins() {
    const url = `${this.config.siteUrl}/wp-json/wp/v2/plugins`;
    const response = await fetch(url, {
      headers: { 'Authorization': this.authHeader }
    });
    return response.json();
  }

  // Themes
  async getThemes() {
    const url = `${this.config.siteUrl}/wp-json/wp/v2/themes`;
    const response = await fetch(url, {
      headers: { 'Authorization': this.authHeader }
    });
    return response.json();
  }

  // Custom endpoint for Elementor data
  async getElementorData(postId: number) {
    const url = `${this.config.siteUrl}/wp-json/elementor/v1/document/${postId}`;
    const response = await fetch(url, {
      headers: { 'Authorization': this.authHeader }
    });
    return response.json();
  }

  // Block Editor data
  async getBlockEditorBlocks() {
    const url = `${this.config.siteUrl}/wp-json/wp/v2/block-types`;
    const response = await fetch(url, {
      headers: { 'Authorization': this.authHeader }
    });
    return response.json();
  }

  async getReusableBlocks() {
    const url = `${this.config.siteUrl}/wp-json/wp/v2/blocks`;
    const response = await fetch(url, {
      headers: { 'Authorization': this.authHeader }
    });
    return response.json();
  }

  // Templates
  async getTemplates() {
    const url = `${this.config.siteUrl}/wp-json/wp/v2/templates`;
    const response = await fetch(url, {
      headers: { 'Authorization': this.authHeader }
    });
    return response.json();
  }

  async getTemplateParts() {
    const url = `${this.config.siteUrl}/wp-json/wp/v2/template-parts`;
    const response = await fetch(url, {
      headers: { 'Authorization': this.authHeader }
    });
    return response.json();
  }

  // Global Styles
  async getGlobalStyles() {
    const url = `${this.config.siteUrl}/wp-json/wp/v2/global-styles`;
    const response = await fetch(url, {
      headers: { 'Authorization': this.authHeader }
    });
    return response.json();
  }

  // Widget Areas
  async getWidgets() {
    const url = `${this.config.siteUrl}/wp-json/wp/v2/widgets`;
    const response = await fetch(url, {
      headers: { 'Authorization': this.authHeader }
    });
    return response.json();
  }

  async getSidebars() {
    const url = `${this.config.siteUrl}/wp-json/wp/v2/sidebars`;
    const response = await fetch(url, {
      headers: { 'Authorization': this.authHeader }
    });
    return response.json();
  }

  // === DESIGN SYSTEM / UI/UX APIs ===

  // Global Styles mit Settings (theme.json)
  async getGlobalStylesSettings(): Promise<GlobalStylesSettings | null> {
    try {
      // Versuche erst die neue API
      const url = `${this.config.siteUrl}/wp-json/wp/v2/global-styles/themes/${await this.getActiveThemeStylesheet()}`;
      const response = await fetch(url, {
        headers: { 'Authorization': this.authHeader }
      });
      if (response.ok) {
        return response.json() as Promise<GlobalStylesSettings>;
      }
    } catch {
      // Fallback
    }
    
    // Fallback: Hole settings direkt
    try {
      const url = `${this.config.siteUrl}/wp-json/__experimental/global-styles/themes/${await this.getActiveThemeStylesheet()}`;
      const response = await fetch(url, {
        headers: { 'Authorization': this.authHeader }
      });
      return response.json() as Promise<GlobalStylesSettings>;
    } catch {
      return null;
    }
  }

  private async getActiveThemeStylesheet(): Promise<string> {
    const themes = await this.getThemes();
    const active = Array.isArray(themes) 
      ? themes.find((t: Record<string, unknown>) => (t as { status?: string }).status === 'active')
      : null;
    return (active as { stylesheet?: string })?.stylesheet || 'default';
  }

  // Theme Customizer
  async getCustomizerSettings(): Promise<Record<string, unknown>> {
    const url = `${this.config.siteUrl}/wp-json/wp/v2/settings`;
    const response = await fetch(url, {
      headers: { 'Authorization': this.authHeader }
    });
    return response.json() as Promise<Record<string, unknown>>;
  }

  async getCustomCSS(): Promise<string | null> {
    try {
      const url = `${this.config.siteUrl}/wp-json/wp/v2/custom-css`;
      const response = await fetch(url, {
        headers: { 'Authorization': this.authHeader }
      });
      const data = await response.json() as { css?: string };
      return data?.css || null;
    } catch {
      return null;
    }
  }

  // Elementor Global Settings
  async getElementorGlobalSettings(): Promise<Record<string, unknown> | null> {
    try {
      const url = `${this.config.siteUrl}/wp-json/elementor/v1/globals`;
      const response = await fetch(url, {
        headers: { 'Authorization': this.authHeader }
      });
      return response.json() as Promise<Record<string, unknown>>;
    } catch {
      return null;
    }
  }

  async getElementorGlobalColors(): Promise<ElementorGlobalColor[] | null> {
    try {
      const url = `${this.config.siteUrl}/wp-json/elementor/v1/globals`;
      const response = await fetch(url, {
        headers: { 'Authorization': this.authHeader }
      });
      const data = await response.json() as { colors?: ElementorGlobalColor[] };
      return data?.colors || null;
    } catch {
      return null;
    }
  }

  async getElementorGlobalFonts(): Promise<ElementorGlobalFont[] | null> {
    try {
      const url = `${this.config.siteUrl}/wp-json/elementor/v1/globals`;
      const response = await fetch(url, {
        headers: { 'Authorization': this.authHeader }
      });
      const data = await response.json() as { typography?: ElementorGlobalFont[] };
      return data?.typography || null;
    } catch {
      return null;
    }
  }

  async getElementorBreakpoints(): Promise<Record<string, ElementorBreakpoint> | null> {
    try {
      const url = `${this.config.siteUrl}/wp-json/elementor/v1/globals`;
      const response = await fetch(url, {
        headers: { 'Authorization': this.authHeader }
      });
      const data = await response.json() as { breakpoints?: Record<string, ElementorBreakpoint> };
      return data?.breakpoints || null;
    } catch {
      return null;
    }
  }

  // Elementor Kits
  async getElementorKits(): Promise<{ kits: ElementorKit[]; activeKit?: number }> {
    try {
      const url = `${this.config.siteUrl}/wp-json/elementor/v1/kits`;
      const response = await fetch(url, {
        headers: { 'Authorization': this.authHeader }
      });
      return response.json() as Promise<{ kits: ElementorKit[]; activeKit?: number }>;
    } catch {
      return { kits: [] };
    }
  }

  // Elementor Theme Builder Templates
  async getElementorThemeBuilderTemplates(templateType: string = 'all'): Promise<ElementorThemeTemplate[]> {
    try {
      const url = `${this.config.siteUrl}/wp-json/elementor/v1/templates${templateType !== 'all' ? `?type=${templateType}` : ''}`;
      const response = await fetch(url, {
        headers: { 'Authorization': this.authHeader }
      });
      return response.json() as Promise<ElementorThemeTemplate[]>;
    } catch {
      return [];
    }
  }

  // Elementor Global Widgets
  async getElementorGlobalWidgets(): Promise<ElementorGlobalWidget[]> {
    try {
      const url = `${this.config.siteUrl}/wp-json/elementor/v1/global-widgets`;
      const response = await fetch(url, {
        headers: { 'Authorization': this.authHeader }
      });
      return response.json() as Promise<ElementorGlobalWidget[]>;
    } catch {
      return [];
    }
  }

  // Navigation Menus
  async getNavigationMenus(): Promise<WPMenu[]> {
    try {
      // Versuche verschiedene Menu-Endpoints
      const endpoints = [
        '/wp-json/wp/v2/menus',
        '/wp-json/menus/v1/menus',
        '/wp-json/wp-mcp/v1/menus',
      ];
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`${this.config.siteUrl}${endpoint}`, {
            headers: { 'Authorization': this.authHeader }
          });
          if (response.ok) {
            return response.json() as Promise<WPMenu[]>;
          }
        } catch {
          continue;
        }
      }
      return [];
    } catch {
      return [];
    }
  }

  async getMenuLocations(): Promise<Record<string, string>> {
    try {
      const url = `${this.config.siteUrl}/wp-json/menus/v1/locations`;
      const response = await fetch(url, {
        headers: { 'Authorization': this.authHeader }
      });
      return response.json() as Promise<Record<string, string>>;
    } catch {
      return {};
    }
  }

  async getMenuItems(menuId: number): Promise<WPMenuItem[]> {
    try {
      const endpoints = [
        `/wp-json/wp/v2/menu-items?menus=${menuId}`,
        `/wp-json/menus/v1/menus/${menuId}`,
        `/wp-json/wp-mcp/v1/menus/${menuId}/items`,
      ];
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`${this.config.siteUrl}${endpoint}`, {
            headers: { 'Authorization': this.authHeader }
          });
          if (response.ok) {
            const data = await response.json() as { items?: WPMenuItem[] } | WPMenuItem[];
            return Array.isArray(data) ? data : (data?.items || []);
          }
        } catch {
          continue;
        }
      }
      return [];
    } catch {
      return [];
    }
  }

  // Block Patterns
  async getBlockPatterns(category?: string): Promise<WPBlockPattern[]> {
    try {
      const url = `${this.config.siteUrl}/wp-json/wp/v2/block-patterns/patterns${category ? `?category=${category}` : ''}`;
      const response = await fetch(url, {
        headers: { 'Authorization': this.authHeader }
      });
      return response.json() as Promise<WPBlockPattern[]>;
    } catch {
      return [];
    }
  }

  async getBlockPatternCategories(): Promise<WPBlockPatternCategory[]> {
    try {
      const url = `${this.config.siteUrl}/wp-json/wp/v2/block-patterns/categories`;
      const response = await fetch(url, {
        headers: { 'Authorization': this.authHeader }
      });
      return response.json() as Promise<WPBlockPatternCategory[]>;
    } catch {
      return [];
    }
  }
}

// === LOCAL TYPE DEFINITIONS ===

export interface ElementorBreakpoint {
  label: string;
  value: number;
  default_value: number;
  direction: string;
}

// WordPress Types
export interface WPPost {
  id: number;
  date: string;
  date_gmt: string;
  guid: { rendered: string };
  modified: string;
  modified_gmt: string;
  slug: string;
  status: 'publish' | 'future' | 'draft' | 'pending' | 'private';
  type: string;
  link: string;
  title: { rendered: string };
  content: { rendered: string; protected: boolean; raw?: string };
  excerpt: { rendered: string; protected: boolean };
  author: number;
  featured_media: number;
  comment_status: 'open' | 'closed';
  ping_status: 'open' | 'closed';
  sticky: boolean;
  template: string;
  format: string;
  meta: Record<string, unknown>;
  categories: number[];
  tags: number[];
}

export interface WPPage extends WPPost {
  parent: number;
  menu_order: number;
}

export interface WPMedia {
  id: number;
  date: string;
  slug: string;
  status: string;
  type: string;
  link: string;
  title: { rendered: string };
  author: number;
  caption: { rendered: string };
  alt_text: string;
  media_type: 'image' | 'file';
  mime_type: string;
  source_url: string;
  media_details: {
    width: number;
    height: number;
    file: string;
    sizes: Record<string, { file: string; width: number; height: number; source_url: string }>;
  };
}

export interface WPCategory {
  id: number;
  count: number;
  description: string;
  link: string;
  name: string;
  slug: string;
  taxonomy: string;
  parent: number;
}

export interface WPTag {
  id: number;
  count: number;
  description: string;
  link: string;
  name: string;
  slug: string;
  taxonomy: string;
}

export interface WPUser {
  id: number;
  username: string;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  url: string;
  description: string;
  link: string;
  slug: string;
  roles: string[];
  avatar_urls: Record<string, string>;
}
