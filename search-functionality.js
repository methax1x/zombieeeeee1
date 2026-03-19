/**
 * Universal Search Functionality for Ghosty Services
 * Provides client-side search for all pages with contextual results
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        minSearchLength: 2,
        maxResults: 10,
        highlightClass: 'search-highlight',
        noResultsMessage: 'No results found',
        searchDelay: 300 // debounce delay in ms
    };

    let searchTimeout = null;
    let searchResults = null;
    let currentResultIndex = -1;

    /**
     * Initialize search functionality
     */
    function init() {
        const searchForm = document.querySelector('#elSearch form');
        const searchInput = document.querySelector('#elSearchField');
        
        if (!searchForm || !searchInput) {
            console.warn('Search elements not found');
            return;
        }

        // Prevent default form submission
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            performSearch(searchInput.value.trim());
        });

        // Real-time search as user types
        searchInput.addEventListener('input', function(e) {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();
            
            if (query.length >= CONFIG.minSearchLength) {
                searchTimeout = setTimeout(() => {
                    performSearch(query);
                }, CONFIG.searchDelay);
            } else {
                hideSearchResults();
            }
        });

        // Handle keyboard navigation
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                hideSearchResults();
            }
        });

        // Close search results when clicking outside
        document.addEventListener('click', function(e) {
            if (!e.target.closest('#elSearch')) {
                hideSearchResults();
            }
        });

        // Create results container
        createResultsContainer();
    }

    /**
     * Create the search results container
     */
    function createResultsContainer() {
        if (document.getElementById('searchResultsContainer')) {
            return;
        }

        const container = document.createElement('div');
        container.id = 'searchResultsContainer';
        container.className = 'search-results-dropdown';
        container.style.display = 'none';
        
        const searchWrapper = document.querySelector('#elSearchWrapper') || document.querySelector('#elSearch');
        if (searchWrapper) {
            searchWrapper.style.position = 'relative';
            searchWrapper.appendChild(container);
        }
    }

    /**
     * Perform search based on current page content
     */
    function performSearch(query) {
        if (!query || query.length < CONFIG.minSearchLength) {
            hideSearchResults();
            return;
        }

        const pageType = detectPageType();
        let results = [];

        switch(pageType) {
            case 'home':
            case 'products':
                results = searchProducts(query);
                break;
            case 'reviews':
                results = searchReviews(query);
                break;
            case 'forum':
                results = searchForum(query);
                break;
            case 'status':
                results = searchStatus(query);
                break;
            case 'guides':
                results = searchGuides(query);
                break;
            case 'support':
                results = searchSupport(query);
                break;
            default:
                results = searchGeneric(query);
        }

        displayResults(results, query);
    }

    /**
     * Detect the current page type
     */
    function detectPageType() {
        const path = window.location.pathname.toLowerCase();
        const fileName = path.split('/').pop() || 'index.html';
        
        if (fileName.includes('forum')) return 'forum';
        if (fileName.includes('review')) return 'reviews';
        if (fileName.includes('status')) return 'status';
        if (fileName.includes('guide')) return 'guides';
        if (fileName.includes('support')) return 'support';
        if (fileName === 'index.html' || fileName === '') return 'home';
        
        // Check for product pages
        const productPages = ['valorant', 'rust', 'fortnite', 'battlefield', 'delta-force', 'hwid'];
        if (productPages.some(p => fileName.includes(p))) return 'products';
        
        return 'generic';
    }

    /**
     * Search products/games
     */
    function searchProducts(query) {
        const results = [];
        const queryLower = query.toLowerCase();
        
        // Search in product cards
        const products = document.querySelectorAll('.cStoreGame, .cStoreGame_name, .statusProduct');
        
        products.forEach(product => {
            const name = product.querySelector('.cStoreGame_name, .statusProduct__title, h3')?.textContent || '';
            const desc = product.querySelector('.statusProduct__desc, p')?.textContent || '';
            const link = product.querySelector('a')?.href || '';
            const img = product.querySelector('img')?.src || '';
            
            const searchText = `${name} ${desc}`.toLowerCase();
            
            if (searchText.includes(queryLower)) {
                results.push({
                    title: name.trim(),
                    description: desc.trim(),
                    link: link,
                    image: img,
                    type: 'product'
                });
            }
        });

        // Also search in page text content
        const sections = document.querySelectorAll('section, .ipsBox');
        sections.forEach(section => {
            const title = section.querySelector('h1, h2, h3, h4')?.textContent || '';
            const text = section.textContent || '';
            
            if (title && text.toLowerCase().includes(queryLower) && results.length < CONFIG.maxResults) {
                // Avoid duplicates
                if (!results.some(r => r.title === title.trim())) {
                    results.push({
                        title: title.trim(),
                        description: extractSnippet(text, query),
                        link: '#',
                        type: 'content',
                        element: section
                    });
                }
            }
        });

        return results.slice(0, CONFIG.maxResults);
    }

    /**
     * Search reviews/vouches
     */
    function searchReviews(query) {
        const results = [];
        const queryLower = query.toLowerCase();
        
        const reviews = document.querySelectorAll('.vouch-item, .review-item, .testimonial');
        
        reviews.forEach(review => {
            const username = review.querySelector('.vouch-username, .review-author')?.textContent || '';
            const text = review.querySelector('.vouch-text, .review-text')?.textContent || '';
            const rating = review.querySelector('.vouch-stars, .rating')?.textContent || '';
            
            const searchText = `${username} ${text}`.toLowerCase();
            
            if (searchText.includes(queryLower)) {
                results.push({
                    title: username.trim(),
                    description: text.trim().substring(0, 150) + (text.length > 150 ? '...' : ''),
                    rating: rating,
                    type: 'review',
                    element: review
                });
            }
        });

        return results.slice(0, CONFIG.maxResults);
    }

    /**
     * Search forum topics
     */
    function searchForum(query) {
        const results = [];
        const queryLower = query.toLowerCase();
        
        // Search in topics
        const topics = document.querySelectorAll('[data-topic-id], .ipsDataItem, .cTopicRow');
        
        topics.forEach(topic => {
            const title = topic.querySelector('.ipsDataItem_title, .ipsType_break, h3, h4')?.textContent || '';
            const desc = topic.querySelector('.ipsDataItem_meta, .ipsType_light, p')?.textContent || '';
            const link = topic.querySelector('a')?.href || '';
            
            const searchText = `${title} ${desc}`.toLowerCase();
            
            if (searchText.includes(queryLower)) {
                results.push({
                    title: title.trim(),
                    description: desc.trim().substring(0, 150) + (desc.length > 150 ? '...' : ''),
                    link: link,
                    type: 'topic',
                    element: topic
                });
            }
        });

        // Search in topic titles and content if available
        const topicElements = document.querySelectorAll('[id*="topic"], .topic-item');
        topicElements.forEach(element => {
            const title = element.querySelector('h1, h2, h3')?.textContent || element.getAttribute('data-title') || '';
            if (title.toLowerCase().includes(queryLower) && results.length < CONFIG.maxResults) {
                if (!results.some(r => r.title === title.trim())) {
                    results.push({
                        title: title.trim(),
                        description: 'Forum topic',
                        type: 'topic',
                        element: element
                    });
                }
            }
        });

        return results.slice(0, CONFIG.maxResults);
    }

    /**
     * Search status page
     */
    function searchStatus(query) {
        const results = [];
        const queryLower = query.toLowerCase();
        
        const statusItems = document.querySelectorAll('.statusProduct, .statusGroup');
        
        statusItems.forEach(item => {
            const title = item.querySelector('.statusProduct__title, .statusGroup__title, h2, h3')?.textContent || '';
            const status = item.querySelector('.status, .statusRow')?.textContent || '';
            const desc = item.querySelector('.statusProduct__desc')?.textContent || '';
            
            const searchText = `${title} ${status} ${desc}`.toLowerCase();
            
            if (searchText.includes(queryLower)) {
                results.push({
                    title: title.trim(),
                    description: status.trim(),
                    type: 'status',
                    element: item
                });
            }
        });

        return results.slice(0, CONFIG.maxResults);
    }

    /**
     * Search guides
     */
    function searchGuides(query) {
        const results = [];
        const queryLower = query.toLowerCase();
        
        const guides = document.querySelectorAll('article, .guide-item, .ipsBox');
        
        guides.forEach(guide => {
            const title = guide.querySelector('h1, h2, h3')?.textContent || '';
            const content = guide.textContent || '';
            
            if (title.toLowerCase().includes(queryLower)) {
                results.push({
                    title: title.trim(),
                    description: extractSnippet(content, query),
                    type: 'guide',
                    element: guide
                });
            }
        });

        return results.slice(0, CONFIG.maxResults);
    }

    /**
     * Search support page
     */
    function searchSupport(query) {
        const results = [];
        const queryLower = query.toLowerCase();
        
        // Search FAQ items, support topics, etc.
        const items = document.querySelectorAll('.faq-item, .support-item, .ipsBox');
        
        items.forEach(item => {
            const title = item.querySelector('h1, h2, h3, h4')?.textContent || '';
            const content = item.textContent || '';
            
            if (content.toLowerCase().includes(queryLower)) {
                results.push({
                    title: title.trim() || 'Support Article',
                    description: extractSnippet(content, query),
                    type: 'support',
                    element: item
                });
            }
        });

        return results.slice(0, CONFIG.maxResults);
    }

    /**
     * Generic search for any page
     */
    function searchGeneric(query) {
        const results = [];
        const queryLower = query.toLowerCase();
        
        // Search all headings and their associated content
        const sections = document.querySelectorAll('section, article, .ipsBox, main');
        
        sections.forEach(section => {
            const heading = section.querySelector('h1, h2, h3, h4, h5')?.textContent || '';
            const content = section.textContent || '';
            
            if (content.toLowerCase().includes(queryLower) && heading) {
                const snippet = extractSnippet(content, query);
                if (snippet && results.length < CONFIG.maxResults) {
                    results.push({
                        title: heading.trim(),
                        description: snippet,
                        type: 'content',
                        element: section
                    });
                }
            }
        });

        return results.slice(0, CONFIG.maxResults);
    }

    /**
     * Extract a snippet of text around the search query
     */
    function extractSnippet(text, query, maxLength = 150) {
        const cleanText = text.replace(/\s+/g, ' ').trim();
        const lowerText = cleanText.toLowerCase();
        const lowerQuery = query.toLowerCase();
        const index = lowerText.indexOf(lowerQuery);
        
        if (index === -1) {
            return cleanText.substring(0, maxLength) + (cleanText.length > maxLength ? '...' : '');
        }
        
        const start = Math.max(0, index - 50);
        const end = Math.min(cleanText.length, index + query.length + 100);
        
        let snippet = cleanText.substring(start, end);
        if (start > 0) snippet = '...' + snippet;
        if (end < cleanText.length) snippet = snippet + '...';
        
        return snippet;
    }

    /**
     * Display search results
     */
    function displayResults(results, query) {
        const container = document.getElementById('searchResultsContainer');
        if (!container) return;

        if (results.length === 0) {
            container.innerHTML = `
                <div class="search-no-results">
                    <i class="fa fa-search"></i>
                    <p>${CONFIG.noResultsMessage} for "${query}"</p>
                </div>
            `;
            container.style.display = 'block';
            return;
        }

        const html = results.map((result, index) => {
            const icon = getIconForType(result.type);
            const title = highlightText(result.title, query);
            const desc = highlightText(result.description, query);
            
            return `
                <div class="search-result-item" data-index="${index}">
                    <div class="search-result-icon">${icon}</div>
                    <div class="search-result-content">
                        <div class="search-result-title">${title}</div>
                        ${desc ? `<div class="search-result-desc">${desc}</div>` : ''}
                        ${result.rating ? `<div class="search-result-rating">${result.rating}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
        container.style.display = 'block';

        // Add click handlers
        container.querySelectorAll('.search-result-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                handleResultClick(results[index]);
            });
        });

        searchResults = results;
    }

    /**
     * Get icon for result type
     */
    function getIconForType(type) {
        const icons = {
            'product': '<i class="fa fa-gamepad"></i>',
            'review': '<i class="fa fa-star"></i>',
            'topic': '<i class="fa fa-comments"></i>',
            'status': '<i class="fa fa-shield-alt"></i>',
            'guide': '<i class="fa fa-book"></i>',
            'support': '<i class="fa fa-life-ring"></i>',
            'content': '<i class="fa fa-file-text"></i>'
        };
        return icons[type] || '<i class="fa fa-search"></i>';
    }

    /**
     * Highlight search query in text
     */
    function highlightText(text, query) {
        if (!text || !query) return text;
        
        const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
        return text.replace(regex, '<mark class="search-highlight">$1</mark>');
    }

    /**
     * Escape regex special characters
     */
    function escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Handle result click
     */
    function handleResultClick(result) {
        if (result.link && result.link !== '#') {
            // Navigate to link
            window.location.href = result.link;
        } else if (result.element) {
            // Scroll to element
            result.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Highlight the element temporarily
            result.element.style.transition = 'background-color 0.3s';
            const originalBg = result.element.style.backgroundColor;
            result.element.style.backgroundColor = 'rgba(0, 94, 255, 0.1)';
            
            setTimeout(() => {
                result.element.style.backgroundColor = originalBg;
            }, 2000);
            
            hideSearchResults();
        }
    }

    /**
     * Hide search results
     */
    function hideSearchResults() {
        const container = document.getElementById('searchResultsContainer');
        if (container) {
            container.style.display = 'none';
        }
        currentResultIndex = -1;
        searchResults = null;
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
