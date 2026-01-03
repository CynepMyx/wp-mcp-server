/**
 * Generic REST API CRUD Tools
 * Inspiriert vom Automattic WordPress-MCP Plugin
 * Ermöglicht generischen Zugriff auf alle WordPress REST API Endpoints
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod';
import { WordPressClient } from '../wordpress/client.js';
import { WordPressConfig } from '../config/types.js';

// REST API Endpoint Typen
interface RestEndpoint {
  namespace: string;
  route: string;
  methods: string[];
  endpoints: Array<{
    methods: string[];
    args: Record<string, {
      required: boolean;
      type: string;
      description?: string;
      default?: unknown;
      enum?: string[];
    }>;
  }>;
  _links?: Record<string, unknown>;
}

interface RestNamespace {
  namespace: string;
  routes: Record<string, RestEndpoint>;
}

// Sensitive Endpoints die ausgeschlossen werden
const EXCLUDED_ENDPOINTS = [
  '/jwt-auth/',
  '/oembed/',
  '/autosaves',
  '/revisions',
  '/rendered',
  '/password',
  '/application-passwords',
];

export function registerRestApiCrudTools(server: McpServer, config: WordPressConfig) {
  const baseUrl = config.siteUrl;
  const authHeader = 'Basic ' + Buffer.from(
    `${config.username}:${config.applicationPassword}`
  ).toString('base64');

  // Helper: Fetch REST API Discovery
  async function discoverRestApi(): Promise<RestNamespace[]> {
    const response = await fetch(`${baseUrl}/wp-json/`, {
      headers: { 'Authorization': authHeader }
    });
    const data = await response.json() as { namespaces: string[]; routes: Record<string, RestEndpoint> };
    
    const namespaces: RestNamespace[] = [];
    const routes = data.routes || {};
    
    // Gruppiere Routes nach Namespace
    const namespaceRoutes: Record<string, Record<string, RestEndpoint>> = {};
    
    for (const [route, endpoint] of Object.entries(routes)) {
      // Filtere sensitive Endpoints
      if (EXCLUDED_ENDPOINTS.some(excluded => route.includes(excluded))) {
        continue;
      }
      
      const namespace = endpoint.namespace || 'wp/v2';
      if (!namespaceRoutes[namespace]) {
        namespaceRoutes[namespace] = {};
      }
      namespaceRoutes[namespace][route] = endpoint;
    }
    
    for (const [namespace, routes] of Object.entries(namespaceRoutes)) {
      namespaces.push({ namespace, routes });
    }
    
    return namespaces;
  }

  // Tool 1: Liste alle verfügbaren API Funktionen
  server.registerTool(
    'rest_api_list_functions',
    {
      title: 'Liste REST API Funktionen',
      description: 'Entdeckt alle verfügbaren WordPress REST API Endpoints. Zeigt alle Namespaces und Routes mit ihren unterstützten HTTP-Methoden.',
      inputSchema: {
        namespace: z.string().optional()
          .describe('Filter nach Namespace (z.B. "wp/v2", "elementor/v1")'),
        method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional()
          .describe('Filter nach HTTP-Methode'),
      },
      outputSchema: {
        namespaces: z.array(z.object({
          namespace: z.string(),
          endpoints: z.array(z.object({
            route: z.string(),
            methods: z.array(z.string()),
          })),
        })),
        total_endpoints: z.number(),
      }
    },
    async ({ namespace: filterNamespace, method: filterMethod }) => {
      const namespaces = await discoverRestApi();
      
      const result = namespaces
        .filter(ns => !filterNamespace || ns.namespace === filterNamespace)
        .map(ns => ({
          namespace: ns.namespace,
          endpoints: Object.entries(ns.routes)
            .filter(([_, endpoint]) => {
              if (!filterMethod) return true;
              return endpoint.methods?.includes(filterMethod) ||
                endpoint.endpoints?.some(e => e.methods?.includes(filterMethod));
            })
            .map(([route, endpoint]) => ({
              route,
              methods: endpoint.methods || 
                [...new Set(endpoint.endpoints?.flatMap(e => e.methods) || [])],
            })),
        }))
        .filter(ns => ns.endpoints.length > 0);

      const totalEndpoints = result.reduce((sum, ns) => sum + ns.endpoints.length, 0);
      
      const output = { namespaces: result, total_endpoints: totalEndpoints };
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    }
  );

  // Tool 2: Hole Details zu einem spezifischen Endpoint
  server.registerTool(
    'rest_api_get_function_details',
    {
      title: 'Hole API Funktions-Details',
      description: 'Holt detaillierte Metadaten für einen spezifischen REST API Endpoint, inklusive aller Parameter und ihrer Typen.',
      inputSchema: {
        route: z.string()
          .describe('Der REST API Route-Pfad (z.B. "/wp/v2/posts", "/wp/v2/pages/(?P<id>[\\d]+)")'),
        method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional()
          .describe('Filter nach HTTP-Methode'),
      },
      outputSchema: {
        route: z.string(),
        namespace: z.string(),
        methods: z.array(z.string()),
        parameters: z.array(z.object({
          name: z.string(),
          type: z.string(),
          required: z.boolean(),
          description: z.string().optional(),
          default: z.unknown().optional(),
          enum: z.array(z.string()).optional(),
        })),
      }
    },
    async ({ route, method: filterMethod }) => {
      const namespaces = await discoverRestApi();
      
      // Finde den Endpoint
      let foundEndpoint: RestEndpoint | null = null;
      let foundNamespace = '';
      
      for (const ns of namespaces) {
        for (const [endpointRoute, endpoint] of Object.entries(ns.routes)) {
          if (endpointRoute === route || route.startsWith(endpointRoute.replace(/\(\?P<[^>]+>[^)]+\)/g, ''))) {
            foundEndpoint = endpoint;
            foundNamespace = ns.namespace;
            break;
          }
        }
        if (foundEndpoint) break;
      }
      
      if (!foundEndpoint) {
        throw new Error(`Endpoint "${route}" nicht gefunden`);
      }
      
      // Sammle Parameter aus allen Endpoints
      const parameters: Array<{
        name: string;
        type: string;
        required: boolean;
        description?: string;
        default?: unknown;
        enum?: string[];
        methods: string[];
      }> = [];
      
      for (const ep of foundEndpoint.endpoints || []) {
        if (filterMethod && !ep.methods.includes(filterMethod)) continue;
        
        for (const [paramName, paramDef] of Object.entries(ep.args || {})) {
          const existing = parameters.find(p => p.name === paramName);
          if (!existing) {
            parameters.push({
              name: paramName,
              type: paramDef.type || 'string',
              required: paramDef.required || false,
              description: paramDef.description,
              default: paramDef.default,
              enum: paramDef.enum,
              methods: ep.methods,
            });
          }
        }
      }
      
      const methods = filterMethod 
        ? [filterMethod]
        : [...new Set(foundEndpoint.endpoints?.flatMap(e => e.methods) || foundEndpoint.methods || [])];
      
      const output = {
        route,
        namespace: foundNamespace,
        methods,
        parameters: parameters.map(({ methods: _, ...rest }) => rest),
      };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    }
  );

  // Tool 3: Führe eine REST API Funktion aus
  server.registerTool(
    'rest_api_execute',
    {
      title: 'Führe REST API Funktion aus',
      description: 'Führt eine beliebige WordPress REST API Funktion aus. Unterstützt GET, POST, PUT, PATCH und DELETE Operationen.',
      inputSchema: {
        endpoint: z.string()
          .describe('Der REST API Endpoint-Pfad (z.B. "/wp/v2/posts", "/wp/v2/pages/123")'),
        method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
          .describe('HTTP-Methode'),
        params: z.record(z.string(), z.unknown()).optional()
          .describe('Parameter für GET-Requests (Query-String)'),
        body: z.record(z.string(), z.unknown()).optional()
          .describe('Request-Body für POST/PUT/PATCH-Requests'),
      },
    },
    async ({ endpoint, method, params, body }) => {
      // Baue URL mit Query-Params für GET
      let url = `${baseUrl}/wp-json${endpoint}`;
      if (params && method === 'GET') {
        const queryParams = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
          queryParams.append(key, String(value));
        }
        url += `?${queryParams.toString()}`;
      }
      
      const options: RequestInit = {
        method,
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
      };
      
      if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
      }
      
      const response = await fetch(url, options);
      const data = await response.json();
      
      const output = {
        success: response.ok,
        status: response.status,
        data,
      };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    }
  );

  // Tool 4: Batch-Operationen
  server.registerTool(
    'rest_api_batch',
    {
      title: 'REST API Batch-Ausführung',
      description: 'Führt mehrere REST API Anfragen in einer Batch-Operation aus (WordPress 5.6+)',
      inputSchema: {
        requests: z.array(z.object({
          method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
          path: z.string().describe('REST API Pfad'),
          body: z.record(z.string(), z.unknown()).optional(),
        })).describe('Array von Requests'),
      },
      outputSchema: {
        responses: z.array(z.object({
          status: z.number(),
          body: z.unknown(),
        })),
      }
    },
    async ({ requests }) => {
      const url = `${baseUrl}/wp-json/batch/v1`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      });
      
      const data = await response.json() as { responses: Array<{ status: number; body: unknown }> };
      
      const output = {
        responses: data.responses || [],
      };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    }
  );

  // Tool 5: Custom Post Types auflisten
  server.registerTool(
    'rest_api_list_post_types',
    {
      title: 'Liste alle Post Types',
      description: 'Zeigt alle registrierten Post Types mit REST API Support',
      inputSchema: {},
      outputSchema: {
        post_types: z.array(z.object({
          slug: z.string(),
          name: z.string(),
          rest_base: z.string(),
          rest_namespace: z.string(),
          hierarchical: z.boolean(),
          has_archive: z.boolean(),
        })),
      }
    },
    async () => {
      const url = `${baseUrl}/wp-json/wp/v2/types`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': authHeader }
      });
      
      const types = await response.json() as Record<string, {
        slug: string;
        name: string;
        rest_base: string;
        rest_namespace: string;
        hierarchical: boolean;
        has_archive: boolean;
      }>;
      
      const postTypes = Object.values(types).map(t => ({
        slug: t.slug,
        name: t.name,
        rest_base: t.rest_base,
        rest_namespace: t.rest_namespace || 'wp/v2',
        hierarchical: t.hierarchical,
        has_archive: t.has_archive,
      }));
      
      const output = { post_types: postTypes };
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    }
  );

  // Tool 6: Taxonomien auflisten
  server.registerTool(
    'rest_api_list_taxonomies',
    {
      title: 'Liste alle Taxonomien',
      description: 'Zeigt alle registrierten Taxonomien mit REST API Support',
      inputSchema: {},
      outputSchema: {
        taxonomies: z.array(z.object({
          slug: z.string(),
          name: z.string(),
          rest_base: z.string(),
          rest_namespace: z.string(),
          hierarchical: z.boolean(),
          types: z.array(z.string()),
        })),
      }
    },
    async () => {
      const url = `${baseUrl}/wp-json/wp/v2/taxonomies`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': authHeader }
      });
      
      const taxonomies = await response.json() as Record<string, {
        slug: string;
        name: string;
        rest_base: string;
        rest_namespace: string;
        hierarchical: boolean;
        types: string[];
      }>;
      
      const taxonomyList = Object.values(taxonomies).map(t => ({
        slug: t.slug,
        name: t.name,
        rest_base: t.rest_base,
        rest_namespace: t.rest_namespace || 'wp/v2',
        hierarchical: t.hierarchical,
        types: t.types,
      }));
      
      const output = { taxonomies: taxonomyList };
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    }
  );

  // Tool 7: Search Endpoint
  server.registerTool(
    'rest_api_search',
    {
      title: 'WordPress Suche',
      description: 'Durchsucht alle WordPress-Inhalte (Posts, Pages, Terms, etc.)',
      inputSchema: {
        query: z.string().describe('Suchbegriff'),
        type: z.enum(['post', 'term', 'post-format']).optional()
          .describe('Typ der Suchergebnisse'),
        subtype: z.string().optional()
          .describe('Subtype (z.B. "post", "page", "category")'),
        per_page: z.number().min(1).max(100).optional()
          .describe('Ergebnisse pro Seite'),
      },
      outputSchema: {
        results: z.array(z.object({
          id: z.number(),
          title: z.string(),
          url: z.string(),
          type: z.string(),
          subtype: z.string(),
        })),
        total: z.number(),
      }
    },
    async ({ query, type, subtype, per_page = 20 }) => {
      const params = new URLSearchParams({
        search: query,
        per_page: String(per_page),
      });
      
      if (type) params.set('type', type);
      if (subtype) params.set('subtype', subtype);
      
      const url = `${baseUrl}/wp-json/wp/v2/search?${params}`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': authHeader }
      });
      
      const results = await response.json() as Array<{
        id: number;
        title: string;
        url: string;
        type: string;
        subtype: string;
      }>;
      
      const total = parseInt(response.headers.get('X-WP-Total') || '0');
      
      const output = {
        results: Array.isArray(results) ? results : [],
        total,
      };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    }
  );
}
