# WordPress MCP Server - Konfigurationsoptionen und Erweiterungsmöglichkeiten

## 📋 Weitere Optionen und Erweiterungen

Dieses Dokument beschreibt zusätzliche Möglichkeiten, den WordPress MCP Server zu erweitern und anzupassen.

---

## 1. WP-CLI Integration

### Warum WP-CLI?
WP-CLI ermöglicht direkte Server-Befehle und ist ideal für:
- Plugin/Theme Installation
- Datenbankoperationen
- Cache-Verwaltung
- Backup-Operationen

### Implementierung
```typescript
// src/tools/wpcli.ts
server.registerTool(
  'wpcli_execute',
  {
    title: 'WP-CLI Befehl ausführen',
    description: 'Führt einen WP-CLI Befehl auf dem Server aus (erfordert SSH-Zugang)',
    inputSchema: {
      command: z.string().describe('WP-CLI Befehl ohne "wp" Präfix'),
      path: z.string().optional().describe('WordPress-Installationspfad'),
    }
  },
  async ({ command, path }) => {
    // Implementierung via SSH oder lokale Ausführung
  }
);
```

### Mögliche Tools
- `wpcli_plugin_install` - Plugin installieren
- `wpcli_plugin_activate` - Plugin aktivieren
- `wpcli_cache_flush` - Cache leeren
- `wpcli_db_export` - Datenbank exportieren
- `wpcli_search_replace` - Suchen & Ersetzen
- `wpcli_theme_activate` - Theme aktivieren

---

## 2. Custom Post Types & Custom Fields

### ACF (Advanced Custom Fields) Integration
```typescript
server.registerTool(
  'acf_get_fields',
  {
    title: 'ACF Felder abrufen',
    description: 'Holt alle ACF-Felder eines Posts',
    inputSchema: {
      postId: z.number(),
    }
  },
  async ({ postId }) => {
    // GET /wp-json/acf/v3/posts/{id}
  }
);
```

### Custom Post Types
```typescript
server.registerTool(
  'wp_list_post_types',
  {
    title: 'Custom Post Types auflisten',
    description: 'Zeigt alle registrierten Post Types an',
  }
);

server.registerTool(
  'wp_get_custom_posts',
  {
    title: 'Custom Posts abrufen',
    inputSchema: {
      postType: z.string().describe('Post Type Slug'),
    }
  }
);
```

---

## 3. WooCommerce Integration

Für E-Commerce-Websites:

```typescript
// Produkte
'woo_list_products'     // Produkte auflisten
'woo_get_product'       // Produktdetails
'woo_update_product'    // Produkt aktualisieren
'woo_update_price'      // Preis ändern
'woo_update_stock'      // Lagerbestand ändern

// Bestellungen
'woo_list_orders'       // Bestellungen auflisten
'woo_get_order'         // Bestelldetails
'woo_update_order_status' // Status ändern

// Kunden
'woo_list_customers'    // Kunden auflisten
'woo_get_customer'      // Kundendetails

// Berichte
'woo_sales_report'      // Verkaufsberichte
'woo_top_products'      // Meistverkaufte Produkte
```

---

## 4. SEO Tools

### Yoast SEO Integration
```typescript
'yoast_get_meta'        // SEO Meta-Daten abrufen
'yoast_update_meta'     // Meta-Daten aktualisieren
'yoast_analyze_content' // Content-Analyse
'yoast_get_sitemap'     // Sitemap abrufen
```

### Rank Math Integration
```typescript
'rankmath_get_score'    // SEO Score abrufen
'rankmath_update_meta'  // Meta-Daten aktualisieren
```

---

## 5. Multisite Support

```typescript
'wpmu_list_sites'       // Alle Sites im Netzwerk
'wpmu_switch_site'      // Site wechseln
'wpmu_get_site_info'    // Site-Informationen
'wpmu_create_site'      // Neue Site erstellen
```

---

## 6. Performance & Caching

```typescript
'cache_purge_all'       // Gesamten Cache leeren
'cache_purge_post'      // Post-Cache leeren
'cache_warm'            // Cache aufwärmen
'performance_check'     // Performance-Check
```

### Cache-Plugin Support
- WP Super Cache
- W3 Total Cache
- LiteSpeed Cache
- WP Rocket

---

## 7. Backup & Restore

```typescript
'backup_create'         // Backup erstellen
'backup_list'           // Backups auflisten
'backup_restore'        // Backup wiederherstellen
'backup_download'       // Backup herunterladen
```

---

## 8. Form Builder Integration

### Contact Form 7
```typescript
'cf7_list_forms'        // Formulare auflisten
'cf7_get_form'          // Formular-Details
'cf7_get_submissions'   // Einreichungen abrufen
```

