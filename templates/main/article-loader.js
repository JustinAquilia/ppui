export class ArticleLoader {
  constructor() {
    this.apiBase = 'https://strapi-advertorials-xrppc.ondigitalocean.app/api';
    this.apiToken = '7b1cdd7dec14d838179aa383e0686ccf4c171ddf1c0c256127108901d3885db31ca6548a478064cd9c6272beecf86bc2fb297c5185ceedd92b563131ddd3def956321421de8b6ef607b0c2b19f86edc6693ab6e02486ebd49d5c9366f1fead150cbc64938aa7f3ed630d311837c2c3b03ecfc79ad02b085eea50b251ba9f603c';
    this.articleData = null;
    this.geoData = {};
  }

  async init() {
    try {
      // Get slug from URL path
      const slug = this.getSlugFromPath();
      
      if (!slug) {
        this.showError('No article specified');
        return;
      }

      // Load geo data first
      await this.loadGeoData();
      
      // Load article from API
      await this.loadArticle(slug);
      
      // Render the article
      this.renderArticle();
      
      // Load ZIP codes
      this.loadZipCodes();
      
    } catch (error) {
      console.error('Error loading article:', error);
      this.showError('Failed to load article. Please try again later.');
    }
  }

  getSlugFromPath() {
    // Extract slug from URL path like /articles/car-care-myths-draining-wallet
    const path = window.location.pathname;
    const match = path.match(/\/articles\/([^\/]+)/);
    return match ? match[1] : null;
  }

  async loadGeoData() {
    try {
      // Check URL params first
      const url = new URL(location.href);
      const stateFromUrl = url.searchParams.get('state');
      const cityFromUrl = url.searchParams.get('city');
      
      if (stateFromUrl) this.geoData.state = stateFromUrl;
      if (cityFromUrl) this.geoData.city = cityFromUrl;
      
      // Try to get from localStorage or API if not in URL
      if (!this.geoData.state || !this.geoData.city) {
        const cachedState = localStorage.getItem('geoState');
        const cachedCity = localStorage.getItem('geoCity');
        const cachedZip = localStorage.getItem('geoZipCode');
        
        if (cachedState) this.geoData.state = cachedState;
        if (cachedCity) this.geoData.city = cachedCity;
        if (cachedZip) this.geoData.zipCode = cachedZip;
        
        // If still missing, fetch from API
        if (!this.geoData.state || !this.geoData.city) {
          try {
            const response = await fetch('https://api.pennypincher.com/geo');
            if (response.ok) {
              const data = await response.json();
              if (data.state) {
                this.geoData.state = data.state;
                localStorage.setItem('geoState', data.state);
              }
              if (data.city) {
                this.geoData.city = data.city;
                localStorage.setItem('geoCity', data.city);
              }
              if (data.postal) {
                this.geoData.zipCode = data.postal;
                localStorage.setItem('geoZipCode', data.postal);
              }
            }
          } catch (e) {
            console.warn('Could not fetch geo data:', e);
          }
        }
      }
      
      // Set defaults if still missing
      if (!this.geoData.state) this.geoData.state = 'Your State';
      if (!this.geoData.city) this.geoData.city = 'Your City';
    } catch (error) {
      console.error('Error loading geo data:', error);
      this.geoData = { state: 'Your State', city: 'Your City' };
    }
  }

  async loadArticle(slug) {
    const url = `${this.apiBase}/pp-articles/?filters[slug][$eq]=${slug}&populate=*&pagination[pageSize]=1`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.apiToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch article: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      throw new Error('Article not found');
    }

    this.articleData = data.data[0].attributes;
  }

  renderArticle() {
    if (!this.articleData) return;

    // Hide loading, show content
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('articleContent').style.display = 'block';

    // Set page title
    const title = this.replaceTokens(this.articleData.title || this.articleData.title_without_tokens);
    document.getElementById('pageTitle').textContent = title;
    document.getElementById('title').textContent = title;

    // Set date (3 days ago)
    const date = new Date();
    date.setDate(date.getDate() - 3);
    document.getElementById('date').textContent = date.toLocaleDateString('en-US', {
      month: 'long',
      day: '2-digit',
      year: 'numeric'
    });

    // Set featured image if available
    if (this.articleData.featured_image?.data?.attributes) {
      const imageData = this.articleData.featured_image.data.attributes;
      const imageUrl = imageData.url || imageData.formats?.large?.url || imageData.formats?.medium?.url;
      
      if (imageUrl) {
        const heroContainer = document.getElementById('heroContainer');
        const featuredImage = document.getElementById('featuredImage');
        featuredImage.src = imageUrl;
        featuredImage.alt = imageData.alternativeText || title;
        heroContainer.style.display = 'block';
      }
    }

    // Check for image override in URL params
    const urlParams = new URLSearchParams(window.location.search);
    const fimg = urlParams.get('fimg');
    if (fimg) {
      document.getElementById('featuredImage').src = fimg;
      document.getElementById('heroContainer').style.display = 'block';
    }

    // Render main content
    const content = this.processContent(this.articleData.main_content);
    document.getElementById('content').innerHTML = content;

    // Update all CTA links
    this.updateCTALinks();

    // Show ZIP section if using ZipCodes component
    if (this.articleData.cta_component === 'ZipCodes') {
      document.getElementById('zipSection').style.display = 'block';
    }

    // Set up popunder if enabled
    if (this.articleData.display_popunder && this.articleData.popunder_url) {
      this.setupPopunder(this.articleData.popunder_url);
    }
  }

  processContent(markdown) {
    // Convert markdown to HTML (basic conversion)
    let html = markdown;
    
    // Replace tokens
    html = this.replaceTokens(html);
    
    // Convert markdown syntax to HTML
    // Headers
    html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
    
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Links with custom text
    html = html.replace(/\[([^\]]+)\]\(link\)/g, (match, text) => {
      const url = this.articleData.cta_url || '#';
      const offerName = this.articleData.offer_name || text;
      return `<a class="ctaLink" href="${url}" target="_blank" rel="noopener">${text.replace('{offer_name}', offerName)}</a>`;
    });
    
    // Numbered lists
    html = html.replace(/^\d+\.\s+(.*?)$/gm, (match, content) => {
      return `<li>${content}</li>`;
    });
    
    // Wrap consecutive list items in <ol>
    html = html.replace(/(<li>.*?<\/li>\s*)+/gs, (match) => {
      return `<ol>${match}</ol>`;
    });
    
    // Paragraphs
    html = html.split('\n\n').map(para => {
      para = para.trim();
      if (para && !para.startsWith('<') && !para.match(/^[\d]+\./)) {
        return `<p>${para}</p>`;
      }
      return para;
    }).join('\n\n');
    
    // Clean up
    html = html.replace(/\n{3,}/g, '\n\n');
    
    return html;
  }

  replaceTokens(text) {
    if (!text) return text;
    
    const state = this.geoData.state || 'Your State';
    const city = this.geoData.city || 'Your City';
    const offerName = this.articleData.offer_name || 'this service';
    
    return text
      .replace(/\{state\}/g, state)
      .replace(/\{city\}/g, city)
      .replace(/\{offer_name\}/g, offerName);
  }

  updateCTALinks() {
    const ctaUrl = this.articleData.cta_url || '#';
    const ctaLinks = document.querySelectorAll('.ctaLink, .btn');
    
    ctaLinks.forEach(link => {
      if (link.href === '#' || link.href.includes('link')) {
        link.href = ctaUrl;
      }
    });
  }

  async loadZipCodes() {
    const container = document.getElementById('zips');
    if (!container) return;
    
    try {
      const response = await fetch('https://api.pennypincher.com/zipcode-radius');
      if (!response.ok) throw new Error('Failed to fetch ZIP codes');
      
      const data = await response.json();
      const zipCodes = data.zip_codes || [];
      
      // Sort and render ZIP codes
      zipCodes
        .sort((a, b) => a.zip_code.localeCompare(b.zip_code))
        .forEach(zip => {
          const link = document.createElement('a');
          link.className = 'zip';
          link.href = this.articleData.cta_url || '#';
          link.target = '_blank';
          link.rel = 'noopener';
          link.textContent = zip.zip_code;
          container.appendChild(link);
        });
    } catch (error) {
      console.error('Error loading ZIP codes:', error);
      container.innerHTML = '<span style="color:#fca5a5">ZIP list unavailable. Try again later.</span>';
    }
  }

  setupPopunder(url) {
    let popunderShown = false;
    
    const showPopunder = () => {
      if (popunderShown) return;
      popunderShown = true;
      
      window.open(url, '_blank');
    };
    
    // Trigger on various user interactions
    document.addEventListener('click', showPopunder, { once: true });
    document.addEventListener('scroll', () => {
      if (window.scrollY > 100) showPopunder();
    }, { once: true });
  }

  showError(message) {
    document.getElementById('loadingState').style.display = 'none';
    const errorElement = document.getElementById('errorState');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
  }
}