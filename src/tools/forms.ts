/**
 * Forms Tools - Contact Form 7, WPForms, Gravity Forms, Ninja Forms
 * Tools für Formular-Management
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { WordPressClient } from '../wordpress/client.js';

export function registerFormsTools(server: McpServer, wpClient: WordPressClient) {
  
  // ============================================
  // FORM PLUGIN DETECTION
  // ============================================

  server.registerTool(
    'forms_detect_plugin',
    {
      title: 'Formular-Plugin erkennen',
      description: 'Erkennt welches Formular-Plugin installiert ist',
      inputSchema: {},
    },
    async () => {
      const plugins: Array<{
        name: string;
        detected: boolean;
        endpoint?: string;
        formCount?: number;
      }> = [];
      
      // Check Contact Form 7
      try {
        const cf7Response = await wpClient.customRequest<Array<{ id: number }>>('/contact-form-7/v1/contact-forms');
        plugins.push({
          name: 'Contact Form 7',
          detected: true,
          endpoint: '/contact-form-7/v1',
          formCount: cf7Response.data.length,
        });
      } catch {
        plugins.push({ name: 'Contact Form 7', detected: false });
      }
      
      // Check WPForms
      try {
        const wpformsResponse = await wpClient.customRequest<Array<{ id: number }>>('/wpforms/v1/forms');
        plugins.push({
          name: 'WPForms',
          detected: true,
          endpoint: '/wpforms/v1',
          formCount: wpformsResponse.data.length,
        });
      } catch {
        plugins.push({ name: 'WPForms', detected: false });
      }
      
      // Check Gravity Forms
      try {
        const gfResponse = await wpClient.customRequest<Array<{ id: number }>>('/gf/v2/forms');
        plugins.push({
          name: 'Gravity Forms',
          detected: true,
          endpoint: '/gf/v2',
          formCount: gfResponse.data.length,
        });
      } catch {
        plugins.push({ name: 'Gravity Forms', detected: false });
      }
      
      // Check Ninja Forms
      try {
        const nfResponse = await wpClient.customRequest<Array<{ id: number }>>('/ninja-forms/v1/forms');
        plugins.push({
          name: 'Ninja Forms',
          detected: true,
          endpoint: '/ninja-forms/v1',
          formCount: nfResponse.data.length,
        });
      } catch {
        plugins.push({ name: 'Ninja Forms', detected: false });
      }
      
      // Check Formidable Forms
      try {
        const formidableResponse = await wpClient.customRequest<Array<{ id: number }>>('/frm/v2/forms');
        plugins.push({
          name: 'Formidable Forms',
          detected: true,
          endpoint: '/frm/v2',
          formCount: formidableResponse.data.length,
        });
      } catch {
        plugins.push({ name: 'Formidable Forms', detected: false });
      }
      
      const activePlugins = plugins.filter(p => p.detected);
      
      return {
        content: [{ type: 'text', text: JSON.stringify({
          activePlugins: activePlugins.map(p => p.name),
          totalForms: activePlugins.reduce((sum, p) => sum + (p.formCount || 0), 0),
          plugins,
        }, null, 2) }],
      };
    }
  );

  // ============================================
  // CONTACT FORM 7
  // ============================================

  server.registerTool(
    'cf7_list_forms',
    {
      title: 'Contact Form 7 Formulare auflisten',
      description: 'Listet alle Contact Form 7 Formulare auf',
      inputSchema: {},
    },
    async () => {
      try {
        const response = await wpClient.customRequest<Array<{
          id: number;
          slug: string;
          title: string;
          locale: string;
        }>>('/contact-form-7/v1/contact-forms');
        
        const forms = response.data.map(f => ({
          id: f.id,
          slug: f.slug,
          title: f.title,
          locale: f.locale,
          shortcode: `[contact-form-7 id="${f.id}" title="${f.title}"]`,
        }));
        
        return {
          content: [{ type: 'text', text: JSON.stringify({ count: forms.length, forms }, null, 2) }],
        };
      } catch {
        return {
          content: [{ type: 'text', text: 'Contact Form 7 nicht installiert oder REST API nicht aktiviert' }],
        };
      }
    }
  );

  server.registerTool(
    'cf7_get_form',
    {
      title: 'Contact Form 7 Formular Details',
      description: 'Ruft Details eines CF7-Formulars ab',
      inputSchema: {
        formId: z.number().describe('Formular-ID'),
      },
    },
    async ({ formId }) => {
      try {
        const response = await wpClient.customRequest<{
          id: number;
          slug: string;
          title: string;
          locale: string;
          properties: {
            form: string;
            mail: {
              subject: string;
              sender: string;
              recipient: string;
              body: string;
              additional_headers: string;
              attachments: string;
              use_html: boolean;
            };
            mail_2: {
              active: boolean;
              subject: string;
              recipient: string;
            };
            messages: Record<string, string>;
            additional_settings: string;
          };
        }>(`/contact-form-7/v1/contact-forms/${formId}`);
        
        const f = response.data;
        
        // Parse form fields from the form template
        const formContent = f.properties.form;
        const fields = parseFormFields(formContent);
        
        return {
          content: [{ type: 'text', text: JSON.stringify({
            id: f.id,
            slug: f.slug,
            title: f.title,
            locale: f.locale,
            shortcode: `[contact-form-7 id="${f.id}" title="${f.title}"]`,
            fields,
            formTemplate: f.properties.form,
            mailSettings: {
              recipient: f.properties.mail.recipient,
              subject: f.properties.mail.subject,
              sender: f.properties.mail.sender,
              useHtml: f.properties.mail.use_html,
            },
            mail2Active: f.properties.mail_2?.active || false,
            messages: f.properties.messages,
            additionalSettings: f.properties.additional_settings,
          }, null, 2) }],
        };
      } catch {
        return {
          content: [{ type: 'text', text: `Formular ${formId} nicht gefunden` }],
        };
      }
    }
  );

  server.registerTool(
    'cf7_update_form',
    {
      title: 'Contact Form 7 Formular aktualisieren',
      description: 'Aktualisiert ein CF7-Formular',
      inputSchema: {
        formId: z.number().describe('Formular-ID'),
        title: z.string().optional().describe('Neuer Titel'),
        form: z.string().optional().describe('Formular-Template (HTML mit CF7-Tags)'),
        mailRecipient: z.string().optional().describe('E-Mail-Empfänger'),
        mailSubject: z.string().optional().describe('E-Mail-Betreff'),
        mailBody: z.string().optional().describe('E-Mail-Inhalt'),
      },
    },
    async ({ formId, title, form, mailRecipient, mailSubject, mailBody }) => {
      try {
        const updateData: Record<string, unknown> = {};
        
        if (title) updateData.title = title;
        if (form) updateData.form = form;
        
        const mailSettings: Record<string, unknown> = {};
        if (mailRecipient) mailSettings.recipient = mailRecipient;
        if (mailSubject) mailSettings.subject = mailSubject;
        if (mailBody) mailSettings.body = mailBody;
        
        if (Object.keys(mailSettings).length > 0) {
          updateData.mail = mailSettings;
        }
        
        await wpClient.customRequest(`/contact-form-7/v1/contact-forms/${formId}`, 'PUT', updateData);
        
        return {
          content: [{ type: 'text', text: `Contact Form 7 Formular ${formId} aktualisiert` }],
        };
      } catch {
        return {
          content: [{ type: 'text', text: 'Fehler beim Aktualisieren des Formulars' }],
        };
      }
    }
  );

  // ============================================
  // WPFORMS
  // ============================================

  server.registerTool(
    'wpforms_list_forms',
    {
      title: 'WPForms Formulare auflisten',
      description: 'Listet alle WPForms Formulare auf',
      inputSchema: {},
    },
    async () => {
      try {
        const response = await wpClient.customRequest<Array<{
          id: number;
          title: string;
          status: string;
          entries_count: number;
          created: string;
          modified: string;
        }>>('/wpforms/v1/forms');
        
        const forms = response.data.map(f => ({
          id: f.id,
          title: f.title,
          status: f.status,
          entriesCount: f.entries_count,
          created: f.created,
          modified: f.modified,
          shortcode: `[wpforms id="${f.id}"]`,
        }));
        
        return {
          content: [{ type: 'text', text: JSON.stringify({ count: forms.length, forms }, null, 2) }],
        };
      } catch {
        return {
          content: [{ type: 'text', text: 'WPForms nicht installiert oder REST API nicht aktiviert' }],
        };
      }
    }
  );

  server.registerTool(
    'wpforms_get_entries',
    {
      title: 'WPForms Einträge abrufen',
      description: 'Ruft Formular-Einträge ab',
      inputSchema: {
        formId: z.number().describe('Formular-ID'),
        page: z.number().optional().default(1).describe('Seite'),
        perPage: z.number().optional().default(20).describe('Einträge pro Seite'),
      },
    },
    async ({ formId, page, perPage }) => {
      try {
        const response = await wpClient.customRequest<Array<{
          id: number;
          form_id: number;
          date: string;
          fields: Record<string, { name: string; value: string }>;
          status: string;
        }>>('/wpforms/v1/entries', 'GET', undefined, {
          form_id: formId,
          page,
          per_page: perPage,
        });
        
        const entries = response.data.map(e => ({
          id: e.id,
          formId: e.form_id,
          date: e.date,
          status: e.status,
          fields: Object.entries(e.fields || {}).map(([key, field]) => ({
            name: field.name,
            value: field.value,
          })),
        }));
        
        return {
          content: [{ type: 'text', text: JSON.stringify({ count: entries.length, entries }, null, 2) }],
        };
      } catch {
        return {
          content: [{ type: 'text', text: 'WPForms Einträge nicht verfügbar' }],
        };
      }
    }
  );

  // ============================================
  // GRAVITY FORMS
  // ============================================

  server.registerTool(
    'gf_list_forms',
    {
      title: 'Gravity Forms Formulare auflisten',
      description: 'Listet alle Gravity Forms Formulare auf',
      inputSchema: {},
    },
    async () => {
      try {
        const response = await wpClient.customRequest<Array<{
          id: string;
          title: string;
          description: string;
          date_created: string;
          is_active: string;
          is_trash: string;
          entries: string;
        }>>('/gf/v2/forms');
        
        const forms = response.data.map(f => ({
          id: parseInt(f.id),
          title: f.title,
          description: f.description,
          dateCreated: f.date_created,
          isActive: f.is_active === '1',
          isTrash: f.is_trash === '1',
          entriesCount: parseInt(f.entries || '0'),
          shortcode: `[gravityform id="${f.id}" title="true"]`,
        }));
        
        return {
          content: [{ type: 'text', text: JSON.stringify({ count: forms.length, forms }, null, 2) }],
        };
      } catch {
        return {
          content: [{ type: 'text', text: 'Gravity Forms nicht installiert oder REST API nicht aktiviert' }],
        };
      }
    }
  );

  server.registerTool(
    'gf_get_form',
    {
      title: 'Gravity Forms Formular Details',
      description: 'Ruft Details eines Gravity Forms Formulars ab',
      inputSchema: {
        formId: z.number().describe('Formular-ID'),
      },
    },
    async ({ formId }) => {
      try {
        const response = await wpClient.customRequest<{
          id: string;
          title: string;
          description: string;
          labelPlacement: string;
          descriptionPlacement: string;
          button: { type: string; text: string };
          fields: Array<{
            id: number;
            type: string;
            label: string;
            isRequired: boolean;
            placeholder: string;
            choices?: Array<{ text: string; value: string }>;
            inputs?: Array<{ id: string; label: string }>;
          }>;
          confirmations: Record<string, { type: string; message?: string; url?: string }>;
          notifications: Record<string, { name: string; toType: string; to: string; subject: string }>;
        }>(`/gf/v2/forms/${formId}`);
        
        const f = response.data;
        
        return {
          content: [{ type: 'text', text: JSON.stringify({
            id: parseInt(f.id),
            title: f.title,
            description: f.description,
            labelPlacement: f.labelPlacement,
            submitButton: f.button,
            fields: f.fields.map(field => ({
              id: field.id,
              type: field.type,
              label: field.label,
              isRequired: field.isRequired,
              placeholder: field.placeholder,
              choices: field.choices,
              inputs: field.inputs,
            })),
            confirmations: Object.values(f.confirmations || {}),
            notifications: Object.values(f.notifications || {}).map(n => ({
              name: n.name,
              toType: n.toType,
              to: n.to,
              subject: n.subject,
            })),
            shortcode: `[gravityform id="${f.id}" title="true"]`,
          }, null, 2) }],
        };
      } catch {
        return {
          content: [{ type: 'text', text: `Formular ${formId} nicht gefunden` }],
        };
      }
    }
  );

  server.registerTool(
    'gf_get_entries',
    {
      title: 'Gravity Forms Einträge abrufen',
      description: 'Ruft Einträge eines Gravity Forms Formulars ab',
      inputSchema: {
        formId: z.number().describe('Formular-ID'),
        page: z.number().optional().default(1).describe('Seite'),
        perPage: z.number().optional().default(20).describe('Einträge pro Seite'),
        status: z.enum(['active', 'spam', 'trash']).optional().default('active').describe('Status'),
      },
    },
    async ({ formId, page, perPage, status }) => {
      try {
        const response = await wpClient.customRequest<{
          entries: Array<{
            id: string;
            form_id: string;
            date_created: string;
            status: string;
            source_url: string;
            [key: string]: unknown;
          }>;
          total_count: number;
        }>(`/gf/v2/forms/${formId}/entries`, 'GET', undefined, {
          'paging[page_size]': perPage,
          'paging[current_page]': page,
          status,
        });
        
        const entries = response.data.entries.map(e => {
          // Extract field values (keys that are numeric)
          const fieldValues: Record<string, unknown> = {};
          Object.entries(e).forEach(([key, value]) => {
            if (/^\d+(\.\d+)?$/.test(key)) {
              fieldValues[key] = value;
            }
          });
          
          return {
            id: parseInt(e.id),
            formId: parseInt(e.form_id),
            dateCreated: e.date_created,
            status: e.status,
            sourceUrl: e.source_url,
            fields: fieldValues,
          };
        });
        
        return {
          content: [{ type: 'text', text: JSON.stringify({
            formId,
            totalCount: response.data.total_count,
            page,
            perPage,
            entries,
          }, null, 2) }],
        };
      } catch {
        return {
          content: [{ type: 'text', text: 'Gravity Forms Einträge nicht verfügbar' }],
        };
      }
    }
  );

  // ============================================
  // NINJA FORMS
  // ============================================

  server.registerTool(
    'nf_list_forms',
    {
      title: 'Ninja Forms Formulare auflisten',
      description: 'Listet alle Ninja Forms Formulare auf',
      inputSchema: {},
    },
    async () => {
      try {
        const response = await wpClient.customRequest<Array<{
          id: number;
          title: string;
          created_at: string;
          form_title: string;
          default_label_pos: string;
        }>>('/ninja-forms/v1/forms');
        
        const forms = response.data.map(f => ({
          id: f.id,
          title: f.title || f.form_title,
          created: f.created_at,
          labelPosition: f.default_label_pos,
          shortcode: `[ninja_form id="${f.id}"]`,
        }));
        
        return {
          content: [{ type: 'text', text: JSON.stringify({ count: forms.length, forms }, null, 2) }],
        };
      } catch {
        return {
          content: [{ type: 'text', text: 'Ninja Forms nicht installiert oder REST API nicht aktiviert' }],
        };
      }
    }
  );

  // ============================================
  // FORM STYLING HELPERS
  // ============================================

  server.registerTool(
    'forms_generate_css',
    {
      title: 'Formular-CSS generieren',
      description: 'Generiert CSS-Vorlagen für Formular-Styling',
      inputSchema: {
        plugin: z.enum(['cf7', 'wpforms', 'gravityforms', 'ninjaforms']).describe('Formular-Plugin'),
        style: z.enum(['modern', 'minimal', 'rounded', 'flat', 'bordered']).default('modern').describe('Stil-Vorlage'),
        primaryColor: z.string().optional().default('#007bff').describe('Primärfarbe'),
        borderRadius: z.string().optional().default('4px').describe('Border Radius'),
        fontFamily: z.string().optional().describe('Schriftart'),
      },
    },
    async ({ plugin, style, primaryColor, borderRadius, fontFamily }) => {
      const selectors: Record<string, { form: string; input: string; label: string; button: string; error: string }> = {
        cf7: {
          form: '.wpcf7-form',
          input: '.wpcf7-form input:not([type="submit"]), .wpcf7-form textarea, .wpcf7-form select',
          label: '.wpcf7-form label',
          button: '.wpcf7-form input[type="submit"], .wpcf7-form .wpcf7-submit',
          error: '.wpcf7-not-valid-tip',
        },
        wpforms: {
          form: '.wpforms-container .wpforms-form',
          input: '.wpforms-form input:not([type="submit"]), .wpforms-form textarea, .wpforms-form select',
          label: '.wpforms-form .wpforms-field-label',
          button: '.wpforms-form .wpforms-submit',
          error: '.wpforms-form .wpforms-error',
        },
        gravityforms: {
          form: '.gform_wrapper .gform_body',
          input: '.gform_wrapper input:not([type="submit"]), .gform_wrapper textarea, .gform_wrapper select',
          label: '.gform_wrapper .gfield_label',
          button: '.gform_wrapper .gform_button',
          error: '.gform_wrapper .validation_message',
        },
        ninjaforms: {
          form: '.nf-form-cont',
          input: '.nf-form-cont input:not([type="submit"]), .nf-form-cont textarea, .nf-form-cont select',
          label: '.nf-form-cont .nf-field-label label',
          button: '.nf-form-cont .nf-field-element input[type="submit"]',
          error: '.nf-form-cont .nf-error-msg',
        },
      };
      
      const sel = selectors[plugin];
      
      const baseStyles = {
        modern: `
/* Modern Form Style */
${sel.form} {
  ${fontFamily ? `font-family: ${fontFamily};` : ''}
}

