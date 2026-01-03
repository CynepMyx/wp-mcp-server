/**
 * SEO Tools - Yoast SEO, RankMath, Meta Tags, Schema.org
 * Tools für Suchmaschinenoptimierung
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { WordPressClient } from '../wordpress/client.js';

export function registerSeoTools(server: McpServer, wpClient: WordPressClient) {
  
  // ============================================
  // META TAGS & OPEN GRAPH
  // ============================================

  server.registerTool(
    'seo_get_post_meta',
    {
      title: 'SEO Meta-Daten abrufen',
      description: 'Ruft SEO Meta-Tags eines Posts/einer Seite ab (Yoast, RankMath, oder Standard)',
      inputSchema: {
        postId: z.number().describe('Post/Page ID'),
      },
    },
    async ({ postId }) => {
      const post = await wpClient.getPost(postId);
      const meta = post.data.meta || {};
      
      // Yoast SEO Meta Fields
      const yoastMeta = {
        title: meta._yoast_wpseo_title || null,
        description: meta._yoast_wpseo_metadesc || null,
        focusKeyword: meta._yoast_wpseo_focuskw || null,
        canonicalUrl: meta._yoast_wpseo_canonical || null,
        noIndex: meta._yoast_wpseo_meta_robots_noindex || false,
        noFollow: meta._yoast_wpseo_meta_robots_nofollow || false,
        ogTitle: meta._yoast_wpseo_opengraph_title || null,
        ogDescription: meta._yoast_wpseo_opengraph_description || null,
        ogImage: meta._yoast_wpseo_opengraph_image || null,
        twitterTitle: meta._yoast_wpseo_twitter_title || null,
        twitterDescription: meta._yoast_wpseo_twitter_description || null,
        twitterImage: meta._yoast_wpseo_twitter_image || null,
      };
      
      // RankMath Meta Fields
      const rankMathMeta = {
        title: meta.rank_math_title || null,
        description: meta.rank_math_description || null,
        focusKeyword: meta.rank_math_focus_keyword || null,
        canonicalUrl: meta.rank_math_canonical_url || null,
        robots: meta.rank_math_robots || null,
        ogTitle: meta.rank_math_facebook_title || null,
        ogDescription: meta.rank_math_facebook_description || null,
        ogImage: meta.rank_math_facebook_image || null,
        twitterTitle: meta.rank_math_twitter_title || null,
        twitterDescription: meta.rank_math_twitter_description || null,
        twitterCardType: meta.rank_math_twitter_card_type || null,
        schema: meta.rank_math_schema_Article || meta.rank_math_schema_BlogPosting || null,
      };
      
      // Detect which SEO plugin is active
      const hasYoast = Object.values(yoastMeta).some(v => v !== null);
      const hasRankMath = Object.values(rankMathMeta).some(v => v !== null);
      
      const output = {
        postId,
        postTitle: post.data.title.rendered,
        postSlug: post.data.slug,
        postUrl: post.data.link,
        seoPlugin: hasYoast ? 'Yoast SEO' : hasRankMath ? 'RankMath' : 'None detected',
        yoast: hasYoast ? yoastMeta : null,
        rankMath: hasRankMath ? rankMathMeta : null,
        standardMeta: {
          excerpt: post.data.excerpt?.rendered || null,
        },
      };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
      };
    }
  );

  server.registerTool(
    'seo_update_yoast_meta',
    {
      title: 'Yoast SEO Meta aktualisieren',
      description: 'Aktualisiert Yoast SEO Meta-Daten eines Posts',
      inputSchema: {
        postId: z.number().describe('Post/Page ID'),
        title: z.string().optional().describe('SEO Titel'),
        description: z.string().optional().describe('Meta Description'),
        focusKeyword: z.string().optional().describe('Focus Keyword'),
        canonicalUrl: z.string().optional().describe('Canonical URL'),
        noIndex: z.boolean().optional().describe('NoIndex setzen'),
        noFollow: z.boolean().optional().describe('NoFollow setzen'),
        ogTitle: z.string().optional().describe('Open Graph Titel'),
        ogDescription: z.string().optional().describe('Open Graph Description'),
        ogImage: z.string().optional().describe('Open Graph Image URL'),
        twitterTitle: z.string().optional().describe('Twitter Titel'),
        twitterDescription: z.string().optional().describe('Twitter Description'),
      },
    },
    async ({ postId, title, description, focusKeyword, canonicalUrl, noIndex, noFollow, ogTitle, ogDescription, ogImage, twitterTitle, twitterDescription }) => {
      const meta: Record<string, unknown> = {};
      
      if (title !== undefined) meta._yoast_wpseo_title = title;
      if (description !== undefined) meta._yoast_wpseo_metadesc = description;
      if (focusKeyword !== undefined) meta._yoast_wpseo_focuskw = focusKeyword;
      if (canonicalUrl !== undefined) meta._yoast_wpseo_canonical = canonicalUrl;
      if (noIndex !== undefined) meta._yoast_wpseo_meta_robots_noindex = noIndex ? '1' : '0';
      if (noFollow !== undefined) meta._yoast_wpseo_meta_robots_nofollow = noFollow ? '1' : '0';
      if (ogTitle !== undefined) meta._yoast_wpseo_opengraph_title = ogTitle;
      if (ogDescription !== undefined) meta._yoast_wpseo_opengraph_description = ogDescription;
      if (ogImage !== undefined) meta._yoast_wpseo_opengraph_image = ogImage;
      if (twitterTitle !== undefined) meta._yoast_wpseo_twitter_title = twitterTitle;
      if (twitterDescription !== undefined) meta._yoast_wpseo_twitter_description = twitterDescription;
      
      const response = await wpClient.updatePost(postId, { meta });
      
      return {
        content: [{ type: 'text', text: `Yoast SEO Meta für Post ${postId} aktualisiert` }],
      };
    }
  );

  server.registerTool(
    'seo_update_rankmath_meta',
    {
      title: 'RankMath SEO Meta aktualisieren',
      description: 'Aktualisiert RankMath SEO Meta-Daten eines Posts',
      inputSchema: {
        postId: z.number().describe('Post/Page ID'),
        title: z.string().optional().describe('SEO Titel'),
        description: z.string().optional().describe('Meta Description'),
        focusKeyword: z.string().optional().describe('Focus Keyword'),
        canonicalUrl: z.string().optional().describe('Canonical URL'),
        robots: z.array(z.string()).optional().describe('Robots Directives (noindex, nofollow, etc.)'),
        ogTitle: z.string().optional().describe('Facebook Titel'),
        ogDescription: z.string().optional().describe('Facebook Description'),
        twitterTitle: z.string().optional().describe('Twitter Titel'),
        twitterDescription: z.string().optional().describe('Twitter Description'),
      },
    },
    async ({ postId, title, description, focusKeyword, canonicalUrl, robots, ogTitle, ogDescription, twitterTitle, twitterDescription }) => {
      const meta: Record<string, unknown> = {};
      
      if (title !== undefined) meta.rank_math_title = title;
      if (description !== undefined) meta.rank_math_description = description;
      if (focusKeyword !== undefined) meta.rank_math_focus_keyword = focusKeyword;
      if (canonicalUrl !== undefined) meta.rank_math_canonical_url = canonicalUrl;
      if (robots !== undefined) meta.rank_math_robots = robots;
      if (ogTitle !== undefined) meta.rank_math_facebook_title = ogTitle;
      if (ogDescription !== undefined) meta.rank_math_facebook_description = ogDescription;
      if (twitterTitle !== undefined) meta.rank_math_twitter_title = twitterTitle;
      if (twitterDescription !== undefined) meta.rank_math_twitter_description = twitterDescription;
      
      const response = await wpClient.updatePost(postId, { meta });
      
      return {
        content: [{ type: 'text', text: `RankMath SEO Meta für Post ${postId} aktualisiert` }],
      };
    }
  );

  // ============================================
  // SEO ANALYSIS
  // ============================================

  server.registerTool(
    'seo_analyze_content',
    {
      title: 'SEO Content-Analyse',
      description: 'Analysiert Content auf SEO-Faktoren (Keyword-Dichte, Lesbarkeit, etc.)',
      inputSchema: {
        postId: z.number().describe('Post/Page ID'),
        focusKeyword: z.string().optional().describe('Focus Keyword für Analyse'),
      },
    },
    async ({ postId, focusKeyword }) => {
      const post = await wpClient.getPost(postId);
      const content = post.data.content.rendered;
      const title = post.data.title.rendered;
      
      // Strip HTML
      const textContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      const words = textContent.split(/\s+/);
      const wordCount = words.length;
      const sentences = textContent.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const paragraphs = content.split(/<\/p>/i).filter(p => p.trim().length > 0);
      
      // Keyword Analysis
      let keywordAnalysis = null;
      if (focusKeyword) {
        const keywordLower = focusKeyword.toLowerCase();
        const keywordInTitle = title.toLowerCase().includes(keywordLower);
        const keywordInContent = textContent.toLowerCase().includes(keywordLower);
        const keywordCount = (textContent.toLowerCase().match(new RegExp(keywordLower, 'g')) || []).length;
        const keywordDensity = ((keywordCount / wordCount) * 100).toFixed(2);
        const keywordInFirstParagraph = paragraphs[0]?.toLowerCase().includes(keywordLower) || false;
        const keywordInUrl = post.data.slug.toLowerCase().includes(keywordLower.replace(/\s+/g, '-'));
        
        keywordAnalysis = {
          keyword: focusKeyword,
          inTitle: keywordInTitle,
          inUrl: keywordInUrl,
          inFirstParagraph: keywordInFirstParagraph,
          inContent: keywordInContent,
          count: keywordCount,
          density: `${keywordDensity}%`,
          recommendation: parseFloat(keywordDensity) < 0.5 ? 'Keyword zu selten' :
                          parseFloat(keywordDensity) > 2.5 ? 'Keyword zu häufig (Keyword Stuffing)' :
                          'Gute Keyword-Dichte',
        };
      }
      
      // Title Analysis
      const titleLength = title.length;
      const titleAnalysis = {
        length: titleLength,
        status: titleLength < 30 ? 'Zu kurz' : titleLength > 60 ? 'Zu lang' : 'Optimal',
        recommendation: titleLength < 30 ? 'Titel auf 30-60 Zeichen erweitern' :
                        titleLength > 60 ? 'Titel auf 30-60 Zeichen kürzen' :
                        'Titel hat optimale Länge',
      };
      
      // Meta Description (from excerpt)
      const excerpt = post.data.excerpt.rendered.replace(/<[^>]*>/g, '').trim();
      const excerptLength = excerpt.length;
      const metaDescAnalysis = {
        length: excerptLength,
        status: excerptLength < 120 ? 'Zu kurz' : excerptLength > 160 ? 'Zu lang' : 'Optimal',
        recommendation: excerptLength < 120 ? 'Meta Description auf 120-160 Zeichen erweitern' :
                        excerptLength > 160 ? 'Meta Description auf 120-160 Zeichen kürzen' :
                        'Meta Description hat optimale Länge',
      };
      
      // Content Analysis
      const avgWordsPerSentence = (wordCount / sentences.length).toFixed(1);
      const hasH2 = /<h2/i.test(content);
      const hasH3 = /<h3/i.test(content);
      const hasImages = /<img/i.test(content);
      const hasLinks = /<a\s+href/i.test(content);
      const internalLinks = (content.match(new RegExp(post.data.link.replace(/https?:\/\//, '').split('/')[0], 'gi')) || []).length;
      const externalLinks = (content.match(/<a[^>]+href=["']https?:\/\//gi) || []).length - internalLinks;
      
      const contentAnalysis = {
        wordCount,
        status: wordCount < 300 ? 'Zu kurz' : wordCount > 2500 ? 'Sehr lang' : 'Gut',
        sentenceCount: sentences.length,
        avgWordsPerSentence: parseFloat(avgWordsPerSentence),
        readability: parseFloat(avgWordsPerSentence) > 20 ? 'Schwer lesbar' : 'Gut lesbar',
        paragraphCount: paragraphs.length,
        hasSubheadings: hasH2 || hasH3,
        hasImages,
        hasLinks,
        internalLinks,
        externalLinks,
      };
      
      // Overall Score
      let score = 0;
      if (titleLength >= 30 && titleLength <= 60) score += 15;
      if (excerptLength >= 120 && excerptLength <= 160) score += 15;
      if (wordCount >= 300) score += 15;
      if (hasH2 || hasH3) score += 10;
      if (hasImages) score += 10;
      if (hasLinks) score += 10;
      if (keywordAnalysis?.inTitle) score += 10;
      if (keywordAnalysis?.inFirstParagraph) score += 10;
      if (keywordAnalysis?.density && parseFloat(keywordAnalysis.density) >= 0.5 && parseFloat(keywordAnalysis.density) <= 2.5) score += 5;
      
      const output = {
        postId,
        url: post.data.link,
        overallScore: score,
        scoreStatus: score < 40 ? 'Schlecht' : score < 70 ? 'Verbesserungsbedürftig' : 'Gut',
        titleAnalysis,
        metaDescAnalysis,
        keywordAnalysis,
        contentAnalysis,
        recommendations: [
          !hasH2 && !hasH3 ? 'Füge Zwischenüberschriften (H2/H3) hinzu' : null,
          !hasImages ? 'Füge mindestens ein Bild hinzu' : null,
          wordCount < 300 ? 'Erweitere den Content auf mindestens 300 Wörter' : null,
          externalLinks === 0 ? 'Füge relevante externe Links hinzu' : null,
          internalLinks === 0 ? 'Füge interne Links zu anderen Seiten hinzu' : null,
          keywordAnalysis && !keywordAnalysis.inTitle ? 'Füge das Keyword in den Titel ein' : null,
          keywordAnalysis && !keywordAnalysis.inFirstParagraph ? 'Verwende das Keyword im ersten Absatz' : null,
        ].filter(Boolean),
      };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
      };
    }
  );

  // ============================================
  // SCHEMA.ORG / STRUCTURED DATA
  // ============================================

  server.registerTool(
    'seo_generate_schema',
    {
      title: 'Schema.org JSON-LD generieren',
      description: 'Generiert Schema.org Structured Data für verschiedene Typen',
      inputSchema: {
        type: z.enum(['Article', 'BlogPosting', 'Product', 'LocalBusiness', 'Organization', 'Person', 'Event', 'FAQ', 'HowTo', 'Recipe', 'Review', 'BreadcrumbList'])
          .describe('Schema.org Typ'),
        data: z.record(z.unknown()).describe('Schema-Daten als Objekt'),
      },
    },
    async ({ type, data }) => {
      const baseSchema = {
        '@context': 'https://schema.org',
        '@type': type,
      };
      
      let schema: Record<string, unknown>;
      
      switch (type) {
        case 'Article':
        case 'BlogPosting':
          schema = {
            ...baseSchema,
            headline: data.headline || data.title,
            description: data.description,
            image: data.image,
            author: data.author ? {
              '@type': 'Person',
              name: data.author,
            } : undefined,
            publisher: data.publisher ? {
              '@type': 'Organization',
              name: data.publisher,
              logo: data.publisherLogo ? {
                '@type': 'ImageObject',
                url: data.publisherLogo,
              } : undefined,
            } : undefined,
            datePublished: data.datePublished,
            dateModified: data.dateModified,
            mainEntityOfPage: data.url,
          };
          break;
          
        case 'Product':
          schema = {
            ...baseSchema,
            name: data.name,
            description: data.description,
            image: data.image,
            brand: data.brand ? {
              '@type': 'Brand',
              name: data.brand,
            } : undefined,
            sku: data.sku,
            offers: {
              '@type': 'Offer',
              price: data.price,
              priceCurrency: data.currency || 'EUR',
              availability: data.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
              url: data.url,
            },
            aggregateRating: data.rating ? {
              '@type': 'AggregateRating',
              ratingValue: data.rating,
              reviewCount: data.reviewCount,
            } : undefined,
          };
          break;
          
        case 'LocalBusiness':
          const address = data.address as { street?: string; city?: string; zip?: string; country?: string } | undefined;
          const geo = data.geo as { lat?: number; lng?: number } | undefined;
          schema = {
            ...baseSchema,
            name: data.name,
            description: data.description,
            image: data.image,
            telephone: data.phone,
            email: data.email,
            address: address ? {
              '@type': 'PostalAddress',
              streetAddress: address.street,
              addressLocality: address.city,
              postalCode: address.zip,
              addressCountry: address.country,
            } : undefined,
            geo: geo ? {
              '@type': 'GeoCoordinates',
              latitude: geo.lat,
              longitude: geo.lng,
            } : undefined,
            openingHoursSpecification: data.openingHours,
            priceRange: data.priceRange,
          };
          break;
          
        case 'FAQ':
          schema = {
            ...baseSchema,
            mainEntity: Array.isArray(data.questions) ? data.questions.map((q: { question: string; answer: string }) => ({
              '@type': 'Question',
              name: q.question,
              acceptedAnswer: {
                '@type': 'Answer',
                text: q.answer,
              },
            })) : [],
          };
          break;
          
        case 'BreadcrumbList':
          schema = {
            ...baseSchema,
            itemListElement: Array.isArray(data.items) ? data.items.map((item: { name: string; url: string }, index: number) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: item.name,
              item: item.url,
            })) : [],
          };
          break;
          
        default:
          schema = { ...baseSchema, ...data };
      }
      
      // Clean undefined values
      const cleanSchema = JSON.parse(JSON.stringify(schema));
      
      const output = {
        type,
        jsonLd: cleanSchema,
        htmlSnippet: `<script type="application/ld+json">\n${JSON.stringify(cleanSchema, null, 2)}\n</script>`,
      };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
      };
    }
  );

  server.registerTool(
    'seo_get_schema_from_post',
    {
      title: 'Schema.org aus Post extrahieren',
      description: 'Extrahiert vorhandene Schema.org Daten aus einem Post',
      inputSchema: {
        postId: z.number().describe('Post/Page ID'),
      },
    },
    async ({ postId }) => {
      const post = await wpClient.getPost(postId);
      const content = post.data.content.rendered;
      
      // Find JSON-LD scripts
      const jsonLdMatches = content.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
      
      const schemas = jsonLdMatches.map(match => {
        try {
          const jsonMatch = match.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[1]);
          }
        } catch {
          return null;
        }
        return null;
      }).filter(Boolean);
      
      // Check RankMath schema in meta
      const meta = post.data.meta || {};
      const rankMathSchemas = Object.entries(meta)
        .filter(([key]) => key.startsWith('rank_math_schema_'))
        .map(([key, value]) => ({
          source: 'RankMath',
          type: key.replace('rank_math_schema_', ''),
          data: value,
        }));
      
      const output = {
        postId,
        url: post.data.link,
        embeddedSchemas: schemas,
        rankMathSchemas,
        totalSchemas: schemas.length + rankMathSchemas.length,
      };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
      };
    }
  );

  // ============================================
  // SITEMAP & ROBOTS
  // ============================================

  server.registerTool(
    'seo_get_sitemap_info',
    {
      title: 'Sitemap-Info abrufen',
      description: 'Ruft Informationen über die XML-Sitemap ab',
      inputSchema: {},
    },
    async () => {
      const siteUrl = wpClient['config'].siteUrl;
      
      // Try common sitemap URLs
      const sitemapUrls = [
        `${siteUrl}/sitemap.xml`,
        `${siteUrl}/sitemap_index.xml`,
        `${siteUrl}/wp-sitemap.xml`, // WordPress Core Sitemap (since WP 5.5)
      ];
      
      const results = [];
      
      for (const url of sitemapUrls) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            const content = await response.text();
            const urlCount = (content.match(/<loc>/g) || []).length;
            const sitemapCount = (content.match(/<sitemap>/g) || []).length;
            
            results.push({
              url,
              exists: true,
              type: sitemapCount > 0 ? 'Sitemap Index' : 'Sitemap',
              urlCount: sitemapCount > 0 ? undefined : urlCount,
              sitemapCount: sitemapCount > 0 ? sitemapCount : undefined,
            });
          }
        } catch {
          // Sitemap not found at this URL
        }
      }
      
      // Check robots.txt for sitemap reference
      let robotsTxt = null;
      try {
        const robotsResponse = await fetch(`${siteUrl}/robots.txt`);
        if (robotsResponse.ok) {
          robotsTxt = await robotsResponse.text();
        }
      } catch {
        // No robots.txt
      }
      
      const sitemapInRobots = robotsTxt?.match(/Sitemap:\s*(.+)/gi) || [];
      
      const output = {
        siteUrl,
        sitemaps: results,
        robotsTxt: robotsTxt ? {
          exists: true,
          sitemapReferences: sitemapInRobots.map(s => s.replace('Sitemap:', '').trim()),
          content: robotsTxt.substring(0, 1000) + (robotsTxt.length > 1000 ? '...' : ''),
        } : { exists: false },
      };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
      };
    }
  );

  // ============================================
  // OPEN GRAPH PREVIEW
  // ============================================

  server.registerTool(
    'seo_preview_social',
    {
      title: 'Social Media Preview',
      description: 'Zeigt Vorschau für Social Media Shares (Facebook, Twitter, LinkedIn)',
      inputSchema: {
        postId: z.number().describe('Post/Page ID'),
      },
    },
    async ({ postId }) => {
      const post = await wpClient.getPost(postId);
      const meta = post.data.meta || {};
      
      // Get featured image
      let featuredImage = null;
      if (post.data.featured_media) {
        try {
          const media = await wpClient.getMediaItem(post.data.featured_media);
          featuredImage = media.data.source_url;
        } catch {
          // No featured image
        }
      }
      
      // Yoast data
      const yoastOg = {
        title: (meta._yoast_wpseo_opengraph_title || meta._yoast_wpseo_title || post.data.title.rendered) as string,
        description: (meta._yoast_wpseo_opengraph_description || meta._yoast_wpseo_metadesc || post.data.excerpt.rendered.replace(/<[^>]*>/g, '').trim()) as string,
        image: meta._yoast_wpseo_opengraph_image || featuredImage,
      };
      
      const yoastTwitter = {
        title: (meta._yoast_wpseo_twitter_title || yoastOg.title) as string,
        description: (meta._yoast_wpseo_twitter_description || yoastOg.description) as string,
        image: meta._yoast_wpseo_twitter_image || yoastOg.image,
      };
      
      // RankMath data
      const rankMathOg = {
        title: (meta.rank_math_facebook_title || meta.rank_math_title || post.data.title.rendered) as string,
        description: (meta.rank_math_facebook_description || meta.rank_math_description || post.data.excerpt.rendered.replace(/<[^>]*>/g, '').trim()) as string,
        image: meta.rank_math_facebook_image || featuredImage,
      };
      
      const rankMathTwitter = {
        title: (meta.rank_math_twitter_title || rankMathOg.title) as string,
        description: (meta.rank_math_twitter_description || rankMathOg.description) as string,
        cardType: (meta.rank_math_twitter_card_type || 'summary_large_image') as string,
      };
      
      const output = {
        postId,
        url: post.data.link,
        facebook: {
          title: yoastOg.title || rankMathOg.title,
          description: (yoastOg.description || rankMathOg.description)?.substring(0, 200),
          image: yoastOg.image || rankMathOg.image,
          maxTitleLength: 60,
          maxDescriptionLength: 200,
        },
        twitter: {
          title: yoastTwitter.title || rankMathTwitter.title,
          description: (yoastTwitter.description || rankMathTwitter.description)?.substring(0, 200),
          image: yoastTwitter.image || yoastOg.image,
          cardType: rankMathTwitter.cardType,
          maxTitleLength: 70,
          maxDescriptionLength: 200,
        },
        linkedin: {
          title: yoastOg.title || rankMathOg.title,
          description: (yoastOg.description || rankMathOg.description)?.substring(0, 150),
          image: yoastOg.image || rankMathOg.image,
        },
        recommendations: [
          !featuredImage && !yoastOg.image && !rankMathOg.image ? 'Füge ein Featured Image oder OG Image hinzu' : null,
          (yoastOg.title?.length || 0) > 60 ? 'OG Titel ist zu lang (max. 60 Zeichen)' : null,
          (yoastOg.description?.length || 0) > 200 ? 'OG Description ist zu lang (max. 200 Zeichen)' : null,
        ].filter(Boolean),
      };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
      };
    }
  );

  // ============================================
  // BULK SEO ANALYSIS
  // ============================================

  server.registerTool(
    'seo_bulk_analyze',
    {
      title: 'Bulk SEO Analyse',
      description: 'Analysiert mehrere Posts auf SEO-Probleme',
      inputSchema: {
        postType: z.enum(['post', 'page']).default('post').describe('Post-Typ'),
        limit: z.number().min(1).max(100).default(20).describe('Anzahl der Posts'),
        status: z.enum(['publish', 'draft', 'all']).default('publish').describe('Status-Filter'),
      },
    },
    async ({ postType, limit, status }) => {
      const params: Record<string, string | number> = {
        per_page: limit,
        _fields: 'id,title,slug,link,excerpt,meta,status',
      };
      
      if (status !== 'all') {
        params.status = status;
      }
      
      const endpoint = postType === 'page' ? '/wp/v2/pages' : '/wp/v2/posts';
      const posts = await wpClient.customRequest<Array<{
        id: number;
        title: { rendered: string };
        slug: string;
        link: string;
        excerpt: { rendered: string };
        meta: Record<string, unknown>;
        status: string;
      }>>(endpoint, 'GET', undefined, params);
      
      const issues: Array<{
        postId: number;
        title: string;
        url: string;
        issues: string[];
        score: number;
      }> = [];
      
      for (const post of posts.data) {
        const postIssues: string[] = [];
        let score = 100;
        
        // Title length
        const titleLength = post.title.rendered.length;
        if (titleLength < 30) {
          postIssues.push(`Titel zu kurz (${titleLength} Zeichen)`);
          score -= 15;
        } else if (titleLength > 60) {
          postIssues.push(`Titel zu lang (${titleLength} Zeichen)`);
          score -= 10;
        }
        
        // Meta description
        const excerpt = post.excerpt.rendered.replace(/<[^>]*>/g, '').trim();
        const meta = post.meta || {};
        const metaDesc = (meta._yoast_wpseo_metadesc as string) || (meta.rank_math_description as string) || excerpt;
        
        if (!metaDesc || metaDesc.length < 50) {
          postIssues.push('Meta Description fehlt oder zu kurz');
          score -= 20;
        } else if (metaDesc.length > 160) {
          postIssues.push(`Meta Description zu lang (${metaDesc.length} Zeichen)`);
          score -= 10;
        }
        
        // Focus keyword
        const focusKeyword = (meta._yoast_wpseo_focuskw as string) || (meta.rank_math_focus_keyword as string);
        if (!focusKeyword) {
          postIssues.push('Kein Focus Keyword definiert');
          score -= 15;
        }
        
        // Slug length
        if (post.slug.length > 50) {
          postIssues.push(`URL-Slug zu lang (${post.slug.length} Zeichen)`);
          score -= 5;
        }
        
        if (postIssues.length > 0) {
          issues.push({
            postId: post.id,
            title: post.title.rendered,
            url: post.link,
            issues: postIssues,
            score: Math.max(0, score),
          });
        }
      }
      
      // Sort by score (worst first)
      issues.sort((a, b) => a.score - b.score);
      
      const output = {
        analyzed: posts.data.length,
        withIssues: issues.length,
        withoutIssues: posts.data.length - issues.length,
        averageScore: issues.length > 0 
          ? Math.round(issues.reduce((sum, i) => sum + i.score, 0) / issues.length)
          : 100,
        issues,
      };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
      };
    }
  );
}
