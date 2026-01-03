<?php
/**
 * Plugin Name: WordPress MCP Server Extensions
 * Plugin URI: https://github.com/yourusername/wordpress-mcp-server
 * Description: Erweitert die WordPress REST API für die MCP Server Integration - ermöglicht erweiterten Zugriff auf Elementor, Gutenberg und weitere Funktionen. Inspiriert vom Automattic wordpress-mcp Plugin.
 * Version: 1.1.0
 * Author: Your Name
 * License: GPL v2 or later
 * Text Domain: wp-mcp-extensions
 * Requires at least: 6.0
 * Requires PHP: 7.4
 */

if (!defined('ABSPATH')) {
    exit;
}

// Plugin Version
define('WP_MCP_VERSION', '1.1.0');

/**
 * Main Plugin Class
 * Inspiriert vom Automattic WordPress-MCP Plugin Architektur
 */
class WP_MCP_Extensions {
    
    private static $instance = null;
    
    /** @var array Registered tools via hooks */
    private $custom_tools = array();
    
    /** @var array Registered resources via hooks */
    private $custom_resources = array();
    
    /** @var array Registered prompts via hooks */
    private $custom_prompts = array();
    
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        add_action('rest_api_init', array($this, 'register_rest_routes'));
        add_action('init', array($this, 'init_hooks'));
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
    }
    
    /**
     * Initialize hooks for extensibility
     * Other plugins can use these hooks to register custom MCP tools/resources
     */
    public function init_hooks() {
        // Allow other plugins to register tools
        do_action('wp_mcp_register_tools', $this);
        
        // Allow other plugins to register resources  
        do_action('wp_mcp_register_resources', $this);
        
        // Allow other plugins to register prompts
        do_action('wp_mcp_register_prompts', $this);
    }
    
    /**
     * Register a custom MCP tool
     * Usage: WPMCP()->register_tool($tool_config);
     */
    public function register_tool($config) {
        if (!isset($config['name']) || !isset($config['callback'])) {
            return false;
        }
        $this->custom_tools[$config['name']] = $config;
        return true;
    }
    
    /**
     * Register a custom MCP resource
     * Usage: WPMCP()->register_resource($resource_config);
     */
    public function register_resource($config) {
        if (!isset($config['uri']) || !isset($config['callback'])) {
            return false;
        }
        $this->custom_resources[$config['uri']] = $config;
        return true;
    }
    
    /**
     * Register a custom MCP prompt
     * Usage: WPMCP()->register_prompt($prompt_config);
     */
    public function register_prompt($config) {
        if (!isset($config['name']) || !isset($config['callback'])) {
            return false;
        }
        $this->custom_prompts[$config['name']] = $config;
        return true;
    }
    
    /**
     * Get all registered custom tools
     */
    public function get_custom_tools() {
        return $this->custom_tools;
    }
    
    /**
     * Get all registered custom resources
     */
    public function get_custom_resources() {
        return $this->custom_resources;
    }
    
    /**
     * Get all registered custom prompts
     */
    public function get_custom_prompts() {
        return $this->custom_prompts;
    }
    
    /**
     * Add admin menu
     */
    public function add_admin_menu() {
        add_options_page(
            'WordPress MCP',
            'WordPress MCP',
            'manage_options',
            'wp-mcp-settings',
            array($this, 'render_settings_page')
        );
    }
    
    /**
     * Register settings
     */
    public function register_settings() {
        register_setting('wp_mcp_settings', 'wp_mcp_enable_crud_tools');
        register_setting('wp_mcp_settings', 'wp_mcp_enable_create');
        register_setting('wp_mcp_settings', 'wp_mcp_enable_update');
        register_setting('wp_mcp_settings', 'wp_mcp_enable_delete');
        register_setting('wp_mcp_settings', 'wp_mcp_debug_mode');
    }
    
    /**
     * Render settings page
     */
    public function render_settings_page() {
        ?>
        <div class="wrap">
            <h1>WordPress MCP Server Extensions</h1>
            <p>Diese Einstellungen kontrollieren die MCP Server Integration.</p>
            
            <form method="post" action="options.php">
                <?php settings_fields('wp_mcp_settings'); ?>
                
                <h2>CRUD Operations</h2>
                <table class="form-table">
                    <tr>
                        <th scope="row">REST API CRUD Tools</th>
                        <td>
                            <label>
                                <input type="checkbox" name="wp_mcp_enable_crud_tools" value="1" 
                                    <?php checked(get_option('wp_mcp_enable_crud_tools'), 1); ?>>
                                Enable generic REST API CRUD tools (experimental)
                            </label>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Create Operations</th>
                        <td>
                            <label>
                                <input type="checkbox" name="wp_mcp_enable_create" value="1" 
                                    <?php checked(get_option('wp_mcp_enable_create', 1), 1); ?>>
                                Allow POST operations
                            </label>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Update Operations</th>
                        <td>
                            <label>
                                <input type="checkbox" name="wp_mcp_enable_update" value="1" 
                                    <?php checked(get_option('wp_mcp_enable_update', 1), 1); ?>>
                                Allow PUT/PATCH operations
                            </label>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Delete Operations</th>
                        <td>
                            <label>
                                <input type="checkbox" name="wp_mcp_enable_delete" value="1" 
                                    <?php checked(get_option('wp_mcp_enable_delete'), 1); ?>>
                                Allow DELETE operations (⚠️ use with caution)
                            </label>
                        </td>
                    </tr>
                </table>
                
                <h2>Debug</h2>
                <table class="form-table">
                    <tr>
                        <th scope="row">Debug Mode</th>
                        <td>
                            <label>
                                <input type="checkbox" name="wp_mcp_debug_mode" value="1" 
                                    <?php checked(get_option('wp_mcp_debug_mode'), 1); ?>>
                                Enable debug logging
                            </label>
                        </td>
                    </tr>
                </table>
                
                <h2>Registered Extensions</h2>
                <table class="widefat">
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>Name</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($this->custom_tools as $name => $tool): ?>
                        <tr>
                            <td>Tool</td>
                            <td><code><?php echo esc_html($name); ?></code></td>
                            <td><?php echo esc_html($tool['description'] ?? ''); ?></td>
                        </tr>
                        <?php endforeach; ?>
                        <?php foreach ($this->custom_resources as $uri => $resource): ?>
                        <tr>
                            <td>Resource</td>
                            <td><code><?php echo esc_html($uri); ?></code></td>
                            <td><?php echo esc_html($resource['description'] ?? ''); ?></td>
                        </tr>
                        <?php endforeach; ?>
                        <?php foreach ($this->custom_prompts as $name => $prompt): ?>
                        <tr>
                            <td>Prompt</td>
                            <td><code><?php echo esc_html($name); ?></code></td>
                            <td><?php echo esc_html($prompt['description'] ?? ''); ?></td>
                        </tr>
                        <?php endforeach; ?>
                        <?php if (empty($this->custom_tools) && empty($this->custom_resources) && empty($this->custom_prompts)): ?>
                        <tr>
                            <td colspan="3">No custom extensions registered.</td>
                        </tr>
                        <?php endif; ?>
                    </tbody>
                </table>
                
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }
    
    public function register_rest_routes() {
        $namespace = 'mcp/v1';
        
        // Elementor Endpoints
        if ($this->is_elementor_active()) {
            $this->register_elementor_routes($namespace);
        }
        
        // Gutenberg Extended Endpoints
        $this->register_gutenberg_routes($namespace);
        
        // Site Analysis Endpoints
        $this->register_analysis_routes($namespace);
        
        // Content Generation Endpoints
        $this->register_generation_routes($namespace);
    }
    
    // =====================
    // ELEMENTOR ENDPOINTS
    // =====================
    
    private function register_elementor_routes($namespace) {
        // Get Elementor Page Data
        register_rest_route($namespace, '/elementor/document/(?P<id>\d+)', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_elementor_document'),
            'permission_callback' => array($this, 'check_edit_permission'),
            'args' => array(
                'id' => array(
                    'required' => true,
                    'type' => 'integer',
                    'description' => 'Post ID',
                ),
            ),
        ));
        
        // Update Elementor Page Data
        register_rest_route($namespace, '/elementor/document/(?P<id>\d+)', array(
            'methods' => 'POST',
            'callback' => array($this, 'update_elementor_document'),
            'permission_callback' => array($this, 'check_edit_permission'),
        ));
        
        // Get Elementor Templates
        register_rest_route($namespace, '/elementor/templates', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_elementor_templates'),
            'permission_callback' => array($this, 'check_edit_permission'),
        ));
        
        // Get Elementor Global Widgets
        register_rest_route($namespace, '/elementor/global-widgets', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_elementor_global_widgets'),
            'permission_callback' => array($this, 'check_edit_permission'),
        ));
        
        // Get Elementor Kit Settings
        register_rest_route($namespace, '/elementor/kit', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_elementor_kit'),
            'permission_callback' => array($this, 'check_edit_permission'),
        ));
        
        // Get All Registered Widgets
        register_rest_route($namespace, '/elementor/widgets', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_elementor_widgets_list'),
            'permission_callback' => array($this, 'check_edit_permission'),
        ));
    }
    
    public function get_elementor_document($request) {
        $post_id = $request['id'];
        
        if (!class_exists('\Elementor\Plugin')) {
            return new WP_Error('elementor_not_active', 'Elementor is not active', array('status' => 400));
        }
        
        $document = \Elementor\Plugin::$instance->documents->get($post_id);
        
        if (!$document) {
            return new WP_Error('not_found', 'Elementor document not found', array('status' => 404));
        }
        
        return array(
            'id' => $post_id,
            'content' => $document->get_elements_data(),
            'settings' => $document->get_settings(),
            'page_settings' => get_post_meta($post_id, '_elementor_page_settings', true) ?: array(),
            'version' => get_post_meta($post_id, '_elementor_version', true),
            'edit_mode' => get_post_meta($post_id, '_elementor_edit_mode', true),
            'css' => get_post_meta($post_id, '_elementor_css', true),
        );
    }
    
    public function update_elementor_document($request) {
        $post_id = $request['id'];
        $data = $request->get_json_params();
        
        if (!class_exists('\Elementor\Plugin')) {
            return new WP_Error('elementor_not_active', 'Elementor is not active', array('status' => 400));
        }
        
        // Update content
        if (isset($data['content'])) {
            update_post_meta($post_id, '_elementor_data', wp_slash(json_encode($data['content'])));
        }
        
        // Update page settings
        if (isset($data['page_settings'])) {
            update_post_meta($post_id, '_elementor_page_settings', $data['page_settings']);
        }
        
        // Update version
        update_post_meta($post_id, '_elementor_version', ELEMENTOR_VERSION);
        
        // Clear Elementor cache
        if (method_exists(\Elementor\Plugin::$instance, 'files_manager')) {
            \Elementor\Plugin::$instance->files_manager->clear_cache();
        }
        
        // Regenerate CSS
        $document = \Elementor\Plugin::$instance->documents->get($post_id);
        if ($document) {
            $document->save(array());
        }
        
        return array(
            'success' => true,
            'id' => $post_id,
            'message' => 'Elementor document updated successfully',
        );
    }
    
    public function get_elementor_templates($request) {
        $args = array(
            'post_type' => 'elementor_library',
            'posts_per_page' => -1,
            'post_status' => 'publish',
        );
        
        $templates = get_posts($args);
        $result = array();
        
        foreach ($templates as $template) {
            $result[] = array(
                'id' => $template->ID,
                'title' => $template->post_title,
                'type' => get_post_meta($template->ID, '_elementor_template_type', true),
                'date' => $template->post_date,
                'modified' => $template->post_modified,
            );
        }
        
        return $result;
    }
    
    public function get_elementor_global_widgets($request) {
        $args = array(
            'post_type' => 'elementor_library',
            'posts_per_page' => -1,
            'post_status' => 'publish',
            'meta_query' => array(
                array(
                    'key' => '_elementor_template_type',
                    'value' => 'widget',
                ),
            ),
        );
        
        $widgets = get_posts($args);
        $result = array();
        
        foreach ($widgets as $widget) {
            $document = \Elementor\Plugin::$instance->documents->get($widget->ID);
            $result[] = array(
                'id' => $widget->ID,
                'title' => $widget->post_title,
                'content' => $document ? $document->get_elements_data() : array(),
            );
        }
        
        return $result;
    }
    
    public function get_elementor_kit($request) {
        if (!class_exists('\Elementor\Plugin')) {
            return new WP_Error('elementor_not_active', 'Elementor is not active', array('status' => 400));
        }
        
        $kit = \Elementor\Plugin::$instance->kits_manager->get_active_kit();
        
        return array(
            'id' => $kit->get_id(),
            'settings' => $kit->get_settings(),
        );
    }
    
    public function get_elementor_widgets_list($request) {
        if (!class_exists('\Elementor\Plugin')) {
            return new WP_Error('elementor_not_active', 'Elementor is not active', array('status' => 400));
        }
        
        $widgets_manager = \Elementor\Plugin::$instance->widgets_manager;
        $widgets = $widgets_manager->get_widget_types();
        
        $result = array();
        foreach ($widgets as $widget_name => $widget) {
            $result[] = array(
                'name' => $widget_name,
                'title' => $widget->get_title(),
                'icon' => $widget->get_icon(),
                'categories' => $widget->get_categories(),
                'keywords' => $widget->get_keywords(),
            );
        }
        
        return $result;
    }
    
    // =====================
    // GUTENBERG ENDPOINTS
    // =====================
    
    private function register_gutenberg_routes($namespace) {
        // Parse Block Content
        register_rest_route($namespace, '/gutenberg/parse', array(
            'methods' => 'POST',
            'callback' => array($this, 'parse_gutenberg_blocks'),
            'permission_callback' => array($this, 'check_edit_permission'),
        ));
        
        // Get Block Patterns
        register_rest_route($namespace, '/gutenberg/patterns', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_block_patterns'),
            'permission_callback' => array($this, 'check_edit_permission'),
        ));
        
        // Get Post Blocks with Metadata
        register_rest_route($namespace, '/gutenberg/post/(?P<id>\d+)', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_post_blocks'),
            'permission_callback' => array($this, 'check_edit_permission'),
        ));
    }
    
    public function parse_gutenberg_blocks($request) {
        $content = $request->get_param('content');
        
        if (empty($content)) {
            return new WP_Error('no_content', 'No content provided', array('status' => 400));
        }
        
        $blocks = parse_blocks($content);
        
        return array(
            'blocks' => $this->sanitize_blocks($blocks),
            'total' => count($blocks),
        );
    }
    
    private function sanitize_blocks($blocks) {
        $result = array();
        
        foreach ($blocks as $block) {
            if (empty($block['blockName'])) {
                continue; // Skip empty/whitespace blocks
            }
            
            $sanitized = array(
                'blockName' => $block['blockName'],
                'attrs' => $block['attrs'] ?? array(),
                'innerHTML' => $block['innerHTML'] ?? '',
            );
            
            if (!empty($block['innerBlocks'])) {
                $sanitized['innerBlocks'] = $this->sanitize_blocks($block['innerBlocks']);
            }
            
            $result[] = $sanitized;
        }
        
        return $result;
    }
    
    public function get_block_patterns($request) {
        $patterns = \WP_Block_Patterns_Registry::get_instance()->get_all_registered();
        
        $result = array();
        foreach ($patterns as $pattern) {
            $result[] = array(
                'name' => $pattern['name'],
                'title' => $pattern['title'],
                'description' => $pattern['description'] ?? '',
                'categories' => $pattern['categories'] ?? array(),
                'content' => $pattern['content'],
            );
        }
        
        return $result;
    }
    
    public function get_post_blocks($request) {
        $post_id = $request['id'];
        $post = get_post($post_id);
        
        if (!$post) {
            return new WP_Error('not_found', 'Post not found', array('status' => 404));
        }
        
        $blocks = parse_blocks($post->post_content);
        
        return array(
            'id' => $post_id,
            'title' => $post->post_title,
            'blocks' => $this->sanitize_blocks($blocks),
            'raw_content' => $post->post_content,
            'is_gutenberg' => has_blocks($post->post_content),
        );
    }
    
    // =====================
    // ANALYSIS ENDPOINTS
    // =====================
    
    private function register_analysis_routes($namespace) {
        // Analyze Page Builder Type
        register_rest_route($namespace, '/analyze/post/(?P<id>\d+)', array(
            'methods' => 'GET',
            'callback' => array($this, 'analyze_post'),
            'permission_callback' => array($this, 'check_edit_permission'),
        ));
        
        // Get Site Overview
        register_rest_route($namespace, '/analyze/site', array(
            'methods' => 'GET',
            'callback' => array($this, 'analyze_site'),
            'permission_callback' => array($this, 'check_edit_permission'),
        ));
    }
    
    public function analyze_post($request) {
        $post_id = $request['id'];
        $post = get_post($post_id);
        
        if (!$post) {
            return new WP_Error('not_found', 'Post not found', array('status' => 404));
        }
        
        $analysis = array(
            'id' => $post_id,
            'title' => $post->post_title,
            'post_type' => $post->post_type,
            'status' => $post->post_status,
            'builder' => 'classic',
            'has_gutenberg_blocks' => has_blocks($post->post_content),
            'has_elementor' => false,
            'has_shortcodes' => has_shortcode($post->post_content, ''),
            'template' => get_page_template_slug($post_id),
        );
        
        // Check for Elementor
        $elementor_data = get_post_meta($post_id, '_elementor_data', true);
        if (!empty($elementor_data) && $elementor_data !== '[]') {
            $analysis['builder'] = 'elementor';
            $analysis['has_elementor'] = true;
            $analysis['elementor_version'] = get_post_meta($post_id, '_elementor_version', true);
        } elseif (has_blocks($post->post_content)) {
            $analysis['builder'] = 'gutenberg';
        }
        
        // Word/Character count
        $content = wp_strip_all_tags($post->post_content);
        $analysis['word_count'] = str_word_count($content);
        $analysis['character_count'] = strlen($content);
        
        // Media analysis
        $analysis['images'] = $this->count_media_in_content($post->post_content, 'img');
        $analysis['links'] = $this->count_media_in_content($post->post_content, 'a');
        
        return $analysis;
    }
    
    private function count_media_in_content($content, $tag) {
        preg_match_all("/<{$tag}[^>]*>/i", $content, $matches);
        return count($matches[0]);
    }
    
    public function analyze_site($request) {
        global $wpdb;
        
        return array(
            'wordpress_version' => get_bloginfo('version'),
            'php_version' => PHP_VERSION,
            'theme' => array(
                'name' => wp_get_theme()->get('Name'),
                'version' => wp_get_theme()->get('Version'),
                'is_child' => is_child_theme(),
            ),
            'plugins' => array(
                'active' => count(get_option('active_plugins')),
                'total' => count(get_plugins()),
            ),
            'content' => array(
                'posts' => wp_count_posts('post'),
                'pages' => wp_count_posts('page'),
                'media' => wp_count_attachments(),
            ),
            'builders' => array(
                'elementor_active' => $this->is_elementor_active(),
                'elementor_pro_active' => defined('ELEMENTOR_PRO_VERSION'),
                'gutenberg_active' => true, // Always active since WP 5.0
            ),
            'multisite' => is_multisite(),
            'ssl' => is_ssl(),
            'permalink_structure' => get_option('permalink_structure'),
        );
    }
    
    // =====================
    // GENERATION ENDPOINTS
    // =====================
    
    private function register_generation_routes($namespace) {
        // Generate Elementor Section
        register_rest_route($namespace, '/generate/elementor/section', array(
            'methods' => 'POST',
            'callback' => array($this, 'generate_elementor_section'),
            'permission_callback' => array($this, 'check_edit_permission'),
        ));
        
        // Generate Gutenberg Blocks
        register_rest_route($namespace, '/generate/gutenberg/blocks', array(
            'methods' => 'POST',
            'callback' => array($this, 'generate_gutenberg_blocks'),
            'permission_callback' => array($this, 'check_edit_permission'),
        ));
    }
    
    public function generate_elementor_section($request) {
        $params = $request->get_json_params();
        
        $section = array(
            'id' => $this->generate_elementor_id(),
            'elType' => 'section',
            'settings' => $params['settings'] ?? array(),
            'elements' => array(),
        );
        
        // Generate columns
        $columns = $params['columns'] ?? 1;
        for ($i = 0; $i < $columns; $i++) {
            $section['elements'][] = array(
                'id' => $this->generate_elementor_id(),
                'elType' => 'column',
                'settings' => array(
                    '_column_size' => floor(100 / $columns),
                ),
                'elements' => array(),
            );
        }
        
        return $section;
    }
    
    private function generate_elementor_id() {
        return substr(str_shuffle('abcdefghijklmnopqrstuvwxyz0123456789'), 0, 7);
    }
    
    public function generate_gutenberg_blocks($request) {
        $params = $request->get_json_params();
        $blocks = $params['blocks'] ?? array();
        
        $output = '';
        foreach ($blocks as $block) {
            $output .= $this->render_gutenberg_block($block);
        }
        
        return array(
            'html' => $output,
            'blocks' => parse_blocks($output),
        );
    }
    
    private function render_gutenberg_block($block) {
        $name = $block['name'] ?? 'core/paragraph';
        $attrs = $block['attrs'] ?? array();
        $content = $block['content'] ?? '';
        
        $attrs_json = !empty($attrs) ? ' ' . json_encode($attrs) : '';
        
        if (empty($content)) {
            return "<!-- wp:{$name}{$attrs_json} /-->\n";
        }
        
        return "<!-- wp:{$name}{$attrs_json} -->\n{$content}\n<!-- /wp:{$name} -->\n";
    }
    
    // =====================
    // HELPER METHODS
    // =====================
    
    public function check_edit_permission() {
        return current_user_can('edit_posts');
    }
    
    private function is_elementor_active() {
        return defined('ELEMENTOR_VERSION') && class_exists('\Elementor\Plugin');
    }
    
    /**
     * Log debug messages
     */
    private function log($message, $data = null) {
        if (!get_option('wp_mcp_debug_mode')) {
            return;
        }
        
        $log_message = '[WP-MCP] ' . $message;
        if ($data !== null) {
            $log_message .= ' | Data: ' . wp_json_encode($data);
        }
        
        error_log($log_message);
    }
}