${sel.input} {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e1e5e9;
  border-radius: ${borderRadius};
  font-size: 16px;
  transition: border-color 0.2s, box-shadow 0.2s;
  background: #fff;
}

${sel.input}:focus {
  outline: none;
  border-color: ${primaryColor};
  box-shadow: 0 0 0 3px ${primaryColor}20;
}

${sel.label} {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #333;
}

${sel.button} {
  background: ${primaryColor};
  color: #fff;
  padding: 14px 28px;
  border: none;
  border-radius: ${borderRadius};
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
}

${sel.button}:hover {
  background: ${adjustColor(primaryColor, -20)};
  transform: translateY(-1px);
}

${sel.error} {
  color: #dc3545;
  font-size: 14px;
  margin-top: 4px;
}`,

        minimal: `
/* Minimal Form Style */
${sel.input} {
  width: 100%;
  padding: 10px 0;
  border: none;
  border-bottom: 1px solid #ddd;
  background: transparent;
  font-size: 16px;
  transition: border-color 0.2s;
}

${sel.input}:focus {
  outline: none;
  border-bottom-color: ${primaryColor};
}

${sel.label} {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #666;
  margin-bottom: 4px;
}

${sel.button} {
  background: transparent;
  color: ${primaryColor};
  padding: 12px 24px;
  border: 1px solid ${primaryColor};
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.2s;
}

