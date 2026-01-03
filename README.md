# WordPress MCP Server

> AI-powered WordPress management via Model Context Protocol

Connect AI assistants like **GitHub Copilot**, **Claude**, and others directly to your WordPress site. Create, edit, and manage content, analyze designs, optimize SEO, and control WooCommerce - all through natural language.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org)
[![MCP](https://img.shields.io/badge/MCP-Compatible-purple.svg)](https://modelcontextprotocol.io)

---

## ✨ Features

**190+ Tools** organized in 17 modules for complete WordPress control:

| Module | Tools | Description |
|--------|-------|-------------|
| 📝 **Content** | 13 | Posts, Pages, Media, Categories, Tags |
| 🧱 **Gutenberg** | 7 | Block Editor, Templates, Global Styles |
| 🎨 **Elementor** | 8 | Page Builder, Widgets, Containers |
| 🎯 **Design System** | 10 | Theme.json, Colors, Typography, Tokens |
| ♿ **Accessibility** | 12 | WCAG Checks, Headings, Contrast, Forms |
| 🔍 **SEO** | 9 | Yoast, RankMath, Schema, Keywords |
| 🛒 **WooCommerce** | 20 | Products, Orders, Customers, Coupons |
| 📋 **ACF** | 12 | Field Groups, Options, Repeaters |
| 🔄 **Revisions** | 7 | Version History, Restore, Compare |
| 💬 **Comments** | 7 | Moderation, Spam, Bulk Actions |
| 🌍 **Multilingual** | 12 | WPML, Polylang, TranslatePress |
| 🖼️ **Images** | 12 | Optimization, Alt-Text, Cleanup |
| 📬 **Forms** | 10 | CF7, WPForms, Gravity Forms |
| 👤 **Admin** | 19 | Users, Roles, Settings, Health |
| 🔐 **JWT Auth** | 7 | Token Management, Validation |
| 🔌 **REST API** | 5 | Custom Endpoints, Batch Operations |
| 🎭 **Themes** | 5 | Theme & Plugin Management |

---

## 🚀 Quick Start

### Installation

```bash
# Clone and install
git clone https://github.com/YOUR_USERNAME/wordpress-mcp-server.git
cd wordpress-mcp-server
npm install

# Interactive setup (creates .env file)
npm run init

# Start server
npm start
```

### Download Pre-built Release

Download the latest release from [Releases](../../releases) - no build step required:

```bash
# Extract and run
tar -xzf wordpress-mcp-server-v1.0.0.tar.gz
cd wordpress-mcp-server
npm run init
npm start
```

---

## 📋 Requirements

- **Node.js** 18.0.0 or higher
- **WordPress** with REST API enabled
- **Application Password** (WordPress 5.6+)

### Create Application Password

1. Go to **WordPress Admin → Users → Your Profile**
2. Scroll to **Application Passwords**
3. Enter a name (e.g., "MCP Server")
4. Click **Add New Application Password**
5. Copy the generated password (shown only once!)

---

## ⚙️ Configuration

### Option 1: Interactive Setup (Recommended)

```bash
npm run init
```

This wizard will:
- Ask for your WordPress URL and credentials
- Test the connection automatically
- Create a `.env` file with your settings

### Option 2: Manual Configuration

Create a `.env` file:

```bash
WORDPRESS_SITE_URL="https://your-site.com"
WORDPRESS_USERNAME="your-username"
WORDPRESS_APP_PASSWORD="xxxx xxxx xxxx xxxx xxxx xxxx"
```

### Option 3: Environment Variables

```bash
export WORDPRESS_SITE_URL="https://your-site.com"
export WORDPRESS_USERNAME="your-username"
export WORDPRESS_APP_PASSWORD="xxxx xxxx xxxx xxxx xxxx xxxx"
```

---

## 🔌 VS Code Integration

### STDIO Transport (Default)

Add to your VS Code `settings.json`:

```json
{
  "mcp.servers": {
    "wordpress": {
      "command": "node",
      "args": ["/path/to/wordpress-mcp-server/dist/server.js"],
      "env": {
        "WORDPRESS_SITE_URL": "https://your-site.com",
        "WORDPRESS_USERNAME": "your-username",
        "WORDPRESS_APP_PASSWORD": "xxxx xxxx xxxx xxxx xxxx xxxx"
      }
    }
  }
}
```

### HTTP Transport (Direct Connection)

Start the server in HTTP mode:

```bash
npm run start:http
# Server runs on http://localhost:3000
```

Configure VS Code:

```json
{
  "mcp.servers": {
    "wordpress": {
      "type": "http",
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

**Generate config automatically:**

```bash
npm run vscode:config        # STDIO config
npm run vscode:config:http   # HTTP config
```

---

## 🛠️ CLI Commands

| Command | Description |
|---------|-------------|
| `npm run init` | Interactive setup wizard |
| `npm run test:connection` | Test WordPress connection |
| `npm run info` | Show configuration & available tools |
| `npm run vscode:config` | Generate VS Code config (STDIO) |
| `npm run vscode:config:http` | Generate VS Code config (HTTP) |
| `npm start` | Start server (STDIO transport) |
| `npm run start:http` | Start server (HTTP transport) |
| `npm run build` | Build from TypeScript |
| `npm run dev` | Development mode with auto-reload |

---

## 📚 Tool Reference

### Content Management

| Tool | Description |
|------|-------------|
| `wp_list_posts` | List posts with filters (status, category, author) |
| `wp_get_post` | Get single post with content |
| `wp_create_post` | Create new post |
| `wp_update_post` | Update existing post |
| `wp_delete_post` | Delete post (trash or permanent) |
| `wp_list_pages` | List all pages |
| `wp_get_page` | Get single page |
| `wp_create_page` | Create new page |
| `wp_update_page` | Update existing page |
| `wp_list_media` | List media library items |
| `wp_get_media` | Get media details |
| `wp_list_categories` | List categories |
| `wp_list_tags` | List tags |

### Gutenberg Block Editor

| Tool | Description |
|------|-------------|
| `gutenberg_list_block_types` | List all registered block types |
| `gutenberg_list_reusable_blocks` | List reusable blocks |
| `gutenberg_parse_blocks` | Parse HTML into block structure |
| `gutenberg_generate_block` | Generate block HTML from config |
| `gutenberg_list_templates` | List block templates (FSE) |
| `gutenberg_list_template_parts` | List template parts |
| `gutenberg_get_global_styles` | Get global styles (theme.json) |

### Elementor Page Builder

| Tool | Description |
|------|-------------|
| `elementor_get_page_data` | Get complete Elementor data structure |
| `elementor_analyze_structure` | Analyze page structure |
| `elementor_list_widgets` | List all widgets on page |
| `elementor_get_widget` | Get widget details |
| `elementor_generate_widget` | Generate widget configuration |
| `elementor_generate_section` | Create section with columns |
| `elementor_generate_container` | Create flexbox container |
| `elementor_common_widgets` | Get common widget examples |

### Design System

| Tool | Description |
|------|-------------|
| `design_get_theme_json` | Get complete theme.json config |
| `design_get_colors` | Get color palette (theme + custom) |
| `design_get_typography` | Get typography settings |
| `design_get_spacing` | Get spacing scale |
| `design_export_tokens` | Export design tokens (CSS/SCSS/JSON/Tailwind) |
| `design_get_css_variables` | Generate CSS custom properties |
| `design_analyze_page_layout` | Analyze existing page layout |
| `elementor_get_global_colors` | Get Elementor global colors |
| `elementor_get_global_fonts` | Get Elementor global fonts |
| `elementor_get_kit_settings` | Get Elementor kit settings |

### Accessibility & UX

| Tool | Description |
|------|-------------|
| `a11y_check_headings` | Check heading hierarchy |
| `a11y_check_images` | Analyze image alt texts |
| `a11y_check_contrast` | Check color contrast (WCAG) |
| `a11y_check_forms` | Analyze form accessibility |
| `a11y_check_landmarks` | Check ARIA landmarks |
| `a11y_full_report` | Generate complete A11Y report |
| `ux_readability_score` | Calculate readability metrics |
| `ux_mobile_check` | Check mobile optimization |
| `ux_cta_analysis` | Analyze call-to-action elements |
| `ux_page_speed_indicators` | Get performance indicators |
| `ux_content_analysis` | Analyze content structure |
| `perf_analyze_images` | Analyze image optimization |

### SEO Tools

| Tool | Description |
|------|-------------|
| `seo_get_yoast_meta` | Get Yoast SEO meta data |
| `seo_update_yoast_meta` | Update Yoast SEO meta data |
| `seo_get_rankmath_meta` | Get RankMath meta data |
| `seo_analyze_keywords` | Analyze keyword usage |
| `seo_generate_schema` | Generate Schema.org JSON-LD |
| `seo_social_preview` | Get social media previews |
| `seo_bulk_analyze` | Bulk analyze multiple posts |
| `seo_get_sitemap_info` | Get sitemap information |
| `seo_content_score` | Calculate content SEO score |

### WooCommerce

| Tool | Description |
|------|-------------|
| `woo_list_products` | List products with filters |
| `woo_get_product` | Get product details |
| `woo_create_product` | Create new product |
| `woo_update_product` | Update product |
| `woo_delete_product` | Delete product |
| `woo_list_variations` | List product variations |
| `woo_create_variation` | Create variation |
| `woo_list_orders` | List orders |
| `woo_get_order` | Get order details |
| `woo_update_order_status` | Update order status |
| `woo_list_customers` | List customers |
| `woo_get_customer` | Get customer details |
| `woo_list_coupons` | List coupons |
| `woo_create_coupon` | Create coupon |
| `woo_get_reports` | Get sales reports |
| `woo_get_settings` | Get shop settings |
| `woo_list_payment_gateways` | List payment methods |
| `woo_list_shipping_zones` | List shipping zones |
| `woo_list_categories` | List product categories |
| `woo_list_attributes` | List product attributes |

### ACF (Advanced Custom Fields)

| Tool | Description |
|------|-------------|
| `acf_list_field_groups` | List all field groups |
| `acf_get_field_group` | Get field group details |
| `acf_get_post_fields` | Get ACF fields for post |
| `acf_update_post_fields` | Update ACF fields |
| `acf_get_options` | Get options page values |
| `acf_update_options` | Update options page |
| `acf_get_user_fields` | Get user ACF fields |
| `acf_update_user_fields` | Update user ACF fields |
| `acf_get_term_fields` | Get taxonomy term fields |
| `acf_update_term_fields` | Update term fields |
| `acf_get_repeater` | Get repeater field data |
| `acf_bulk_get_fields` | Bulk get fields for multiple posts |

### Revisions & Comments

| Tool | Description |
|------|-------------|
| `revision_list` | List post revisions |
| `revision_get` | Get revision details |
| `revision_compare` | Compare two revisions |
| `revision_restore` | Restore to revision |
| `revision_delete` | Delete revision |
| `revision_autosave_get` | Get autosave |
| `revision_cleanup` | Bulk cleanup old revisions |
| `comment_list` | List comments |
| `comment_get` | Get comment details |
| `comment_create` | Create comment |
| `comment_update` | Update comment |
| `comment_delete` | Delete comment |
| `comment_moderate` | Approve/spam/trash comment |
| `comment_bulk_moderate` | Bulk moderate comments |

### Multilingual

| Tool | Description |
|------|-------------|
| `wpml_get_languages` | Get WPML languages |
| `wpml_get_translations` | Get post translations |
| `wpml_get_untranslated` | Find untranslated posts |
| `wpml_duplicate_for_translation` | Create translation copy |
| `polylang_get_languages` | Get Polylang languages |
| `polylang_get_translations` | Get post translations |
| `polylang_set_translation` | Link translations |
| `polylang_get_untranslated` | Find untranslated posts |
| `translatepress_get_languages` | Get TranslatePress languages |
| `translatepress_get_strings` | Get translatable strings |
| `ml_detect_plugin` | Detect multilingual plugin |
| `ml_translation_status` | Get translation status |

### Image Tools

| Tool | Description |
|------|-------------|
| `image_get_details` | Get image with EXIF data |
| `image_list_sizes` | List registered image sizes |
| `image_analyze_optimization` | Analyze optimization status |
| `image_regenerate_thumbnails` | Regenerate image sizes |
| `image_find_unused` | Find unused images |
| `image_delete_unused` | Delete unused images |
| `image_bulk_alt_update` | Bulk update alt texts |
| `image_set_focal_point` | Set image focal point |
| `image_get_missing_alt` | Find images without alt text |
| `image_optimize_check` | Check optimization potential |
| `image_duplicate_check` | Find duplicate images |
| `image_library_stats` | Get media library statistics |

### Form Builders

| Tool | Description |
|------|-------------|
| `cf7_list_forms` | List Contact Form 7 forms |
| `cf7_get_form` | Get CF7 form details |
| `cf7_generate_css` | Generate form CSS |
| `wpforms_list_forms` | List WPForms |
| `wpforms_get_form` | Get WPForms form details |
| `wpforms_list_entries` | List form entries |
| `gravity_list_forms` | List Gravity Forms |
| `gravity_get_form` | Get Gravity Forms details |
| `gravity_list_entries` | List form entries |
| `gravity_get_stats` | Get form statistics |

### Admin & Users

| Tool | Description |
|------|-------------|
| `admin_get_settings` | Get WordPress settings |
| `admin_update_settings` | Update settings |
| `admin_get_option` | Get option value |
| `admin_update_option` | Update option |
| `admin_list_users` | List users |
| `admin_get_user` | Get user details |
| `admin_create_user` | Create new user |
| `admin_update_user` | Update user |
| `admin_delete_user` | Delete user |
| `admin_list_roles` | List roles & capabilities |
| `admin_list_app_passwords` | List application passwords |
| `admin_create_app_password` | Create app password |
| `admin_delete_app_password` | Delete app password |
| `admin_site_health` | Get Site Health status |
| `admin_system_info` | Get system information |
| `admin_export_content` | Prepare content export |
| `admin_flush_cache` | Flush caches |
| `admin_maintenance_mode` | Toggle maintenance mode |
| `admin_transients_cleanup` | Clean expired transients |

### JWT Authentication

| Tool | Description |
|------|-------------|
| `jwt_authenticate` | Get JWT token |
| `jwt_validate` | Validate token |
| `jwt_refresh` | Refresh token |
| `jwt_token_info` | Decode token info |
| `jwt_set_token` | Set token for session |
| `jwt_check_plugin` | Check JWT plugin status |
| `auth_status` | Get authentication status |

### REST API

| Tool | Description |
|------|-------------|
| `rest_api_list_endpoints` | List all REST endpoints |
| `rest_api_get_endpoint` | Get endpoint details |
| `rest_api_execute` | Execute custom request |
| `rest_api_batch` | Batch multiple requests |
| `rest_api_search` | WordPress-wide search |

### Themes & Plugins

| Tool | Description |
|------|-------------|
| `wp_list_themes` | List installed themes |
| `wp_list_plugins` | List installed plugins |
| `wp_list_sidebars` | List widget areas |
| `wp_list_menus` | List navigation menus |
| `wp_get_menu` | Get menu with items |

---

## 🔐 Authentication

### Application Passwords (Recommended)

Built into WordPress 5.6+. No plugins required.

```bash
WORDPRESS_APP_PASSWORD="xxxx xxxx xxxx xxxx xxxx xxxx"
```

### JWT Authentication (Optional)

For token-based auth, install a JWT plugin:

1. Install [JWT Authentication for WP REST API](https://wordpress.org/plugins/jwt-authentication-for-wp-rest-api/)

2. Add to `wp-config.php`:
```php
define('JWT_AUTH_SECRET_KEY', 'your-secret-key');
define('JWT_AUTH_CORS_ENABLE', true);
```

3. Configure:
```bash
WORDPRESS_AUTH_MODE="jwt"
WORDPRESS_JWT_TOKEN="eyJ0eXAiOiJKV1..."
```

---

## 🏗️ Building from Source

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run in development mode
npm run dev
```

---

## 📦 Creating a Release

```bash
# Build the project
npm run build

# Create release archive
tar -czf wordpress-mcp-server-v1.0.0.tar.gz \
  dist/ \
  package.json \
  package-lock.json \
  .env.example \
  README.md \
  LICENSE
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🔗 Links

- [Model Context Protocol](https://modelcontextprotocol.io)
- [WordPress REST API Handbook](https://developer.wordpress.org/rest-api/)
- [GitHub Copilot](https://github.com/features/copilot)

---

**Made with ❤️ for the WordPress & AI community**
