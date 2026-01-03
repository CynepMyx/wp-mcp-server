#!/usr/bin/env node
/**
 * WordPress MCP CLI
 * Vereinfachte Einrichtung und Verwaltung des MCP Servers
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import chalk from 'chalk';

const program = new Command();

// Helper: Readline Interface für interaktive Eingabe
function createReadlineInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

// Helper: Frage stellen und Antwort abwarten
async function ask(rl: readline.Interface, question: string, defaultValue?: string): Promise<string> {
  return new Promise((resolve) => {
    const prompt = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `;
    rl.question(prompt, (answer) => {
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

// Helper: WordPress-Verbindung testen
async function testWordPressConnection(siteUrl: string, username: string, appPassword: string): Promise<{
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}> {
  const authHeader = 'Basic ' + Buffer.from(`${username}:${appPassword}`).toString('base64');
  
  try {
    // Test 1: Site erreichbar?
    const siteResponse = await fetch(`${siteUrl}/wp-json/`);
    if (!siteResponse.ok) {
      return { 
        success: false, 
        message: `Site nicht erreichbar: ${siteResponse.status} ${siteResponse.statusText}` 
      };
    }
    
    const siteData = await siteResponse.json() as { name?: string; description?: string; namespaces?: string[] };
    
    // Test 2: Authentifizierung funktioniert?
    const authResponse = await fetch(`${siteUrl}/wp-json/wp/v2/users/me`, {
      headers: { 'Authorization': authHeader },
    });
    
    if (!authResponse.ok) {
      return { 
        success: false, 
        message: `Authentifizierung fehlgeschlagen: ${authResponse.status}. Prüfe Username und Application Password.` 
      };
    }
    
    const userData = await authResponse.json() as { id: number; name: string; roles: string[] };
    
    return {
      success: true,
      message: 'Verbindung erfolgreich!',
      details: {
        siteName: siteData.name,
        siteDescription: siteData.description,
        restApiNamespaces: siteData.namespaces?.length || 0,
        userId: userData.id,
        userName: userData.name,
        userRoles: userData.roles,
      },
    };
  } catch (error) {
    return { 
      success: false, 
      message: `Verbindungsfehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}` 
    };
  }
}

// ============================================
// CLI COMMANDS
// ============================================

program
  .name('wp-mcp')
  .description('WordPress MCP Server - CLI Tool')
  .version('1.0.0');

// INIT Command - Interaktives Setup
program
  .command('init')
  .description('Interaktives Setup - erstellt .env Datei mit WordPress-Credentials')
  .option('-f, --force', 'Überschreibe existierende .env Datei')
  .action(async (options) => {
    console.log(chalk.blue.bold('\n🚀 WordPress MCP Server - Setup\n'));
    
    const envPath = path.join(process.cwd(), '.env');
    
    if (fs.existsSync(envPath) && !options.force) {
      console.log(chalk.yellow('⚠️  .env Datei existiert bereits.'));
      console.log('   Verwende --force zum Überschreiben oder bearbeite die Datei manuell.\n');
      process.exit(1);
    }
    
    const rl = createReadlineInterface();
    
    console.log(chalk.gray('Gib deine WordPress-Verbindungsdaten ein:\n'));
    
    const siteUrl = await ask(rl, 'WordPress Site URL (z.B. https://example.com)');
    const username = await ask(rl, 'WordPress Username');
    const appPassword = await ask(rl, 'Application Password');
    
    console.log(chalk.gray('\nOptionale Einstellungen (Enter für Standard):\n'));
    
    const authMode = await ask(rl, 'Auth-Modus (basic/jwt)', 'basic');
    const httpPort = await ask(rl, 'HTTP Server Port', '3000');
    
    rl.close();
    
    // Verbindung testen
    console.log(chalk.gray('\n🔍 Teste Verbindung...\n'));
    
    const testResult = await testWordPressConnection(siteUrl, username, appPassword);
    
    if (testResult.success) {
      console.log(chalk.green('✅ ' + testResult.message));
      if (testResult.details) {
        console.log(chalk.gray(`   Site: ${testResult.details.siteName}`));
        console.log(chalk.gray(`   User: ${testResult.details.userName} (${(testResult.details.userRoles as string[]).join(', ')})`));
        console.log(chalk.gray(`   REST API: ${testResult.details.restApiNamespaces} Namespaces`));
      }
    } else {
      console.log(chalk.red('❌ ' + testResult.message));
      console.log(chalk.yellow('\n⚠️  .env wird trotzdem erstellt. Überprüfe die Daten.\n'));
    }
    
    // .env Datei erstellen
    const envContent = `# WordPress MCP Server Konfiguration
# Erstellt am ${new Date().toISOString()}

# WordPress Verbindung
WORDPRESS_SITE_URL="${siteUrl}"
WORDPRESS_USERNAME="${username}"
WORDPRESS_APP_PASSWORD="${appPassword}"

# Authentifizierungsmodus (basic oder jwt)
WORDPRESS_AUTH_MODE="${authMode}"

# HTTP Server (für VS Code direkte Verbindung)
MCP_HTTP_PORT="${httpPort}"

# Optional: JWT Token (falls auth_mode=jwt)
# WORDPRESS_JWT_TOKEN=""
`;
    
    fs.writeFileSync(envPath, envContent);
    
    console.log(chalk.green('\n✅ .env Datei erstellt!\n'));
    console.log(chalk.blue('Nächste Schritte:'));
    console.log(chalk.gray('  1. Server starten:  npm start'));
    console.log(chalk.gray('  2. Oder HTTP-Modus: npm run start:http'));
    console.log(chalk.gray('  3. VS Code konfigurieren (siehe README.md)\n'));
  });

// TEST Command - Verbindung testen
program
  .command('test')
  .description('Testet die WordPress-Verbindung mit aktuellen Credentials')
  .action(async () => {
    console.log(chalk.blue.bold('\n🔍 WordPress Verbindungstest\n'));
    
    // .env laden falls vorhanden
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      for (const line of envContent.split('\n')) {
        const match = line.match(/^([^#=]+)=["']?([^"']+)["']?$/);
        if (match) {
          process.env[match[1].trim()] = match[2].trim();
        }
      }
    }
    
    const siteUrl = process.env.WORDPRESS_SITE_URL;
    const username = process.env.WORDPRESS_USERNAME;
    const appPassword = process.env.WORDPRESS_APP_PASSWORD;
    
    if (!siteUrl || !username || !appPassword) {
      console.log(chalk.red('❌ Fehlende Umgebungsvariablen!'));
      console.log(chalk.gray('   Führe erst "wp-mcp init" aus oder setze die Variablen manuell.\n'));
      process.exit(1);
    }
    
    console.log(chalk.gray(`Site: ${siteUrl}`));
    console.log(chalk.gray(`User: ${username}\n`));
    
    const result = await testWordPressConnection(siteUrl, username, appPassword);
    
    if (result.success) {
      console.log(chalk.green('✅ ' + result.message + '\n'));
      if (result.details) {
        console.log(chalk.white('Site-Details:'));
        console.log(chalk.gray(`  Name: ${result.details.siteName}`));
        console.log(chalk.gray(`  Beschreibung: ${result.details.siteDescription}`));
        console.log(chalk.gray(`  REST API Namespaces: ${result.details.restApiNamespaces}`));
        console.log(chalk.white('\nBenutzer:'));
        console.log(chalk.gray(`  ID: ${result.details.userId}`));
        console.log(chalk.gray(`  Name: ${result.details.userName}`));
        console.log(chalk.gray(`  Rollen: ${(result.details.userRoles as string[]).join(', ')}`));
      }
      console.log(chalk.green('\n✅ Server kann gestartet werden!\n'));
    } else {
      console.log(chalk.red('❌ ' + result.message));
      console.log(chalk.yellow('\nMögliche Lösungen:'));
      console.log(chalk.gray('  - Überprüfe die Site-URL (mit https://)'));
      console.log(chalk.gray('  - Prüfe ob REST API aktiviert ist'));
      console.log(chalk.gray('  - Erstelle ein neues Application Password'));
      console.log(chalk.gray('  - Führe "wp-mcp init" erneut aus\n'));
      process.exit(1);
    }
  });

// INFO Command - Zeigt Konfiguration
program
  .command('info')
  .description('Zeigt aktuelle Konfiguration und verfügbare Tools')
  .action(() => {
    console.log(chalk.blue.bold('\n📋 WordPress MCP Server Info\n'));
    
    // .env laden
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      for (const line of envContent.split('\n')) {
        const match = line.match(/^([^#=]+)=["']?([^"']+)["']?$/);
        if (match) {
          process.env[match[1].trim()] = match[2].trim();
        }
      }
    }
    
    console.log(chalk.white('Konfiguration:'));
    console.log(chalk.gray(`  Site URL: ${process.env.WORDPRESS_SITE_URL || '(nicht gesetzt)'}`));
    console.log(chalk.gray(`  Username: ${process.env.WORDPRESS_USERNAME || '(nicht gesetzt)'}`));
    console.log(chalk.gray(`  App Password: ${process.env.WORDPRESS_APP_PASSWORD ? '********' : '(nicht gesetzt)'}`));
    console.log(chalk.gray(`  Auth Mode: ${process.env.WORDPRESS_AUTH_MODE || 'basic'}`));
    console.log(chalk.gray(`  HTTP Port: ${process.env.MCP_HTTP_PORT || '3000'}`));
    
    console.log(chalk.white('\nVerfügbare Tool-Module (~190 Tools):'));
    const modules = [
      ['Content', 'Posts, Pages, Media, Categories, Tags'],
      ['Gutenberg', 'Block-Editor, Templates, Global Styles'],
      ['Elementor', 'Page Builder, Widgets, Global Settings'],
      ['Themes/Plugins', 'Theme & Plugin Management'],
      ['REST API', 'Generische CRUD Operations'],
      ['Design System', 'Tokens, Colors, Typography, Spacing'],
      ['Accessibility', 'A11Y Checks, Reports, WCAG'],
      ['SEO', 'Yoast, RankMath, Schema.org'],
      ['WooCommerce', 'Products, Orders, Customers'],
      ['ACF', 'Advanced Custom Fields'],
      ['Multilingual', 'WPML, Polylang, TranslatePress'],
      ['Image Tools', 'Optimization, Alt-Text, Unused'],
      ['Forms', 'CF7, WPForms, Gravity Forms'],
      ['Admin', 'Users, Settings, Site Health'],
      ['JWT Auth', 'Token Authentication'],
    ];
    
    for (const [name, desc] of modules) {
      console.log(chalk.cyan(`  • ${name}`) + chalk.gray(` - ${desc}`));
    }
    
    console.log(chalk.white('\nStarten:'));
    console.log(chalk.gray('  STDIO Mode:  npm start'));
    console.log(chalk.gray('  HTTP Mode:   npm run start:http'));
    console.log(chalk.gray('  Dev Mode:    npm run dev\n'));
  });

// VSCODE Command - Generiert VS Code Config
program
  .command('vscode')
  .description('Generiert VS Code MCP Konfiguration')
  .option('-m, --mode <mode>', 'Transport-Modus: stdio oder http', 'stdio')
  .action((options) => {
    console.log(chalk.blue.bold('\n⚙️  VS Code Konfiguration\n'));
    
    // .env laden
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      for (const line of envContent.split('\n')) {
        const match = line.match(/^([^#=]+)=["']?([^"']+)["']?$/);
        if (match) {
          process.env[match[1].trim()] = match[2].trim();
        }
      }
    }
    
    const cwd = process.cwd();
    
    if (options.mode === 'http') {
      const port = process.env.MCP_HTTP_PORT || '3000';
      console.log(chalk.white('Füge dies zu deiner VS Code settings.json hinzu:\n'));
      console.log(chalk.gray('// Starte erst: npm run start:http'));
      console.log(chalk.yellow(JSON.stringify({
        "mcp.servers": {
          "wordpress": {
            "type": "http",
            "url": `http://localhost:${port}/mcp`
          }
        }
      }, null, 2)));
    } else {
      console.log(chalk.white('Füge dies zu deiner VS Code settings.json hinzu:\n'));
      console.log(chalk.yellow(JSON.stringify({
        "mcp.servers": {
          "wordpress": {
            "command": "node",
            "args": [`${cwd}/dist/server.js`],
            "env": {
              "WORDPRESS_SITE_URL": process.env.WORDPRESS_SITE_URL || "https://your-site.com",
              "WORDPRESS_USERNAME": process.env.WORDPRESS_USERNAME || "your-username",
              "WORDPRESS_APP_PASSWORD": process.env.WORDPRESS_APP_PASSWORD || "xxxx xxxx xxxx"
            }
          }
        }
      }, null, 2)));
    }
    
    console.log(chalk.gray('\n📁 Öffne VS Code Settings: Cmd+Shift+P → "Preferences: Open Settings (JSON)"\n'));
  });

// START Command - Server starten mit .env
program
  .command('start')
  .description('Startet den MCP Server')
  .option('-m, --mode <mode>', 'Transport-Modus: stdio oder http', 'stdio')
  .action(async (options) => {
    // .env laden
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      for (const line of envContent.split('\n')) {
        const match = line.match(/^([^#=]+)=["']?([^"']+)["']?$/);
        if (match) {
          process.env[match[1].trim()] = match[2].trim();
        }
      }
    }
    
    if (options.mode === 'http') {
      process.env.MCP_TRANSPORT = 'http';
    }
    
    // Dynamisch Server importieren und starten
    await import('./server.js');
  });

program.parse();