${sel.button}:hover {
  background: ${primaryColor};
  color: #fff;
}`,

        rounded: `
/* Rounded Form Style */
${sel.input} {
  width: 100%;
  padding: 14px 20px;
  border: 1px solid #e0e0e0;
  border-radius: 50px;
  font-size: 16px;
  background: #f8f9fa;
  transition: all 0.2s;
}

${sel.input}:focus {
  outline: none;
  border-color: ${primaryColor};
  background: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

${sel.button} {
  background: linear-gradient(135deg, ${primaryColor}, ${adjustColor(primaryColor, 30)});
  color: #fff;
  padding: 14px 32px;
  border: none;
  border-radius: 50px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px ${primaryColor}40;
  transition: all 0.2s;
}

${sel.button}:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px ${primaryColor}50;
}`,

        flat: `
/* Flat Form Style */
${sel.input} {
  width: 100%;
  padding: 16px;
  border: none;
  background: #f5f5f5;
  font-size: 16px;
  transition: background 0.2s;
}

${sel.input}:focus {
  outline: none;
  background: #eee;
}

${sel.button} {
  background: ${primaryColor};
  color: #fff;
  padding: 16px 32px;
  border: none;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

${sel.button}:hover {
  background: ${adjustColor(primaryColor, -15)};
}`,

        bordered: `
/* Bordered Form Style */
${sel.input} {
  width: 100%;
  padding: 12px 14px;
  border: 2px solid #333;
  border-radius: 0;
  font-size: 16px;
  background: transparent;
  transition: all 0.2s;
}

${sel.input}:focus {
  outline: none;
  border-color: ${primaryColor};
  box-shadow: 4px 4px 0 ${primaryColor};
}

${sel.button} {
  background: #333;
  color: #fff;
  padding: 14px 28px;
  border: 2px solid #333;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

${sel.button}:hover {
  background: ${primaryColor};
  border-color: ${primaryColor};
  box-shadow: 4px 4px 0 #333;
}`,
      };
      
      return {
        content: [{ type: 'text', text: JSON.stringify({
          plugin,
          style,
          css: baseStyles[style],
          usage: 'Fügen Sie dieses CSS in Ihren Theme Customizer unter "Zusätzliches CSS" ein, oder in eine custom.css Datei.',
        }, null, 2) }],
      };
    }
  );

  // ============================================
  // FORM ANALYTICS
  // ============================================

  server.registerTool(
    'forms_get_stats',
    {
      title: 'Formular-Statistiken',
      description: 'Ruft Statistiken für Formular-Einreichungen ab',
      inputSchema: {
        plugin: z.enum(['cf7', 'wpforms', 'gravityforms']).describe('Formular-Plugin'),
        formId: z.number().optional().describe('Formular-ID (optional, sonst alle)'),
        period: z.enum(['week', 'month', 'year', 'all']).optional().default('month').describe('Zeitraum'),
      },
    },
    async ({ plugin, formId, period }) => {
      try {
        let stats: {
          formId?: number;
          totalEntries: number;
          periodEntries: number;
          lastEntry?: string;
          conversionRate?: string;
        };
        
        switch (plugin) {
          case 'gravityforms':
            if (formId) {
              const gfResponse = await wpClient.customRequest<{
                entries: Array<{ id: string; date_created: string }>;
                total_count: number;
              }>(`/gf/v2/forms/${formId}/entries`);
              
              stats = {
                formId,
                totalEntries: gfResponse.data.total_count,
                periodEntries: gfResponse.data.entries.length,
                lastEntry: gfResponse.data.entries[0]?.date_created,
              };
            } else {
              const formsResponse = await wpClient.customRequest<Array<{ id: string; entries: string }>>('/gf/v2/forms');
              const totalEntries = formsResponse.data.reduce((sum, f) => sum + parseInt(f.entries || '0'), 0);
              
              stats = {
                totalEntries,
                periodEntries: totalEntries,
              };
            }
            break;
            
          default:
            return {
              content: [{ type: 'text', text: `Statistiken für ${plugin} erfordern spezifische Plugin-APIs` }],
            };
        }
        
        return {
          content: [{ type: 'text', text: JSON.stringify({
            plugin,
            period,
            stats,
          }, null, 2) }],
        };
      } catch {
        return {
          content: [{ type: 'text', text: 'Statistiken nicht verfügbar' }],
        };
      }
    }
  );
}

// Helper: Parse CF7 form fields
function parseFormFields(formContent: string): Array<{ type: string; name: string; required: boolean }> {
  const fields: Array<{ type: string; name: string; required: boolean }> = [];
  
  // Match CF7 tags like [text* your-name] [email* your-email] [textarea your-message]
  const tagRegex = /\[(text|email|tel|url|number|date|textarea|select|checkbox|radio|file|submit)(\*)?\s+([^\]\s]+)/g;
  let match;
  
  while ((match = tagRegex.exec(formContent)) !== null) {
    fields.push({
      type: match[1],
      name: match[3],
      required: match[2] === '*',
    });
  }
  
  return fields;
}

// Helper: Adjust color brightness
function adjustColor(color: string, amount: number): string {
  // Simple hex color adjustment
  const hex = color.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.substring(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.substring(2, 4), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.substring(4, 6), 16) + amount));
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
