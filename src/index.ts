/**
 * WordPress MCP Server - Main Entry Point
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { WordPressClient } from './wordpress/client.js';
import { WordPressConfig } from './config/types.js';
import { registerContentTools } from './tools/content.js';
import { registerGutenbergTools } from './tools/gutenberg.js';
import { registerElementorTools } from './tools/elementor.js';
import { registerThemePluginTools } from './tools/themes-plugins.js';

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
    siteUrl: siteUrl.replace(/\/$/, ''), // Remove trailing slash
    username,
    applicationPassword,
    restApiBase: process.env.WORDPRESS_REST_API_BASE || '/wp-json/wp/v2',
  };
}

async function main() {
  // Initialize configuration
  const config = getConfig();
  
  // Initialize WordPress client
  const wpClient = new WordPressClient(config);
  
  // Create MCP server
  const server = new McpServer({
    name: 'wordpress-mcp-server',
    version: '1.0.0',
  });

  // Register all tools
  console.error('Registering WordPress content tools...');
  registerContentTools(server, wpClient);
  
  console.error('Registering Gutenberg block tools...');
  registerGutenbergTools(server, wpClient);
  
  console.error('Registering Elementor tools...');
  registerElementorTools(server, wpClient);
  
  console.error('Registering theme/plugin tools...');
  registerThemePluginTools(server, wpClient);

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

  // Connect via stdio transport (for VS Code integration)
  console.error('Starting WordPress MCP Server...');
  console.error(`Connected to: ${config.siteUrl}`);
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('WordPress MCP Server is running!');
}

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the server
main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
