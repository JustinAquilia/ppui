export class FeedLoader {
  constructor() {
    this.apiBase = 'https://strapi-advertorials-xrppc.ondigitalocean.app/api';
    this.apiToken = '7b1cdd7dec14d838179aa383e0686ccf4c171ddf1c0c256127108901d3885db31ca6548a478064cd9c6272beecf86bc2fb297c5185ceedd92b563131ddd3def956321421de8b6ef607b0c2b19f86edc6693ab6e02486ebd49d5c9366f1fead150cbc64938aa7f3ed630d311837c2c3b03ecfc79ad02b085eea50b251ba9f603c';
    this.articles = [];
    this.currentPage = 1;
    this.pageSize = 12;
    this.totalPages = 1;
    this.currentFilter = 'all';
    this.geoData = {};
  }

  async init() {
    try {
      // Load geo data
      await this.loadGeoData();
      
      // Set up filter buttons
      this.setupFilters();
      
      // Load initial articles
      await this.loadArticles();
      
    } catch (error) {
      console.error('Error initializing feed:', error);
      this.showError('Failed to load articles. Please try again later.');
    }
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
        
        if (cachedState) this.geoData.state = cachedState;
        if (cachedCity) this.geoData.city = cachedCity;
        
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

  setupFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        // Update active state
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update filter and reload
        this.currentFilter = btn.dataset.vertical;
        this.currentPage = 1;
        this.loadArticles();
      });
    });
  }

  async loadArticles() {
    try {
      // Show loading state
      document.getElementById('loadingState').style.display = 'block';
      document.getElementById('feedGrid').style.display = 'none';
      document.getElementById('pagination').style.display = 'none';
      
      // Build API URL with filters
      let url = `${this.apiBase}/pp-articles?populate=featured_image,template&pagination[page]=${this.currentPage}&pagination[pageSize]=${this.pageSize}&sort=createdAt:desc`;
      
      // Add vertical filter if not "all"
      if (this.currentFilter !== 'all') {
        url += `&filters[vertical][$eq]=${this.currentFilter}`;
      }
      
      // Fetch articles
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch articles: ${response.status}`);
      }

      const data = await response.json();
      this.articles = data.data || [];
      
      // Update pagination info
      const pagination = data.meta?.pagination;
      if (pagination) {
        this.totalPages = pagination.pageCount;
        this.currentPage = pagination.page;
      }
      
      // Render articles
      this.renderArticles();
      
      // Show content
      document.getElementById('loadingState').style.display = 'none';
      document.getElementById('feedGrid').style.display = 'grid';
      
      // Update pagination
      this.updatePagination();
      
    } catch (error) {
      console.error('Error loading articles:', error);
      this.showError('Failed to load articles. Please try again later.');
    }
  }

  renderArticles() {
    const grid = document.getElementById('feedGrid');
    grid.innerHTML = '';
    
    if (this.articles.length === 0) {
      grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; color:var(--muted); padding:40px;">No articles found.</div>';
      return;
    }
    
    this.articles.forEach(article => {
      const attrs = article.attributes;
      const card = this.createArticleCard(attrs);
      grid.appendChild(card);
    });
  }

  createArticleCard(article) {
    const card = document.createElement('article');
    card.className = 'article-card';
    
    // Get image URL
    let imageUrl = '/placeholder.jpg';
    if (article.featured_image?.data?.attributes) {
      const imageData = article.featured_image.data.attributes;
      imageUrl = imageData.formats?.medium?.url || imageData.formats?.small?.url || imageData.url;
    }
    
    // Process title with tokens
    const title = this.replaceTokens(article.title || article.title_without_tokens);
    
    // Extract excerpt from content
    const excerpt = this.extractExcerpt(article.main_content);
    
    // Format date
    const date = new Date(article.createdAt);
    const formattedDate = date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
    
    // Build article URL
    const articleUrl = `/articles/${article.slug}`;
    
    // Get vertical tag
    const vertical = article.vertical || 'general';
    
    card.innerHTML = `
      <a href="${articleUrl}" style="display:block; color:inherit; text-decoration:none;">
        <img class="article-image" src="${imageUrl}" alt="${title}" loading="lazy">
        <div class="article-content">
          <h2 class="article-title">${title}</h2>
          <p class="article-excerpt">${excerpt}</p>
          <div class="article-meta">
            <span class="article-tag">${vertical}</span>
            <span>${formattedDate}</span>
          </div>
          <div class="read-more">
            Read More →
          </div>
        </div>
      </a>
    `;
    
    return card;
  }

  extractExcerpt(content, maxLength = 150) {
    if (!content) return 'Click to read more...';
    
    // Remove markdown formatting
    let text = content
      .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove bold
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // Remove links
      .replace(/^#+\s+/gm, '')  // Remove headers
      .replace(/^\d+\.\s+/gm, '')  // Remove numbered lists
      .replace(/\n+/g, ' ')  // Replace newlines with spaces
      .trim();
    
    // Replace tokens
    text = this.replaceTokens(text);
    
    // Truncate to max length
    if (text.length > maxLength) {
      text = text.substring(0, maxLength).trim() + '...';
    }
    
    return text;
  }

  replaceTokens(text) {
    if (!text) return text;
    
    const state = this.geoData.state || 'Your State';
    const city = this.geoData.city || 'Your City';
    
    return text
      .replace(/\{state\}/g, state)
      .replace(/\{city\}/g, city);
  }

  updatePagination() {
    const paginationDiv = document.getElementById('pagination');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const pageInfo = document.getElementById('pageInfo');
    
    if (this.totalPages <= 1) {
      paginationDiv.style.display = 'none';
      return;
    }
    
    paginationDiv.style.display = 'flex';
    
    // Update page info
    pageInfo.textContent = `Page ${this.currentPage} of ${this.totalPages}`;
    
    // Update button states
    prevBtn.disabled = this.currentPage <= 1;
    nextBtn.disabled = this.currentPage >= this.totalPages;
  }

  async previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      await this.loadArticles();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  async nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      await this.loadArticles();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  showError(message) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('feedGrid').style.display = 'none';
    const errorElement = document.getElementById('errorState');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
  }
}