/**
 * Global function to access plugin instance
 * Usage: WPMCP()->register_tool($config);
 */
function WPMCP() {
    return WP_MCP_Extensions::get_instance();
}

// Initialize the plugin
WP_MCP_Extensions::get_instance();

/**
 * Example: How other plugins can register custom tools
 * 
 * add_action('wp_mcp_register_tools', function($mcp) {
 *     $mcp->register_tool([
 *         'name' => 'my_custom_tool',
 *         'description' => 'My custom tool description',
 *         'inputSchema' => [
 *             'type' => 'object',
 *             'properties' => [
 *                 'param1' => ['type' => 'string', 'description' => 'Parameter 1']
 *             ],
 *             'required' => ['param1']
 *         ],
 *         'callback' => function($args) {
 *             return ['result' => 'success', 'param1' => $args['param1']];
 *         },
 *     ]);
 * });
 * 
 * add_action('wp_mcp_register_resources', function($mcp) {
 *     $mcp->register_resource([
 *         'uri' => 'custom://my-resource',
 *         'name' => 'My Custom Resource',
 *         'description' => 'Custom resource description',
 *         'mimeType' => 'application/json',
 *         'callback' => function() {
 *             return ['contents' => ['data' => 'resource data']];
 *         },
 *     ]);
 * });
 */
