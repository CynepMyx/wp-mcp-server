/**
 * WooCommerce Tools - Product Management, Orders, Shop Settings
 * Tools für E-Commerce mit WooCommerce
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { WordPressClient } from '../wordpress/client.js';

export function registerWooCommerceTools(server: McpServer, wpClient: WordPressClient) {
  
  // WooCommerce API Base
  const wcApiBase = '/wc/v3';
  
  // ============================================
  // PRODUCTS
  // ============================================

  server.registerTool(
    'woo_list_products',
    {
      title: 'WooCommerce Produkte auflisten',
      description: 'Listet WooCommerce Produkte mit Filtern auf',
      inputSchema: {
        page: z.number().optional().default(1).describe('Seite'),
        perPage: z.number().optional().default(20).describe('Produkte pro Seite'),
        status: z.enum(['draft', 'pending', 'private', 'publish', 'any']).optional().describe('Status'),
        category: z.number().optional().describe('Kategorie-ID'),
        tag: z.number().optional().describe('Tag-ID'),
        type: z.enum(['simple', 'grouped', 'external', 'variable']).optional().describe('Produkttyp'),
        featured: z.boolean().optional().describe('Nur Featured Produkte'),
        onSale: z.boolean().optional().describe('Nur Sale Produkte'),
        minPrice: z.number().optional().describe('Mindestpreis'),
        maxPrice: z.number().optional().describe('Maximalpreis'),
        search: z.string().optional().describe('Suchbegriff'),
        orderby: z.enum(['date', 'id', 'title', 'slug', 'price', 'popularity', 'rating']).optional().describe('Sortierung'),
        order: z.enum(['asc', 'desc']).optional().describe('Reihenfolge'),
      },
    },
    async (params) => {
      const queryParams: Record<string, string | number | boolean> = {
        page: params.page || 1,
        per_page: params.perPage || 20,
      };
      
      if (params.status) queryParams.status = params.status;
      if (params.category) queryParams.category = params.category;
      if (params.tag) queryParams.tag = params.tag;
      if (params.type) queryParams.type = params.type;
      if (params.featured !== undefined) queryParams.featured = params.featured;
      if (params.onSale !== undefined) queryParams.on_sale = params.onSale;
      if (params.minPrice) queryParams.min_price = params.minPrice;
      if (params.maxPrice) queryParams.max_price = params.maxPrice;
      if (params.search) queryParams.search = params.search;
      if (params.orderby) queryParams.orderby = params.orderby;
      if (params.order) queryParams.order = params.order;
      
      const response = await wpClient.customRequest<Array<{
        id: number;
        name: string;
        slug: string;
        permalink: string;
        type: string;
        status: string;
        featured: boolean;
        description: string;
        short_description: string;
        sku: string;
        price: string;
        regular_price: string;
        sale_price: string;
        on_sale: boolean;
        stock_status: string;
        stock_quantity: number | null;
        categories: Array<{ id: number; name: string }>;
        tags: Array<{ id: number; name: string }>;
        images: Array<{ id: number; src: string; alt: string }>;
        attributes: Array<{ name: string; options: string[] }>;
        variations: number[];
      }>>(`${wcApiBase}/products`, 'GET', undefined, queryParams);
      
      const products = response.data.map(p => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        url: p.permalink,
        type: p.type,
        status: p.status,
        featured: p.featured,
        sku: p.sku,
        price: p.price,
        regularPrice: p.regular_price,
        salePrice: p.sale_price,
        onSale: p.on_sale,
        stockStatus: p.stock_status,
        stockQuantity: p.stock_quantity,
        categories: p.categories.map(c => c.name),
        tags: p.tags.map(t => t.name),
        imageCount: p.images.length,
        mainImage: p.images[0]?.src || null,
        hasVariations: p.variations.length > 0,
        variationCount: p.variations.length,
      }));
      
      return {
        content: [{ type: 'text', text: JSON.stringify({ count: products.length, products }, null, 2) }],
      };
    }
  );

  server.registerTool(
    'woo_get_product',
    {
      title: 'WooCommerce Produkt Details',
      description: 'Ruft Details eines einzelnen Produkts ab',
      inputSchema: {
        productId: z.number().describe('Produkt-ID'),
      },
    },
    async ({ productId }) => {
      const response = await wpClient.customRequest<{
        id: number;
        name: string;
        slug: string;
        permalink: string;
        type: string;
        status: string;
        featured: boolean;
        catalog_visibility: string;
        description: string;
        short_description: string;
        sku: string;
        price: string;
        regular_price: string;
        sale_price: string;
        date_on_sale_from: string | null;
        date_on_sale_to: string | null;
        on_sale: boolean;
        purchasable: boolean;
        total_sales: number;
        virtual: boolean;
        downloadable: boolean;
        tax_status: string;
        tax_class: string;
        manage_stock: boolean;
        stock_quantity: number | null;
        stock_status: string;
        backorders: string;
        weight: string;
        dimensions: { length: string; width: string; height: string };
        shipping_class: string;
        reviews_allowed: boolean;
        average_rating: string;
        rating_count: number;
        categories: Array<{ id: number; name: string; slug: string }>;
        tags: Array<{ id: number; name: string; slug: string }>;
        images: Array<{ id: number; src: string; name: string; alt: string }>;
        attributes: Array<{ id: number; name: string; position: number; visible: boolean; variation: boolean; options: string[] }>;
        default_attributes: Array<{ id: number; name: string; option: string }>;
        variations: number[];
        meta_data: Array<{ key: string; value: unknown }>;
      }>(`${wcApiBase}/products/${productId}`);
      
      const p = response.data;
      
      const output = {
        id: p.id,
        name: p.name,
        slug: p.slug,
        url: p.permalink,
        type: p.type,
        status: p.status,
        featured: p.featured,
        catalogVisibility: p.catalog_visibility,
        description: p.description,
        shortDescription: p.short_description,
        sku: p.sku,
        pricing: {
          price: p.price,
          regularPrice: p.regular_price,
          salePrice: p.sale_price,
          onSale: p.on_sale,
          saleFrom: p.date_on_sale_from,
          saleTo: p.date_on_sale_to,
        },
        sales: {
          totalSales: p.total_sales,
          purchasable: p.purchasable,
        },
        inventory: {
          manageStock: p.manage_stock,
          stockQuantity: p.stock_quantity,
          stockStatus: p.stock_status,
          backorders: p.backorders,
        },
        shipping: {
          virtual: p.virtual,
          downloadable: p.downloadable,
          weight: p.weight,
          dimensions: p.dimensions,
          shippingClass: p.shipping_class,
        },
        tax: {
          taxStatus: p.tax_status,
          taxClass: p.tax_class,
        },
        reviews: {
          allowed: p.reviews_allowed,
          averageRating: p.average_rating,
          ratingCount: p.rating_count,
        },
        categories: p.categories,
        tags: p.tags,
        images: p.images,
        attributes: p.attributes,
        defaultAttributes: p.default_attributes,
        variations: p.variations,
        metaData: p.meta_data,
      };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
      };
    }
  );

  server.registerTool(
    'woo_create_product',
    {
      title: 'WooCommerce Produkt erstellen',
      description: 'Erstellt ein neues WooCommerce Produkt',
      inputSchema: {
        name: z.string().describe('Produktname'),
        type: z.enum(['simple', 'grouped', 'external', 'variable']).default('simple').describe('Produkttyp'),
        status: z.enum(['draft', 'pending', 'private', 'publish']).default('draft').describe('Status'),
        regularPrice: z.string().describe('Regulärer Preis'),
        salePrice: z.string().optional().describe('Angebotspreis'),
        description: z.string().optional().describe('Produktbeschreibung'),
        shortDescription: z.string().optional().describe('Kurzbeschreibung'),
        sku: z.string().optional().describe('Artikelnummer (SKU)'),
        categories: z.array(z.number()).optional().describe('Kategorie-IDs'),
        tags: z.array(z.number()).optional().describe('Tag-IDs'),
        images: z.array(z.object({
          src: z.string(),
          alt: z.string().optional(),
        })).optional().describe('Bilder'),
        manageStock: z.boolean().optional().describe('Lagerbestand verwalten'),
        stockQuantity: z.number().optional().describe('Lagerbestand'),
        weight: z.string().optional().describe('Gewicht'),
        dimensions: z.object({
          length: z.string(),
          width: z.string(),
          height: z.string(),
        }).optional().describe('Abmessungen'),
        attributes: z.array(z.object({
          name: z.string(),
          options: z.array(z.string()),
          visible: z.boolean().optional(),
          variation: z.boolean().optional(),
        })).optional().describe('Attribute'),
      },
    },
    async (params) => {
      const productData: Record<string, unknown> = {
        name: params.name,
        type: params.type,
        status: params.status,
        regular_price: params.regularPrice,
      };
      
      if (params.salePrice) productData.sale_price = params.salePrice;
      if (params.description) productData.description = params.description;
      if (params.shortDescription) productData.short_description = params.shortDescription;
      if (params.sku) productData.sku = params.sku;
      if (params.categories) productData.categories = params.categories.map(id => ({ id }));
      if (params.tags) productData.tags = params.tags.map(id => ({ id }));
      if (params.images) productData.images = params.images;
      if (params.manageStock !== undefined) productData.manage_stock = params.manageStock;
      if (params.stockQuantity !== undefined) productData.stock_quantity = params.stockQuantity;
      if (params.weight) productData.weight = params.weight;
      if (params.dimensions) productData.dimensions = params.dimensions;
      if (params.attributes) productData.attributes = params.attributes;
      
      const response = await wpClient.customRequest<{ id: number; name: string; permalink: string }>(
        `${wcApiBase}/products`,
        'POST',
        productData
      );
      
      return {
        content: [{ type: 'text', text: `Produkt erstellt: ${response.data.name} (ID: ${response.data.id})\nURL: ${response.data.permalink}` }],
      };
    }
  );

  server.registerTool(
    'woo_update_product',
    {
      title: 'WooCommerce Produkt aktualisieren',
      description: 'Aktualisiert ein bestehendes WooCommerce Produkt',
      inputSchema: {
        productId: z.number().describe('Produkt-ID'),
        name: z.string().optional().describe('Produktname'),
        status: z.enum(['draft', 'pending', 'private', 'publish']).optional().describe('Status'),
        regularPrice: z.string().optional().describe('Regulärer Preis'),
        salePrice: z.string().optional().describe('Angebotspreis'),
        description: z.string().optional().describe('Produktbeschreibung'),
        shortDescription: z.string().optional().describe('Kurzbeschreibung'),
        sku: z.string().optional().describe('Artikelnummer (SKU)'),
        stockQuantity: z.number().optional().describe('Lagerbestand'),
        stockStatus: z.enum(['instock', 'outofstock', 'onbackorder']).optional().describe('Lagerstatus'),
        featured: z.boolean().optional().describe('Als Featured markieren'),
      },
    },
    async ({ productId, ...params }) => {
      const productData: Record<string, unknown> = {};
      
      if (params.name) productData.name = params.name;
      if (params.status) productData.status = params.status;
      if (params.regularPrice) productData.regular_price = params.regularPrice;
      if (params.salePrice !== undefined) productData.sale_price = params.salePrice;
      if (params.description) productData.description = params.description;
      if (params.shortDescription) productData.short_description = params.shortDescription;
      if (params.sku) productData.sku = params.sku;
      if (params.stockQuantity !== undefined) productData.stock_quantity = params.stockQuantity;
      if (params.stockStatus) productData.stock_status = params.stockStatus;
      if (params.featured !== undefined) productData.featured = params.featured;
      
      const response = await wpClient.customRequest<{ id: number; name: string }>(
        `${wcApiBase}/products/${productId}`,
        'PUT',
        productData
      );
      
      return {
        content: [{ type: 'text', text: `Produkt aktualisiert: ${response.data.name} (ID: ${response.data.id})` }],
      };
    }
  );

  server.registerTool(
    'woo_delete_product',
    {
      title: 'WooCommerce Produkt löschen',
      description: 'Löscht ein WooCommerce Produkt',
      inputSchema: {
        productId: z.number().describe('Produkt-ID'),
        force: z.boolean().optional().default(false).describe('Endgültig löschen (ohne Papierkorb)'),
      },
    },
    async ({ productId, force }) => {
      await wpClient.customRequest(
        `${wcApiBase}/products/${productId}`,
        'DELETE',
        undefined,
        { force }
      );
      
      return {
        content: [{ type: 'text', text: `Produkt ${productId} ${force ? 'endgültig gelöscht' : 'in Papierkorb verschoben'}` }],
      };
    }
  );

  // ============================================
  // PRODUCT VARIATIONS
  // ============================================

  server.registerTool(
    'woo_list_variations',
    {
      title: 'Produktvarianten auflisten',
      description: 'Listet alle Varianten eines variablen Produkts auf',
      inputSchema: {
        productId: z.number().describe('Produkt-ID des variablen Produkts'),
      },
    },
    async ({ productId }) => {
      const response = await wpClient.customRequest<Array<{
        id: number;
        sku: string;
        price: string;
        regular_price: string;
        sale_price: string;
        on_sale: boolean;
        stock_status: string;
        stock_quantity: number | null;
        attributes: Array<{ name: string; option: string }>;
        image: { src: string } | null;
      }>>(`${wcApiBase}/products/${productId}/variations`);
      
      const variations = response.data.map(v => ({
        id: v.id,
        sku: v.sku,
        price: v.price,
        regularPrice: v.regular_price,
        salePrice: v.sale_price,
        onSale: v.on_sale,
        stockStatus: v.stock_status,
        stockQuantity: v.stock_quantity,
        attributes: v.attributes,
        image: v.image?.src || null,
      }));
      
      return {
        content: [{ type: 'text', text: JSON.stringify({ productId, count: variations.length, variations }, null, 2) }],
      };
    }
  );

  // ============================================
  // PRODUCT CATEGORIES
  // ============================================

  server.registerTool(
    'woo_list_categories',
    {
      title: 'WooCommerce Kategorien auflisten',
      description: 'Listet alle Produktkategorien auf',
      inputSchema: {
        hideEmpty: z.boolean().optional().default(false).describe('Leere Kategorien ausblenden'),
        parent: z.number().optional().describe('Nur Unterkategorien dieser Kategorie'),
      },
    },
    async ({ hideEmpty, parent }) => {
      const params: Record<string, string | number | boolean> = {
        per_page: 100,
        hide_empty: hideEmpty || false,
      };
      
      if (parent !== undefined) params.parent = parent;
      
      const response = await wpClient.customRequest<Array<{
        id: number;
        name: string;
        slug: string;
        parent: number;
        description: string;
        count: number;
        image: { src: string } | null;
      }>>(`${wcApiBase}/products/categories`, 'GET', undefined, params);
      
      const categories = response.data.map(c => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        parent: c.parent,
        description: c.description,
        productCount: c.count,
        image: c.image?.src || null,
      }));
      
      return {
        content: [{ type: 'text', text: JSON.stringify({ count: categories.length, categories }, null, 2) }],
      };
    }
  );

  // ============================================
  // ORDERS
  // ============================================

  server.registerTool(
    'woo_list_orders',
    {
      title: 'WooCommerce Bestellungen auflisten',
      description: 'Listet WooCommerce Bestellungen auf',
      inputSchema: {
        page: z.number().optional().default(1).describe('Seite'),
        perPage: z.number().optional().default(20).describe('Bestellungen pro Seite'),
        status: z.enum(['pending', 'processing', 'on-hold', 'completed', 'cancelled', 'refunded', 'failed', 'any']).optional().describe('Status'),
        customer: z.number().optional().describe('Kunden-ID'),
        after: z.string().optional().describe('Nach Datum (ISO 8601)'),
        before: z.string().optional().describe('Vor Datum (ISO 8601)'),
      },
    },
    async (params) => {
      const queryParams: Record<string, string | number> = {
        page: params.page || 1,
        per_page: params.perPage || 20,
      };
      
      if (params.status && params.status !== 'any') queryParams.status = params.status;
      if (params.customer) queryParams.customer = params.customer;
      if (params.after) queryParams.after = params.after;
      if (params.before) queryParams.before = params.before;
      
      const response = await wpClient.customRequest<Array<{
        id: number;
        number: string;
        status: string;
        currency: string;
        total: string;
        date_created: string;
        date_modified: string;
        customer_id: number;
        billing: { first_name: string; last_name: string; email: string };
        line_items: Array<{ name: string; quantity: number; total: string }>;
        payment_method_title: string;
      }>>(`${wcApiBase}/orders`, 'GET', undefined, queryParams);
      
      const orders = response.data.map(o => ({
        id: o.id,
        number: o.number,
        status: o.status,
        total: `${o.total} ${o.currency}`,
        dateCreated: o.date_created,
        customer: {
          id: o.customer_id,
          name: `${o.billing.first_name} ${o.billing.last_name}`,
          email: o.billing.email,
        },
        itemCount: o.line_items.length,
        items: o.line_items.map(i => `${i.quantity}x ${i.name}`),
        paymentMethod: o.payment_method_title,
      }));
      
      return {
        content: [{ type: 'text', text: JSON.stringify({ count: orders.length, orders }, null, 2) }],
      };
    }
  );

  server.registerTool(
    'woo_get_order',
    {
      title: 'WooCommerce Bestellung Details',
      description: 'Ruft Details einer einzelnen Bestellung ab',
      inputSchema: {
        orderId: z.number().describe('Bestell-ID'),
      },
    },
    async ({ orderId }) => {
      const response = await wpClient.customRequest<{
        id: number;
        number: string;
        status: string;
        currency: string;
        total: string;
        subtotal: string;
        total_tax: string;
        shipping_total: string;
        discount_total: string;
        date_created: string;
        date_modified: string;
        date_completed: string | null;
        date_paid: string | null;
        customer_id: number;
        customer_note: string;
        billing: Record<string, string>;
        shipping: Record<string, string>;
        payment_method: string;
        payment_method_title: string;
        transaction_id: string;
        line_items: Array<{
          id: number;
          name: string;
          product_id: number;
          variation_id: number;
          quantity: number;
          subtotal: string;
          total: string;
          sku: string;
          price: number;
        }>;
        shipping_lines: Array<{ method_title: string; total: string }>;
        fee_lines: Array<{ name: string; total: string }>;
        coupon_lines: Array<{ code: string; discount: string }>;
        refunds: Array<{ id: number; total: string; reason: string }>;
      }>(`${wcApiBase}/orders/${orderId}`);
      
      const o = response.data;
      
      const output = {
        id: o.id,
        number: o.number,
        status: o.status,
        dates: {
          created: o.date_created,
          modified: o.date_modified,
          completed: o.date_completed,
          paid: o.date_paid,
        },
        totals: {
          subtotal: o.subtotal,
          shipping: o.shipping_total,
          tax: o.total_tax,
          discount: o.discount_total,
          total: `${o.total} ${o.currency}`,
        },
        customer: {
          id: o.customer_id,
          note: o.customer_note,
        },
        billing: o.billing,
        shipping: o.shipping,
        payment: {
          method: o.payment_method,
          title: o.payment_method_title,
          transactionId: o.transaction_id,
        },
        lineItems: o.line_items.map(i => ({
          id: i.id,
          name: i.name,
          productId: i.product_id,
          variationId: i.variation_id,
          sku: i.sku,
          quantity: i.quantity,
          price: i.price,
          subtotal: i.subtotal,
          total: i.total,
        })),
        shippingLines: o.shipping_lines,
        feeLines: o.fee_lines,
        couponLines: o.coupon_lines,
        refunds: o.refunds,
      };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
      };
    }
  );

  server.registerTool(
    'woo_update_order_status',
    {
      title: 'Bestellstatus aktualisieren',
      description: 'Aktualisiert den Status einer Bestellung',
      inputSchema: {
        orderId: z.number().describe('Bestell-ID'),
        status: z.enum(['pending', 'processing', 'on-hold', 'completed', 'cancelled', 'refunded', 'failed']).describe('Neuer Status'),
        note: z.string().optional().describe('Bestellnotiz hinzufügen'),
      },
    },
    async ({ orderId, status, note }) => {
      const updateData: Record<string, unknown> = { status };
      
      if (note) {
        // Add order note separately
        await wpClient.customRequest(
          `${wcApiBase}/orders/${orderId}/notes`,
          'POST',
          { note, customer_note: false }
        );
      }
      
      const response = await wpClient.customRequest<{ id: number; status: string }>(
        `${wcApiBase}/orders/${orderId}`,
        'PUT',
        updateData
      );
      
      return {
        content: [{ type: 'text', text: `Bestellung ${orderId} auf Status "${response.data.status}" aktualisiert` }],
      };
    }
  );

  // ============================================
  // CUSTOMERS
  // ============================================

  server.registerTool(
    'woo_list_customers',
    {
      title: 'WooCommerce Kunden auflisten',
      description: 'Listet WooCommerce Kunden auf',
      inputSchema: {
        page: z.number().optional().default(1).describe('Seite'),
        perPage: z.number().optional().default(20).describe('Kunden pro Seite'),
        search: z.string().optional().describe('Suchbegriff (Email, Name)'),
        role: z.enum(['all', 'administrator', 'customer', 'subscriber']).optional().describe('Rolle'),
      },
    },
    async (params) => {
      const queryParams: Record<string, string | number> = {
        page: params.page || 1,
        per_page: params.perPage || 20,
      };
      
      if (params.search) queryParams.search = params.search;
      if (params.role && params.role !== 'all') queryParams.role = params.role;
      
      const response = await wpClient.customRequest<Array<{
        id: number;
        email: string;
        first_name: string;
        last_name: string;
        username: string;
        date_created: string;
        orders_count: number;
        total_spent: string;
        avatar_url: string;
        billing: Record<string, string>;
      }>>(`${wcApiBase}/customers`, 'GET', undefined, queryParams);
      
      const customers = response.data.map(c => ({
        id: c.id,
        email: c.email,
        name: `${c.first_name} ${c.last_name}`.trim() || c.username,
        username: c.username,
        dateCreated: c.date_created,
        ordersCount: c.orders_count,
        totalSpent: c.total_spent,
        avatar: c.avatar_url,
        billingCity: c.billing?.city || null,
        billingCountry: c.billing?.country || null,
      }));
      
      return {
        content: [{ type: 'text', text: JSON.stringify({ count: customers.length, customers }, null, 2) }],
      };
    }
  );

  // ============================================
  // COUPONS
  // ============================================

  server.registerTool(
    'woo_list_coupons',
    {
      title: 'WooCommerce Gutscheine auflisten',
      description: 'Listet alle WooCommerce Gutscheine/Coupons auf',
      inputSchema: {
        page: z.number().optional().default(1).describe('Seite'),
        perPage: z.number().optional().default(20).describe('Coupons pro Seite'),
        search: z.string().optional().describe('Suchbegriff'),
      },
    },
    async (params) => {
      const queryParams: Record<string, string | number> = {
        page: params.page || 1,
        per_page: params.perPage || 20,
      };
      
      if (params.search) queryParams.search = params.search;
      
      const response = await wpClient.customRequest<Array<{
        id: number;
        code: string;
        amount: string;
        discount_type: string;
        description: string;
        date_expires: string | null;
        usage_count: number;
        usage_limit: number | null;
        free_shipping: boolean;
        minimum_amount: string;
        maximum_amount: string;
      }>>(`${wcApiBase}/coupons`, 'GET', undefined, queryParams);
      
      const coupons = response.data.map(c => ({
        id: c.id,
        code: c.code,
        amount: c.amount,
        discountType: c.discount_type,
        description: c.description,
        expires: c.date_expires,
        usageCount: c.usage_count,
        usageLimit: c.usage_limit,
        freeShipping: c.free_shipping,
        minimumAmount: c.minimum_amount,
        maximumAmount: c.maximum_amount,
      }));
      
      return {
        content: [{ type: 'text', text: JSON.stringify({ count: coupons.length, coupons }, null, 2) }],
      };
    }
  );

  server.registerTool(
    'woo_create_coupon',
    {
      title: 'WooCommerce Gutschein erstellen',
      description: 'Erstellt einen neuen WooCommerce Gutschein',
      inputSchema: {
        code: z.string().describe('Gutscheincode'),
        discountType: z.enum(['percent', 'fixed_cart', 'fixed_product']).describe('Rabatttyp'),
        amount: z.string().describe('Rabattbetrag/Prozent'),
        description: z.string().optional().describe('Beschreibung'),
        dateExpires: z.string().optional().describe('Ablaufdatum (ISO 8601)'),
        usageLimit: z.number().optional().describe('Verwendungslimit gesamt'),
        usageLimitPerUser: z.number().optional().describe('Verwendungslimit pro Kunde'),
        freeShipping: z.boolean().optional().describe('Kostenloser Versand'),
        minimumAmount: z.string().optional().describe('Mindestbestellwert'),
        maximumAmount: z.string().optional().describe('Maximalbestellwert'),
        excludeSaleItems: z.boolean().optional().describe('Sale-Artikel ausschließen'),
        productIds: z.array(z.number()).optional().describe('Nur für diese Produkt-IDs'),
        categoryIds: z.array(z.number()).optional().describe('Nur für diese Kategorie-IDs'),
      },
    },
    async (params) => {
      const couponData: Record<string, unknown> = {
        code: params.code,
        discount_type: params.discountType,
        amount: params.amount,
      };
      
      if (params.description) couponData.description = params.description;
      if (params.dateExpires) couponData.date_expires = params.dateExpires;
      if (params.usageLimit) couponData.usage_limit = params.usageLimit;
      if (params.usageLimitPerUser) couponData.usage_limit_per_user = params.usageLimitPerUser;
      if (params.freeShipping !== undefined) couponData.free_shipping = params.freeShipping;
      if (params.minimumAmount) couponData.minimum_amount = params.minimumAmount;
      if (params.maximumAmount) couponData.maximum_amount = params.maximumAmount;
      if (params.excludeSaleItems !== undefined) couponData.exclude_sale_items = params.excludeSaleItems;
      if (params.productIds) couponData.product_ids = params.productIds;
      if (params.categoryIds) couponData.product_categories = params.categoryIds;
      
      const response = await wpClient.customRequest<{ id: number; code: string }>(
        `${wcApiBase}/coupons`,
        'POST',
        couponData
      );
      
      return {
        content: [{ type: 'text', text: `Gutschein erstellt: ${response.data.code} (ID: ${response.data.id})` }],
      };
    }
  );

  // ============================================
  // REPORTS & ANALYTICS
  // ============================================

  server.registerTool(
    'woo_get_sales_report',
    {
      title: 'WooCommerce Verkaufsreport',
      description: 'Ruft Verkaufsstatistiken ab',
      inputSchema: {
        period: z.enum(['week', 'month', 'last_month', 'year']).optional().default('month').describe('Zeitraum'),
        dateMin: z.string().optional().describe('Start-Datum (YYYY-MM-DD)'),
        dateMax: z.string().optional().describe('End-Datum (YYYY-MM-DD)'),
      },
    },
    async (params) => {
      const queryParams: Record<string, string> = {
        period: params.period || 'month',
      };
      
      if (params.dateMin) queryParams.date_min = params.dateMin;
      if (params.dateMax) queryParams.date_max = params.dateMax;
      
      const response = await wpClient.customRequest<Array<{
        total_sales: string;
        net_sales: string;
        average_sales: string;
        total_orders: number;
        total_items: number;
        total_tax: string;
        total_shipping: string;
        total_refunds: number;
        total_discount: string;
        total_customers: number;
      }>>(`${wcApiBase}/reports/sales`, 'GET', undefined, queryParams);
      
      const report = response.data[0] || {};
      
      const output = {
        period: params.period,
        dateRange: {
          from: params.dateMin || 'N/A',
          to: params.dateMax || 'N/A',
        },
        sales: {
          totalSales: report.total_sales,
          netSales: report.net_sales,
          averageSales: report.average_sales,
        },
        orders: {
          totalOrders: report.total_orders,
          totalItems: report.total_items,
        },
        other: {
          totalTax: report.total_tax,
          totalShipping: report.total_shipping,
          totalRefunds: report.total_refunds,
          totalDiscount: report.total_discount,
          totalCustomers: report.total_customers,
        },
      };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
      };
    }
  );

  server.registerTool(
    'woo_get_top_sellers',
    {
      title: 'WooCommerce Top-Seller',
      description: 'Ruft die meistverkauften Produkte ab',
      inputSchema: {
        period: z.enum(['week', 'month', 'last_month', 'year']).optional().default('month').describe('Zeitraum'),
      },
    },
    async ({ period }) => {
      const response = await wpClient.customRequest<Array<{
        product_id: number;
        title: string;
        quantity: number;
      }>>(`${wcApiBase}/reports/top_sellers`, 'GET', undefined, { period });
      
      const products = response.data.map((p, index) => ({
        rank: index + 1,
        productId: p.product_id,
        title: p.title,
        quantity: p.quantity,
      }));
      
      return {
        content: [{ type: 'text', text: JSON.stringify({ period, topSellers: products }, null, 2) }],
      };
    }
  );

  // ============================================
  // SHOP SETTINGS
  // ============================================

  server.registerTool(
    'woo_get_shop_settings',
    {
      title: 'WooCommerce Shop-Einstellungen',
      description: 'Ruft allgemeine Shop-Einstellungen ab',
      inputSchema: {},
    },
    async () => {
      const [general, currency, products] = await Promise.all([
        wpClient.customRequest<Array<{ id: string; value: unknown }>>(`${wcApiBase}/settings/general`).catch(() => ({ data: [] })),
        wpClient.customRequest<{ currency: string; currency_symbol: string; currency_position: string; thousand_separator: string; decimal_separator: string; number_of_decimals: number }>(`${wcApiBase}/data/currencies/current`).catch(() => ({ data: null })),
        wpClient.customRequest<Array<{ id: string; value: unknown }>>(`${wcApiBase}/settings/products`).catch(() => ({ data: [] })),
      ]);
      
      const generalSettings = general.data.reduce((acc: Record<string, unknown>, s) => {
        acc[s.id] = s.value;
        return acc;
      }, {});
      
      const productSettings = products.data.reduce((acc: Record<string, unknown>, s) => {
        acc[s.id] = s.value;
        return acc;
      }, {});
      
      const output = {
        general: generalSettings,
        currency: currency.data,
        products: productSettings,
      };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
      };
    }
  );

  // ============================================
  // PAYMENT & SHIPPING
  // ============================================

  server.registerTool(
    'woo_list_payment_gateways',
    {
      title: 'Zahlungsmethoden auflisten',
      description: 'Listet alle konfigurierten Zahlungsmethoden auf',
      inputSchema: {},
    },
    async () => {
      const response = await wpClient.customRequest<Array<{
        id: string;
        title: string;
        description: string;
        order: number;
        enabled: boolean;
        method_title: string;
        method_description: string;
        supports: string[];
      }>>(`${wcApiBase}/payment_gateways`);
      
      const gateways = response.data.map(g => ({
        id: g.id,
        title: g.title,
        methodTitle: g.method_title,
        description: g.description,
        enabled: g.enabled,
        order: g.order,
        supports: g.supports,
      }));
      
      return {
        content: [{ type: 'text', text: JSON.stringify({ count: gateways.length, gateways }, null, 2) }],
      };
    }
  );

  server.registerTool(
    'woo_list_shipping_zones',
    {
      title: 'Versandzonen auflisten',
      description: 'Listet alle Versandzonen und deren Methoden auf',
      inputSchema: {},
    },
    async () => {
      const zonesResponse = await wpClient.customRequest<Array<{
        id: number;
        name: string;
        order: number;
      }>>(`${wcApiBase}/shipping/zones`);
      
      const zones = await Promise.all(
        zonesResponse.data.map(async (zone) => {
          const methodsResponse = await wpClient.customRequest<Array<{
            id: number;
            title: string;
            enabled: boolean;
            method_id: string;
            method_title: string;
          }>>(`${wcApiBase}/shipping/zones/${zone.id}/methods`).catch(() => ({ data: [] }));
          
          return {
            id: zone.id,
            name: zone.name,
            order: zone.order,
            methods: methodsResponse.data.map(m => ({
              id: m.id,
              title: m.title,
              methodId: m.method_id,
              methodTitle: m.method_title,
              enabled: m.enabled,
            })),
          };
        })
      );
      
      return {
        content: [{ type: 'text', text: JSON.stringify({ count: zones.length, zones }, null, 2) }],
      };
    }
  );
}
