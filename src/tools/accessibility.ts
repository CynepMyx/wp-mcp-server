/**
 * Accessibility & Performance Tools
 * MCP Tools für A11Y Prüfung und Performance-Analyse
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod';
import { WordPressClient } from '../wordpress/client.js';

export function registerAccessibilityTools(server: McpServer, wpClient: WordPressClient) {

  // === ACCESSIBILITY CHECKS ===

  server.registerTool(
    'a11y_check_page_structure',
    {
      title: 'Prüfe Seiten-Struktur (A11Y)',
      description: 'Prüft die Accessibility-Struktur einer Seite (Heading-Hierarchie, Landmarks, etc.)',
      inputSchema: {
        postId: z.number().describe('Post/Page ID'),
      },
    },
    async ({ postId }) => {
      const post = await wpClient.getPost(postId);
      const content = post.data?.content?.raw || post.data?.content?.rendered || '';
      
      const analysis = analyzeAccessibility(content);
      
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(analysis, null, 2) }],
      };
    }
  );

  server.registerTool(
    'a11y_check_images',
    {
      title: 'Prüfe Bilder (A11Y)',
      description: 'Prüft alle Bilder auf Alt-Texte und Accessibility',
      inputSchema: {
        postId: z.number().describe('Post/Page ID'),
      },
    },
    async ({ postId }) => {
      const post = await wpClient.getPost(postId);
      const content = post.data?.content?.raw || post.data?.content?.rendered || '';
      
      const analysis = analyzeImages(content);
      
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(analysis, null, 2) }],
      };
    }
  );

  server.registerTool(
    'a11y_check_links',
    {
      title: 'Prüfe Links (A11Y)',
      description: 'Prüft alle Links auf Accessibility (leere Links, generische Texte, etc.)',
      inputSchema: {
        postId: z.number().describe('Post/Page ID'),
      },
    },
    async ({ postId }) => {
      const post = await wpClient.getPost(postId);
      const content = post.data?.content?.raw || post.data?.content?.rendered || '';
      
      const analysis = analyzeLinks(content);
      
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(analysis, null, 2) }],
      };
    }
  );

  server.registerTool(
    'a11y_check_forms',
    {
      title: 'Prüfe Formulare (A11Y)',
      description: 'Prüft Formulare auf Labels, ARIA-Attribute und Accessibility',
      inputSchema: {
        postId: z.number().describe('Post/Page ID'),
      },
    },
    async ({ postId }) => {
      const post = await wpClient.getPost(postId);
      const content = post.data?.content?.raw || post.data?.content?.rendered || '';
      
      const analysis = analyzeForms(content);
      
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(analysis, null, 2) }],
      };
    }
  );

  server.registerTool(
    'a11y_check_color_contrast',
    {
      title: 'Prüfe Farbkontrast',
      description: 'Analysiert die verwendeten Farben auf WCAG-Konformität',
      inputSchema: {
        postId: z.number().optional().describe('Post/Page ID (optional)'),
      },
    },
    async ({ postId }) => {
      let colors: string[] = [];
      
      if (postId) {
        const post = await wpClient.getPost(postId);
        const content = post.data?.content?.raw || post.data?.content?.rendered || '';
        colors = extractColors(content);
      }
      
      // Auch Theme-Farben prüfen
      const themeSettings = await wpClient.getGlobalStylesSettings();
      const palette = themeSettings?.settings?.color?.palette;
      
      if (palette) {
        const themeColors = Array.isArray(palette) ? palette : (palette.theme || []);
        colors.push(...themeColors.map((c: { color: string }) => c.color));
      }
      
      const analysis = analyzeColorContrast(colors);
      
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(analysis, null, 2) }],
      };
    }
  );

  server.registerTool(
    'a11y_generate_report',
    {
      title: 'Generiere A11Y-Report',
      description: 'Erstellt einen vollständigen Accessibility-Report für eine Seite',
      inputSchema: {
        postId: z.number().describe('Post/Page ID'),
      },
    },
    async ({ postId }) => {
      const post = await wpClient.getPost(postId);
      const content = post.data?.content?.raw || post.data?.content?.rendered || '';
      
      const report = {
        postId,
        title: post.data?.title?.rendered || 'Unbekannt',
        url: post.data?.link || '',
        timestamp: new Date().toISOString(),
        structure: analyzeAccessibility(content),
        images: analyzeImages(content),
        links: analyzeLinks(content),
        forms: analyzeForms(content),
        summary: {
          totalIssues: 0,
          errors: 0,
          warnings: 0,
          passed: 0,
        },
        recommendations: [] as string[],
      };
      
      // Zusammenfassung berechnen
      report.summary.errors = 
        report.structure.issues.filter(i => i.severity === 'error').length +
        report.images.issues.filter(i => i.issue).length +
        report.links.issues.filter(i => i.issue).length +
        report.forms.issues.filter(i => i.issue).length;
        
      report.summary.warnings = 
        report.structure.issues.filter(i => i.severity === 'warning').length;
        
      report.summary.totalIssues = report.summary.errors + report.summary.warnings;
      
      // Top-Empfehlungen
      if (report.images.withoutAlt > 0) {
        report.recommendations.push(`${report.images.withoutAlt} Bilder ohne Alt-Text - füge beschreibende Texte hinzu`);
      }
      if (report.structure.issues.some(i => i.type === 'heading-skip')) {
        report.recommendations.push('Heading-Hierarchie korrigieren - keine Ebenen überspringen');
      }
      if (report.links.issues.some(i => i.issue === 'generic-text')) {
        report.recommendations.push('Generische Link-Texte ("hier klicken") durch beschreibende Texte ersetzen');
      }
      
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(report, null, 2) }],
      };
    }
  );

  // === PERFORMANCE CHECKS ===

  server.registerTool(
    'perf_analyze_content',
    {
      title: 'Analysiere Content-Performance',
      description: 'Analysiert den Content auf Performance-Probleme (Bildgrößen, Embeds, etc.)',
      inputSchema: {
        postId: z.number().describe('Post/Page ID'),
      },
    },
    async ({ postId }) => {
      const post = await wpClient.getPost(postId);
      const content = post.data?.content?.raw || post.data?.content?.rendered || '';
      
      const analysis = analyzeContentPerformance(content);
      
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(analysis, null, 2) }],
      };
    }
  );

  server.registerTool(
    'perf_check_images',
    {
      title: 'Prüfe Bild-Performance',
      description: 'Analysiert Bilder auf Größe, Format und Lazy-Loading',
      inputSchema: {
        postId: z.number().describe('Post/Page ID'),
      },
    },
    async ({ postId }) => {
      const post = await wpClient.getPost(postId);
      const content = post.data?.content?.raw || post.data?.content?.rendered || '';
      
      const analysis = analyzeImagePerformance(content);
      
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(analysis, null, 2) }],
      };
    }
  );

  server.registerTool(
    'perf_analyze_plugins',
    {
      title: 'Analysiere Plugin-Impact',
      description: 'Zeigt aktive Plugins und ihren potentiellen Performance-Impact',
      inputSchema: {},
    },
    async () => {
      const plugins = await wpClient.getPlugins() as Array<{
        status: string;
        name: string;
        version: string;
        description?: { rendered?: string };
      }>;
      const activePlugins = plugins.filter(p => p.status === 'active');
      
      const analysis = {
        totalActive: activePlugins.length,
        plugins: activePlugins.map(p => ({
          name: p.name,
          version: p.version,
          description: p.description?.rendered?.substring(0, 100) || '',
        })),
        recommendations: [] as string[],
      };
      
      if (activePlugins.length > 20) {
        analysis.recommendations.push(`${activePlugins.length} aktive Plugins - erwäge Konsolidierung`);
      }
      
      // Bekannte Performance-Plugins prüfen
      const knownHeavy = ['elementor', 'wpbakery', 'revslider', 'slider-revolution'];
      const heavy = activePlugins.filter((p: { name: string }) => 
        knownHeavy.some(h => p.name.toLowerCase().includes(h))
      );
      
      if (heavy.length > 0) {
        analysis.recommendations.push('Ressourcen-intensive Page Builder erkannt - nutze Caching');
      }
      
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(analysis, null, 2) }],
      };
    }
  );

  // === UX ANALYSIS ===

  server.registerTool(
    'ux_analyze_readability',
    {
      title: 'Analysiere Lesbarkeit',
      description: 'Berechnet Lesbarkeits-Metriken (Flesch, durchschnittliche Satzlänge, etc.)',
      inputSchema: {
        postId: z.number().describe('Post/Page ID'),
      },
    },
    async ({ postId }) => {
      const post = await wpClient.getPost(postId);
      const content = post.data?.content?.raw || post.data?.content?.rendered || '';
      
      const analysis = analyzeReadability(content);
      
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(analysis, null, 2) }],
      };
    }
  );

  server.registerTool(
    'ux_analyze_cta',
    {
      title: 'Analysiere Call-to-Actions',
      description: 'Findet und analysiert CTAs auf einer Seite',
      inputSchema: {
        postId: z.number().describe('Post/Page ID'),
      },
    },
    async ({ postId }) => {
      const post = await wpClient.getPost(postId);
      const content = post.data?.content?.raw || post.data?.content?.rendered || '';
      
      const analysis = analyzeCTAs(content);
      
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(analysis, null, 2) }],
      };
    }
  );

  server.registerTool(
    'ux_mobile_friendliness',
    {
      title: 'Prüfe Mobile-Freundlichkeit',
      description: 'Analysiert den Content auf Mobile-Optimierung',
      inputSchema: {
        postId: z.number().describe('Post/Page ID'),
      },
    },
    async ({ postId }) => {
      const post = await wpClient.getPost(postId);
      const content = post.data?.content?.raw || post.data?.content?.rendered || '';
      
      const analysis = analyzeMobileFriendliness(content);
      
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(analysis, null, 2) }],
      };
    }
  );
}

// === HELPER FUNCTIONS ===

interface AccessibilityIssue {
  type: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  element?: string;
}

interface HeadingInfo {
  level: number;
  text: string;
}

function analyzeAccessibility(content: string): {
  score: number;
  issues: AccessibilityIssue[];
  headingStructure: HeadingInfo[];
  landmarks: string[];
  recommendations: string[];
} {
  const issues: AccessibilityIssue[] = [];
  const headingStructure: HeadingInfo[] = [];
  const landmarks: string[] = [];
  const recommendations: string[] = [];
  
  // Heading-Analyse
  const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gi;
  let match;
  let lastLevel = 0;
  
  while ((match = headingRegex.exec(content)) !== null) {
    const level = parseInt(match[1]);
    const text = match[2].replace(/<[^>]+>/g, '').trim();
    
    headingStructure.push({ level, text });
    
    if (lastLevel > 0 && level > lastLevel + 1) {
      issues.push({
        type: 'heading-skip',
        severity: 'error',
        message: `Heading-Ebene übersprungen: h${lastLevel} zu h${level}`,
        element: `<h${level}>${text}</h${level}>`,
      });
    }
    
    lastLevel = level;
  }
  
  // Prüfe ob H1 vorhanden
  if (!headingStructure.some(h => h.level === 1)) {
    issues.push({
      type: 'missing-h1',
      severity: 'error',
      message: 'Keine H1-Überschrift gefunden',
    });
  }
  
  // Prüfe auf mehrere H1
  const h1Count = headingStructure.filter(h => h.level === 1).length;
  if (h1Count > 1) {
    issues.push({
      type: 'multiple-h1',
      severity: 'warning',
      message: `${h1Count} H1-Überschriften gefunden - empfohlen ist eine`,
    });
  }
  
  // Landmarks prüfen
  const landmarkPatterns = [
    { pattern: /<(header|nav|main|footer|aside|section|article)/gi, name: '' },
    { pattern: /role=["'](banner|navigation|main|contentinfo|complementary|region)["']/gi, name: '' },
  ];
  
  for (const { pattern } of landmarkPatterns) {
    let m;
    while ((m = pattern.exec(content)) !== null) {
      landmarks.push(m[1]);
    }
  }
  
  if (!landmarks.some(l => ['main', 'contentinfo'].includes(l.toLowerCase()))) {
    issues.push({
      type: 'missing-landmark',
      severity: 'warning',
      message: 'Keine Haupt-Landmarks (main, contentinfo) gefunden',
    });
  }
  
  // Score berechnen
  const maxScore = 100;
  const errorPenalty = 15;
  const warningPenalty = 5;
  
  const score = Math.max(0, maxScore - 
    (issues.filter(i => i.severity === 'error').length * errorPenalty) -
    (issues.filter(i => i.severity === 'warning').length * warningPenalty)
  );
  
  // Empfehlungen generieren
  if (headingStructure.length === 0) {
    recommendations.push('Füge semantische Überschriften hinzu');
  }
  if (landmarks.length < 3) {
    recommendations.push('Verwende mehr semantische HTML-Elemente (header, nav, main, footer)');
  }
  
  return {
    score,
    issues,
    headingStructure,
    landmarks: [...new Set(landmarks)],
    recommendations,
  };
}

function analyzeImages(content: string): {
  totalImages: number;
  withAlt: number;
  withoutAlt: number;
  decorativeImages: number;
  issues: Array<{
    src: string;
    hasAlt: boolean;
    altText?: string;
    issue?: string;
  }>;
} {
  const issues: Array<{
    src: string;
    hasAlt: boolean;
    altText?: string;
    issue?: string;
  }> = [];
  
  const imgRegex = /<img[^>]+>/gi;
  let totalImages = 0;
  let withAlt = 0;
  let withoutAlt = 0;
  let decorativeImages = 0;
  
  let match;
  while ((match = imgRegex.exec(content)) !== null) {
    totalImages++;
    const imgTag = match[0];
    
    const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);
    const altMatch = imgTag.match(/alt=["']([^"']*)["']/i);
    const src = srcMatch ? srcMatch[1] : 'unknown';
    
    const imageInfo: typeof issues[0] = {
      src,
      hasAlt: false,
    };
    
    if (altMatch) {
      imageInfo.hasAlt = true;
      imageInfo.altText = altMatch[1];
      
      if (altMatch[1] === '') {
        decorativeImages++;
      } else {
        withAlt++;
      }
      
      // Prüfe auf schlechte Alt-Texte
      const badAltPatterns = ['bild', 'image', 'foto', 'photo', 'img', 'grafik'];
      if (badAltPatterns.some(p => altMatch[1].toLowerCase() === p)) {
        imageInfo.issue = 'generic-alt';
      }
    } else {
      withoutAlt++;
      imageInfo.issue = 'missing-alt';
    }
    
    if (imageInfo.issue) {
      issues.push(imageInfo);
    }
  }
  
  return {
    totalImages,
    withAlt,
    withoutAlt,
    decorativeImages,
    issues,
  };
}

function analyzeLinks(content: string): {
  totalLinks: number;
  externalLinks: number;
  internalLinks: number;
  issues: Array<{
    href: string;
    text: string;
    issue: string;
  }>;
} {
  const issues: Array<{
    href: string;
    text: string;
    issue: string;
  }> = [];
  
  const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
  let totalLinks = 0;
  let externalLinks = 0;
  let internalLinks = 0;
  
  const genericTexts = ['hier klicken', 'click here', 'mehr', 'more', 'weiterlesen', 'read more', 'hier', 'here', 'link'];
  
  let match;
  while ((match = linkRegex.exec(content)) !== null) {
    totalLinks++;
    const href = match[1];
    const text = match[2].replace(/<[^>]+>/g, '').trim();
    
    // Externe Links erkennen (http/https ohne relative URLs)
    if (href.startsWith('http://') || href.startsWith('https://')) {
      externalLinks++;
    } else {
      internalLinks++;
    }
    
    // Prüfe auf leere Links
    if (!text) {
      issues.push({
        href,
        text: '(leer)',
        issue: 'empty-link',
      });
    }
    
    // Prüfe auf generische Texte
    if (genericTexts.includes(text.toLowerCase())) {
      issues.push({
        href,
        text,
        issue: 'generic-text',
      });
    }
    
    // Prüfe auf fehlende target-Angabe bei externen Links
    if (href.startsWith('http') && !match[0].includes('target=')) {
      // Nur Info, kein Error
    }
  }
  
  return {
    totalLinks,
    externalLinks,
    internalLinks,
    issues,
  };
}

function analyzeForms(content: string): {
  totalForms: number;
  totalInputs: number;
  issues: Array<{
    element: string;
    issue: string;
  }>;
} {
  const issues: Array<{
    element: string;
    issue: string;
  }> = [];
  
  const formRegex = /<form[^>]*>[\s\S]*?<\/form>/gi;
  const inputRegex = /<(input|textarea|select)[^>]*>/gi;
  const labelRegex = /<label[^>]*for=["']([^"']+)["'][^>]*>/gi;
  
  let totalForms = 0;
  let totalInputs = 0;
  
  // Sammle alle Labels
  const labels = new Set<string>();
  let labelMatch;
  while ((labelMatch = labelRegex.exec(content)) !== null) {
    labels.add(labelMatch[1]);
  }
  
  // Prüfe Formulare
  let formMatch;
  while ((formMatch = formRegex.exec(content)) !== null) {
    totalForms++;
  }
  
  // Prüfe Inputs
  let inputMatch;
  while ((inputMatch = inputRegex.exec(content)) !== null) {
    totalInputs++;
    const tag = inputMatch[0];
    
    // Prüfe auf ID für Label-Verknüpfung
    const idMatch = tag.match(/id=["']([^"']+)["']/i);
    const typeMatch = tag.match(/type=["']([^"']+)["']/i);
    const ariaLabel = tag.match(/aria-label(ledby)?=/i);
    
    // Hidden inputs brauchen keine Labels
    if (typeMatch && typeMatch[1] === 'hidden') {
      continue;
    }
    
    // Submit buttons brauchen keine Labels
    if (typeMatch && ['submit', 'button', 'reset'].includes(typeMatch[1])) {
      continue;
    }
    
    if (!idMatch && !ariaLabel) {
      issues.push({
        element: tag.substring(0, 80),
        issue: 'missing-label',
      });
    } else if (idMatch && !labels.has(idMatch[1]) && !ariaLabel) {
      issues.push({
        element: tag.substring(0, 80),
        issue: 'no-associated-label',
      });
    }
  }
  
  return {
    totalForms,
    totalInputs,
    issues,
  };
}

function extractColors(content: string): string[] {
  const colors: string[] = [];
  
  // Hex colors
  const hexRegex = /#([0-9a-f]{3}|[0-9a-f]{6})\b/gi;
  let match;
  while ((match = hexRegex.exec(content)) !== null) {
    colors.push(match[0]);
  }
  
  // RGB/RGBA
  const rgbRegex = /rgba?\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)/gi;
  while ((match = rgbRegex.exec(content)) !== null) {
    colors.push(match[0]);
  }
  
  return [...new Set(colors)];
}

function analyzeColorContrast(colors: string[]): {
  colorsFound: number;
  colorPairs: Array<{
    foreground: string;
    background: string;
    ratio: number;
    wcagAA: boolean;
    wcagAAA: boolean;
  }>;
  recommendations: string[];
} {
  const recommendations: string[] = [];
  
  // Vereinfachte Analyse - für echte Kontrast-Berechnung wäre mehr nötig
  if (colors.length === 0) {
    recommendations.push('Keine Farben im Content gefunden');
  }
  
  if (colors.length > 0) {
    recommendations.push('Prüfe Farbkontraste manuell mit Tools wie WebAIM Contrast Checker');
    recommendations.push('WCAG AA erfordert 4.5:1 für normalen Text, 3:1 für großen Text');
  }
  
  return {
    colorsFound: colors.length,
    colorPairs: [],
    recommendations,
  };
}

function analyzeContentPerformance(content: string): {
  contentSize: number;
  imageCount: number;
  iframeCount: number;
  scriptCount: number;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  const contentSize = content.length;
  const imageCount = (content.match(/<img/gi) || []).length;
  const iframeCount = (content.match(/<iframe/gi) || []).length;
  const scriptCount = (content.match(/<script/gi) || []).length;
  
  if (contentSize > 500000) {
    issues.push('Content ist sehr groß (>500KB)');
    recommendations.push('Erwäge Content-Splitting oder Lazy-Loading');
  }
  
  if (imageCount > 20) {
    issues.push(`${imageCount} Bilder gefunden`);
    recommendations.push('Aktiviere Lazy-Loading für Bilder');
  }
  
  if (iframeCount > 3) {
    issues.push(`${iframeCount} iframes gefunden`);
    recommendations.push('Reduziere Embeds oder lade sie erst bei Interaktion');
  }
  
  if (scriptCount > 0) {
    issues.push(`${scriptCount} inline Scripts gefunden`);
    recommendations.push('Verlagere Scripts in externe Dateien');
  }
  
  return {
    contentSize,
    imageCount,
    iframeCount,
    scriptCount,
    issues,
    recommendations,
  };
}

function analyzeImagePerformance(content: string): {
  images: Array<{
    src: string;
    hasLazyLoading: boolean;
    hasWidthHeight: boolean;
    format: string;
  }>;
  recommendations: string[];
} {
  const images: Array<{
    src: string;
    hasLazyLoading: boolean;
    hasWidthHeight: boolean;
    format: string;
  }> = [];
  const recommendations: string[] = [];
  
  const imgRegex = /<img[^>]+>/gi;
  let match;
  
  while ((match = imgRegex.exec(content)) !== null) {
    const tag = match[0];
    const srcMatch = tag.match(/src=["']([^"']+)["']/i);
    const src = srcMatch ? srcMatch[1] : 'unknown';
    
    const hasLazyLoading = tag.includes('loading="lazy"') || tag.includes("loading='lazy'");
    const hasWidthHeight = tag.includes('width=') && tag.includes('height=');
    
    const format = src.match(/\.(jpg|jpeg|png|gif|webp|avif|svg)/i)?.[1] || 'unknown';
    
    images.push({
      src: src.substring(0, 100),
      hasLazyLoading,
      hasWidthHeight,
      format: format.toLowerCase(),
    });
  }
  
  const withoutLazy = images.filter(i => !i.hasLazyLoading).length;
  const withoutDimensions = images.filter(i => !i.hasWidthHeight).length;
  const oldFormats = images.filter(i => ['jpg', 'jpeg', 'png'].includes(i.format)).length;
  
  if (withoutLazy > 0) {
    recommendations.push(`${withoutLazy} Bilder ohne Lazy-Loading`);
  }
  if (withoutDimensions > 0) {
    recommendations.push(`${withoutDimensions} Bilder ohne Width/Height - verursacht Layout-Shift`);
  }
  if (oldFormats > 0 && images.length > 5) {
    recommendations.push('Erwäge moderne Bildformate (WebP, AVIF)');
  }
  
  return {
    images,
    recommendations,
  };
}

function analyzeReadability(content: string): {
  wordCount: number;
  sentenceCount: number;
  avgWordsPerSentence: number;
  paragraphCount: number;
  readabilityScore: string;
  recommendations: string[];
} {
  // Text extrahieren
  const text = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const paragraphs = (content.match(/<p[^>]*>/gi) || []).length;
  
  const wordCount = words.length;
  const sentenceCount = sentences.length;
  const avgWordsPerSentence = sentenceCount > 0 ? Math.round(wordCount / sentenceCount) : 0;
  
  const recommendations: string[] = [];
  let readabilityScore = 'Gut';
  
  if (avgWordsPerSentence > 25) {
    readabilityScore = 'Schwer';
    recommendations.push('Durchschnittliche Satzlänge ist hoch - kürze Sätze');
  } else if (avgWordsPerSentence > 20) {
    readabilityScore = 'Mittel';
    recommendations.push('Erwäge kürzere Sätze für bessere Lesbarkeit');
  }
  
  if (paragraphs < 3 && wordCount > 300) {
    recommendations.push('Teile den Text in mehr Absätze auf');
  }
  
  return {
    wordCount,
    sentenceCount,
    avgWordsPerSentence,
    paragraphCount: paragraphs,
    readabilityScore,
    recommendations,
  };
}

function analyzeCTAs(content: string): {
  ctas: Array<{
    text: string;
    type: 'button' | 'link' | 'form';
    href?: string;
  }>;
  recommendations: string[];
} {
  const ctas: Array<{
    text: string;
    type: 'button' | 'link' | 'form';
    href?: string;
  }> = [];
  const recommendations: string[] = [];
  
  // Buttons
  const buttonRegex = /<button[^>]*>(.*?)<\/button>/gi;
  let match;
  while ((match = buttonRegex.exec(content)) !== null) {
    const text = match[1].replace(/<[^>]+>/g, '').trim();
    if (text) {
      ctas.push({ text, type: 'button' });
    }
  }
  
  // Links mit CTA-Klassen
  const linkRegex = /<a[^>]*class=["'][^"']*(?:btn|button|cta)[^"']*["'][^>]*>(.*?)<\/a>/gi;
  while ((match = linkRegex.exec(content)) !== null) {
    const text = match[1].replace(/<[^>]+>/g, '').trim();
    const hrefMatch = match[0].match(/href=["']([^"']+)["']/i);
    if (text) {
      ctas.push({ text, type: 'link', href: hrefMatch?.[1] });
    }
  }
  
  if (ctas.length === 0) {
    recommendations.push('Keine CTAs gefunden - füge klare Handlungsaufforderungen hinzu');
  } else if (ctas.length > 5) {
    recommendations.push('Viele CTAs können verwirrend sein - fokussiere auf Hauptaktionen');
  }
  
  return {
    ctas,
    recommendations,
  };
}

function analyzeMobileFriendliness(content: string): {
  issues: string[];
  positives: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const positives: string[] = [];
  const recommendations: string[] = [];
  
  // Prüfe auf feste Breiten
  if (content.match(/width\s*:\s*\d+px/gi)) {
    issues.push('Feste Pixel-Breiten gefunden');
    recommendations.push('Verwende relative Einheiten (%, vw) statt fester Pixel');
  }
  
  // Prüfe auf kleine Schriftgrößen
  const fontSizeMatches = content.match(/font-size\s*:\s*(\d+)px/gi);
  if (fontSizeMatches) {
    const smallFonts = fontSizeMatches.filter(m => parseInt(m.match(/\d+/)?.[0] || '16') < 14);
    if (smallFonts.length > 0) {
      issues.push('Kleine Schriftgrößen (<14px) gefunden');
      recommendations.push('Mindestens 16px für Fließtext auf Mobile');
    }
  }
  
  // Positive Checks
  if (content.includes('srcset=')) {
    positives.push('Responsive Images (srcset) werden verwendet');
  }
  
  if (content.includes('@media')) {
    positives.push('Media Queries gefunden');
  }
  
  if (content.includes('loading="lazy"')) {
    positives.push('Lazy Loading wird verwendet');
  }
  
  return {
    issues,
    positives,
    recommendations,
  };
}
