/**
 * WordPress MCP Server - HTTP Streamable Transport
 * Ermöglicht direkte HTTP-Verbindung von VS Code ohne Proxy
 * Inspiriert vom Automattic WordPress-MCP Plugin
 */

// Load .env file automatically
import 'dotenv/config';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import express, { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { WordPressClient } from './wordpress/client.js';
import { WordPressConfig, ServerConfig } from './config/types.js';
import { registerContentTools } from './tools/content.js';
import { registerGutenbergTools } from './tools/gutenberg.js';
import { registerElementorTools } from './tools/elementor.js';
import { registerThemePluginTools } from './tools/themes-plugins.js';
import { registerRestApiCrudTools } from './tools/rest-api-crud.js';
import { registerDesignSystemTools } from './tools/design-system.js';
import { registerAccessibilityTools } from './tools/accessibility.js';
import { registerSeoTools } from './tools/seo.js';
import { registerWooCommerceTools } from './tools/woocommerce.js';
import { registerAcfTools } from './tools/acf.js';
import { registerRevisionTools, registerCommentTools } from './tools/revisions-comments.js';
import { registerMultilingualTools } from './tools/multilingual.js';
import { registerImageTools } from './tools/image-tools.js';
import { registerFormsTools } from './tools/forms.js';
import { registerAdminTools } from './tools/admin.js';
import { registerJwtTools } from './tools/jwt-tools.js';
import { JWTAuthManager, getJWTConfigFromEnv, detectAuthMode } from './auth/jwt.js';

// Session Storage für HTTP Transport
const sessions: Map<string, StreamableHTTPServerTransport> = new Map();

// Configuration from environment variables
function getConfig(): WordPressConfig {
  const siteUrl = process.env.WORDPRESS_SITE_URL;
  const username = process.env.WORDPRESS_USERNAME;
  const applicationPassword = process.env.WORDPRESS_APP_PASSWORD;

  if (!siteUrl || !username || !applicationPassword) {
    console.error('Missing required environment variables:');
    console.error('- WORDPRESS_SITE_URL: Your WordPress site URL (e.g., https://example.com)');
    console.error('- WORDPRESS_USERNAME: Your WordPress username');
    console.error('- WORDPRESS_APP_PASSWORD: Your WordPress Application Password');
    console.error('\nTo create an Application Password:');
    console.error('1. Go to WordPress Admin → Users → Profile');
    console.error('2. Scroll to "Application Passwords"');
    console.error('3. Enter a name and click "Add New Application Password"');
    process.exit(1);
  }

  return {
    siteUrl: siteUrl.replace(/\/$/, ''),
    username,
    applicationPassword,
    restApiBase: process.env.WORDPRESS_REST_API_BASE || '/wp-json/wp/v2',
  };
}

// Create and configure MCP Server
function createMcpServer(config: WordPressConfig): McpServer {
  const wpClient = new WordPressClient(config);
  
  // JWT Auth Manager initialisieren
  const jwtConfig = getJWTConfigFromEnv();
  const jwtManager = new JWTAuthManager(config, jwtConfig);
  const authMode = detectAuthMode();
  
  console.log(`Auth Mode: ${authMode}`);
  
  const server = new McpServer({
    name: 'wordpress-mcp-server',
    version: '1.0.0',
  });

  // Register all tools
  registerContentTools(server, wpClient);
  registerGutenbergTools(server, wpClient);
  registerElementorTools(server, wpClient);
  registerThemePluginTools(server, wpClient);
  registerRestApiCrudTools(server, config);
  registerDesignSystemTools(server, wpClient);
  registerAccessibilityTools(server, wpClient);
  
  // Register new extended tools
  registerSeoTools(server, wpClient);
  registerWooCommerceTools(server, wpClient);
  registerAcfTools(server, wpClient);
  registerRevisionTools(server, wpClient);
  registerCommentTools(server, wpClient);
  registerMultilingualTools(server, wpClient);
  registerImageTools(server, wpClient);
  registerFormsTools(server, wpClient);
  
  // Register Admin & JWT tools
  registerAdminTools(server, wpClient);
  registerJwtTools(server, wpClient, jwtManager);

  // Register resources
  server.registerResource(
    'wordpress-info',
    'wordpress://site-info',
    {
      title: 'WordPress Site Information',
      description: 'General information about the connected WordPress site',
      mimeType: 'application/json'
    },
    async (uri) => {
      const siteInfo = await wpClient.getSiteSettings();
      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(siteInfo, null, 2)
        }]
      };
    }
  );

  // Register prompts (inspiriert vom Automattic Plugin)
  server.registerPrompt(
    'wordpress-content-review',
    {
      title: 'Content Review',
      description: 'Review WordPress content for SEO and quality',
      argsSchema: {
        postId: { type: 'number', description: 'Post ID to review' } as unknown as import('zod').ZodNumber
      }
    },
    async ({ postId }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Please review the WordPress post with ID ${postId} for:
1. SEO optimization (title, meta description, headings)
2. Content quality and readability
3. Image alt texts and optimization
4. Internal/external linking
5. Call-to-action effectiveness

Use the wp_get_post tool to fetch the content first.`
        }
      }]
    })
  );

  server.registerPrompt(
    'elementor-page-audit',
    {
      title: 'Elementor Page Audit',
      description: 'Audit an Elementor page structure',
      argsSchema: {
        pageId: { type: 'number', description: 'Page ID to audit' } as unknown as import('zod').ZodNumber
      }
    },
    async ({ pageId }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Please audit the Elementor page with ID ${pageId}:
1. Analyze the page structure using elementor_analyze_structure
2. Check widget usage and identify redundant elements
3. Review responsive settings
4. Suggest performance improvements
5. Recommend accessibility enhancements`
        }
      }]
    })
  );

  server.registerPrompt(
    'gutenberg-block-generation',
    {
      title: 'Generate Gutenberg Blocks',
      description: 'Generate Gutenberg blocks from a description',
      argsSchema: {
        description: { type: 'string', description: 'Description of the content to create' } as unknown as import('zod').ZodString
      }
    },
    async ({ description }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Generate Gutenberg blocks for the following content requirement:

${description}

Use the gutenberg_generate_block tool to create the blocks.
Consider:
1. Appropriate block types for the content
2. Proper heading hierarchy
3. Accessibility
4. Mobile responsiveness`
        }
      }]
    })
  );

  return server;
}

// STDIO Transport (für Claude Desktop, etc.)
async function runStdioTransport() {
  const config = getConfig();
  const server = createMcpServer(config);
  
  console.error('Starting WordPress MCP Server (STDIO Transport)...');
  console.error(`Connected to: ${config.siteUrl}`);
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('WordPress MCP Server is running!');
}

// HTTP Streamable Transport (für VS Code Direct Connection)
async function runHttpTransport() {
  const config = getConfig();
  const port = parseInt(process.env.MCP_HTTP_PORT || '3000');
  
  const app = express();
  app.use(express.json());

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', transport: 'http-streamable' });
  });

  // MCP Streamable Endpoint
  app.post('/mcp', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    
    try {
      let transport: StreamableHTTPServerTransport;
      
      if (sessionId && sessions.has(sessionId)) {
        // Existing session
        transport = sessions.get(sessionId)!;
      } else {
        // New session
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          enableJsonResponse: true,
        });

        const server = createMcpServer(config);
        await server.connect(transport);

        // Store session after connection
        const newSessionId = (transport as unknown as { sessionId?: string }).sessionId;
        if (newSessionId) {
          sessions.set(newSessionId, transport);
          console.error(`New session created: ${newSessionId}`);
        }
      }

      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('MCP request error:', error);
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal error' },
        id: null
      });
    }
  });

  // Handle GET for SSE streams (optional)
  app.get('/mcp', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string;
    const transport = sessions.get(sessionId);
    
    if (transport) {
      await transport.handleRequest(req, res);
    } else {
      res.status(400).json({ error: 'Invalid or missing session' });
    }
  });

  // Session cleanup
  app.delete('/mcp', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string;
    
    if (sessionId && sessions.has(sessionId)) {
      const transport = sessions.get(sessionId)!;
      await transport.close();
      sessions.delete(sessionId);
      console.error(`Session closed: ${sessionId}`);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Invalid session' });
    }
  });

  app.listen(port, () => {
    console.error(`WordPress MCP Server (HTTP Streamable) running on http://localhost:${port}/mcp`);
    console.error(`Connected to: ${config.siteUrl}`);
    console.error('\nVS Code Configuration:');
    console.error(JSON.stringify({
      servers: {
        'wordpress-mcp': {
          type: 'http',
          url: `http://localhost:${port}/mcp`
        }
      }
    }, null, 2));
  });
}

// Main entry point
async function main() {
  const transport = process.env.MCP_TRANSPORT || 'stdio';
  
  if (transport === 'http') {
    await runHttpTransport();
  } else {
    await runStdioTransport();
  }
}

// Error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