### WPForms / Gravity Forms
```typescript
'forms_list'            // Formulare auflisten
'forms_get_entries'     // Einträge abrufen
'forms_export_entries'  // Einträge exportieren
```

---

## 9. Bildoptimierung

```typescript
'image_optimize'        // Bild optimieren
'image_resize'          // Bild skalieren
'image_bulk_optimize'   // Mehrere Bilder optimieren
'image_generate_webp'   // WebP Version erstellen
```

---

## 10. Sicherheits-Tools

```typescript
'security_scan'         // Sicherheits-Scan
'security_check_updates' // Update-Check
'security_list_failed_logins' // Fehlgeschlagene Logins
'security_block_ip'     // IP blockieren
```

---

## 11. Analytics Integration

### Google Analytics / Site Kit
```typescript
'analytics_get_pageviews'   // Seitenaufrufe
'analytics_get_traffic'     // Traffic-Daten
'analytics_top_pages'       // Top-Seiten
```

---

## 12. Deployment & Staging

```typescript
'staging_create'        // Staging-Umgebung erstellen
'staging_push'          // Änderungen pushen
'staging_pull'          // Änderungen ziehen
'staging_sync_db'       // Datenbank synchronisieren
```

---

## 🔌 WordPress Plugin für erweiterte REST API

Für maximale Funktionalität empfehlen wir ein begleitendes WordPress-Plugin:

```php
<?php
/**
 * Plugin Name: MCP Server Extensions
 * Description: Erweitert die REST API für MCP Server Integration
 */

// Elementor Data Endpoint
add_action('rest_api_init', function () {
    register_rest_route('mcp/v1', '/elementor/(?P<id>\d+)', array(
        'methods' => 'GET',
        'callback' => 'mcp_get_elementor_data',
        'permission_callback' => function() {
            return current_user_can('edit_posts');
        }
    ));
    
    register_rest_route('mcp/v1', '/elementor/(?P<id>\d+)', array(
        'methods' => 'POST',
        'callback' => 'mcp_update_elementor_data',
        'permission_callback' => function() {
            return current_user_can('edit_posts');
        }
    ));
});

function mcp_get_elementor_data($request) {
    $post_id = $request['id'];
    $document = \Elementor\Plugin::$instance->documents->get($post_id);
    
    if (!$document) {
        return new WP_Error('not_found', 'Elementor document not found', array('status' => 404));
    }
    
    return array(
        'content' => $document->get_elements_data(),
        'settings' => $document->get_settings(),
        'version' => ELEMENTOR_VERSION
    );
}

function mcp_update_elementor_data($request) {
    $post_id = $request['id'];
    $data = $request->get_json_params();
    
    // Update Elementor data
    update_post_meta($post_id, '_elementor_data', wp_slash(json_encode($data['content'])));
    
    // Clear Elementor cache
    \Elementor\Plugin::$instance->files_manager->clear_cache();
    
    return array('success' => true);
}
```

---

## 🎯 Empfohlene Implementierungsreihenfolge

1. **Phase 1** (Basis) ✅
   - WordPress REST API Client
   - Posts/Pages/Media Management
   - Gutenberg Blocks
   - Elementor Basics

2. **Phase 2** (Erweiterung)
   - Custom Post Types
   - ACF Integration
   - WooCommerce (falls vorhanden)
   - SEO Tools

3. **Phase 3** (Fortgeschritten)
   - WP-CLI Integration
   - Backup/Restore
   - Performance Tools
   - Security Scans

4. **Phase 4** (Enterprise)
   - Multisite Support
   - Staging/Deployment
   - Analytics
   - Custom Plugin Development

---

## 📝 Konfigurationsbeispiel für Multiple Sites

```json
{
  "mcp.servers": {
    "wordpress-production": {
      "command": "node",
      "args": ["/path/to/dist/index.js"],
      "env": {
        "WORDPRESS_SITE_URL": "https://production.example.com",
        "WORDPRESS_USERNAME": "admin",
        "WORDPRESS_APP_PASSWORD": "xxxx xxxx xxxx"
      }
    },
    "wordpress-staging": {
      "command": "node",
      "args": ["/path/to/dist/index.js"],
      "env": {
        "WORDPRESS_SITE_URL": "https://staging.example.com",
        "WORDPRESS_USERNAME": "admin",
        "WORDPRESS_APP_PASSWORD": "yyyy yyyy yyyy"
      }
    }
  }
}
```

---

## 🔗 Nützliche Ressourcen

- [WordPress REST API Handbook](https://developer.wordpress.org/rest-api/)
- [Elementor Developers Docs](https://developers.elementor.com/docs/)
- [Gutenberg Block Editor Handbook](https://developer.wordpress.org/block-editor/)
- [WP-CLI Documentation](https://developer.wordpress.org/cli/commands/)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
