// Resources management system
class ResourceManager {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.currentCategory = 'all';
        this.resources = [];
        this.glossaryTerms = [];
    }

    async loadResources() {
        await this.loadResourcesData();
        await this.loadGlossaryData();
        this.renderResources();
        this.setupCategoryListeners();
    }

    async loadResourcesData() {
        try {
            const response = await fetch('resources/dsa_resources.json');
            if (response.ok) {
                const data = await response.json();
                this.resources = this.flattenResources(data);
            } else {
                this.resources = this.getFallbackResources();
            }
        } catch (error) {
            console.error('Error loading resources:', error);
            this.resources = this.getFallbackResources();
        }
    }

    async loadGlossaryData() {
        try {
            const response = await fetch('resources/glossary.json');
            if (response.ok) {
                const data = await response.json();
                this.glossaryTerms = data.terms || [];
            } else {
                this.glossaryTerms = this.getFallbackGlossary();
            }
        } catch (error) {
            console.error('Error loading glossary:', error);
            this.glossaryTerms = this.getFallbackGlossary();
        }
    }

    flattenResources(data) {
        const flattened = [];

        Object.entries(data).forEach(([category, resources]) => {
            if (Array.isArray(resources)) {
                resources.forEach(resource => {
                    flattened.push({
                        ...resource,
                        category: resource.category || category
                    });
                });
            }
        });

        return flattened;
    }

    renderResources() {
        const container = document.getElementById('resources-grid');
        if (!container) return;

        const filteredResources = this.getFilteredResources();

        if (filteredResources.length === 0) {
            container.innerHTML = this.renderEmptyState();
            return;
        }

        container.innerHTML = filteredResources.map((resource, index) => {
            return `
                <div class="col-lg-4 col-md-6 mb-4">
                    <a href="${resource.url}" target="_blank" class="resource-card stagger-item" 
                       style="animation-delay: ${index * 0.1}s"
                       onclick="resources.trackResourceClick('${resource.name}', '${resource.category}')">
                        <div class="resource-icon">
                            <i class="${this.getResourceIcon(resource.category)}"></i>
                        </div>
                        <h6 class="resource-title">${this.escapeHtml(resource.name)}</h6>
                        <p class="resource-description">${this.escapeHtml(resource.description)}</p>
                        
                        ${resource.topics && resource.topics.length > 0 ? `
                            <div class="resource-topics mb-2">
                                ${resource.topics.slice(0, 3).map(topic =>
                `<span class="topic-tag">${topic}</span>`
            ).join('')}
                                ${resource.topics.length > 3 ?
                        `<span class="topic-tag">+${resource.topics.length - 3} more</span>` : ''
                    }
                            </div>
                        ` : ''}
                        
                        <div class="resource-footer">
                            <span class="resource-type">${this.formatCategory(resource.category)}</span>
                            ${resource.rating ? `
                                <div class="resource-rating">
                                    ${this.renderStars(resource.rating)}
                                </div>
                            ` : ''}
                        </div>
                    </a>
                </div>
            `;
        }).join('');
    }

    getFilteredResources() {
        return this.resources.filter(resource => {
            if (this.currentCategory === 'all') return true;
            return resource.category === this.currentCategory;
        }).sort((a, b) => {
            // Sort by rating first, then by name
            if (a.rating !== b.rating) {
                return (b.rating || 0) - (a.rating || 0);
            }
            return a.name.localeCompare(b.name);
        });
    }

    renderEmptyState() {
        return `
            <div class="col-12">
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class="fas fa-book"></i>
                    </div>
                    <h4 class="empty-state-title">No Resources Found</h4>
                    <p class="empty-state-description">
                        No resources found for the "${this.formatCategory(this.currentCategory)}" category.
                        Try selecting a different category.
                    </p>
                    <button class="btn btn-primary" onclick="resources.filterByCategory('all')">
                        <i class="fas fa-list me-2"></i>View All Resources
                    </button>
                </div>
            </div>
        `;
    }

    setupCategoryListeners() {
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentCategory = e.target.dataset.category;
                this.updateCategoryButtons();
                this.renderResources();
            });
        });
    }

    updateCategoryButtons() {
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === this.currentCategory);
        });
    }

    filterByCategory(category) {
        this.currentCategory = category;
        this.updateCategoryButtons();
        this.renderResources();
    }

    trackResourceClick(resourceName, category) {
        // Track resource usage for analytics
        const clickData = {
            resource: resourceName,
            category: category,
            timestamp: new Date().toISOString(),
            userId: this.dashboard.auth?.currentUser?.uid || 'anonymous'
        };

        // Store in user data for analytics
        if (!this.dashboard.userData.resourceClicks) {
            this.dashboard.userData.resourceClicks = [];
        }

        this.dashboard.userData.resourceClicks.push(clickData);
        this.dashboard.saveUserData();

        // Show helpful tip
        setTimeout(() => {
            this.dashboard.showNotification(
                'Resource Opened!',
                `${resourceName} opened in a new tab. Happy learning!`,
                'info'
            );
        }, 500);
    }

    // Glossary functionality
    showGlossaryModal() {
        const modal = new bootstrap.Modal(document.getElementById('glossaryModal'));
        this.renderGlossary();
        modal.show();
    }

    renderGlossary() {
        const container = document.getElementById('glossary-content');
        if (!container) return;

        container.innerHTML = this.glossaryTerms.map(term => `
            <div class="glossary-term mb-3 p-3 border rounded">
                <h6 class="glossary-term-name">${this.escapeHtml(term.term)}</h6>
                <p class="glossary-definition mb-2">${this.escapeHtml(term.definition)}</p>
                
                ${term.examples && term.examples.length > 0 ? `
                    <div class="glossary-examples">
                        <small class="text-muted d-block mb-1">Examples:</small>
                        <div class="examples-list">
                            ${term.examples.map(example =>
            `<span class="badge bg-light text-dark me-1">${example}</span>`
        ).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div class="glossary-category mt-2">
                    <span class="badge bg-primary">${this.formatCategory(term.category)}</span>
                </div>
            </div>
        `).join('');
    }

    searchGlossary() {
        const searchInput = document.getElementById('glossary-search');
        if (!searchInput) return;

        const searchTerm = searchInput.value.toLowerCase().trim();

        const filteredTerms = this.glossaryTerms.filter(term =>
            term.term.toLowerCase().includes(searchTerm) ||
            term.definition.toLowerCase().includes(searchTerm) ||
            (term.examples && term.examples.some(example =>
                example.toLowerCase().includes(searchTerm)
            ))
        );

        const container = document.getElementById('glossary-content');
        if (!container) return;

        if (filteredTerms.length === 0) {
            container.innerHTML = `
                <div class="text-center p-4">
                    <i class="fas fa-search fa-3x text-muted mb-3"></i>
                    <h5>No terms found</h5>
                    <p class="text-muted">Try a different search term</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredTerms.map(term => `
            <div class="glossary-term mb-3 p-3 border rounded">
                <h6 class="glossary-term-name">${this.highlightSearchTerm(term.term, searchTerm)}</h6>
                <p class="glossary-definition mb-2">${this.highlightSearchTerm(term.definition, searchTerm)}</p>
                
                ${term.examples && term.examples.length > 0 ? `
                    <div class="glossary-examples">
                        <small class="text-muted d-block mb-1">Examples:</small>
                        <div class="examples-list">
                            ${term.examples.map(example =>
            `<span class="badge bg-light text-dark me-1">${this.highlightSearchTerm(example, searchTerm)}</span>`
        ).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div class="glossary-category mt-2">
                    <span class="badge bg-primary">${this.formatCategory(term.category)}</span>
                </div>
            </div>
        `).join('');
    }

    highlightSearchTerm(text, searchTerm) {
        if (!searchTerm) return this.escapeHtml(text);

        const regex = new RegExp(`(${searchTerm})`, 'gi');
        return this.escapeHtml(text).replace(regex, '<mark>$1</mark>');
    }

    // Utility methods
    getResourceIcon(category) {
        const iconMap = {
            'visualizer': 'fas fa-eye',
            'video': 'fab fa-youtube',
            'practice': 'fas fa-code',
            'book': 'fas fa-book',
            'tool': 'fas fa-tools',
            'tutorial': 'fas fa-graduation-cap',
            'course': 'fas fa-university',
            'documentation': 'fas fa-file-alt'
        };
        return iconMap[category] || 'fas fa-link';
    }

    formatCategory(category) {
        const categoryMap = {
            'visualizer': 'Visualizer',
            'video': 'Video',
            'practice': 'Practice',
            'book': 'Book',
            'tool': 'Tool',
            'tutorial': 'Tutorial',
            'course': 'Course',
            'documentation': 'Documentation',
            'fundamentals': 'Fundamentals',
            'data-structures': 'Data Structures',
            'algorithms': 'Algorithms',
            'complexity': 'Complexity',
            'techniques': 'Techniques'
        };
        return categoryMap[category] || category.charAt(0).toUpperCase() + category.slice(1);
    }

    renderStars(rating) {
        const maxStars = 5;
        let starsHtml = '';

        for (let i = 1; i <= maxStars; i++) {
            if (i <= rating) {
                starsHtml += '<i class="fas fa-star text-warning"></i>';
            } else {
                starsHtml += '<i class="far fa-star text-muted"></i>';
            }
        }

        return starsHtml;
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    // Fallback data
    getFallbackResources() {
        return [
            {
                name: 'VisuAlgo',
                description: 'Visualizing data structures and algorithms through animation',
                url: 'https://visualgo.net/',
                category: 'visualizer',
                topics: ['arrays', 'trees', 'graphs', 'sorting'],
                rating: 5
            },
            {
                name: 'LeetCode',
                description: 'The world\'s leading online programming learning platform',
                url: 'https://leetcode.com/',
                category: 'practice',
                topics: ['algorithms', 'data-structures', 'interview-prep'],
                rating: 5
            },
            {
                name: 'GeeksforGeeks',
                description: 'A computer science portal for geeks',
                url: 'https://www.geeksforgeeks.org/',
                category: 'tutorial',
                topics: ['algorithms', 'data-structures', 'programming'],
                rating: 4
            }
        ];
    }

    getFallbackGlossary() {
        return [
            {
                term: 'Algorithm',
                definition: 'A step-by-step procedure for solving a problem or performing a computation.',
                category: 'fundamentals',
                examples: ['Bubble Sort', 'Binary Search']
            },
            {
                term: 'Data Structure',
                definition: 'A way of organizing and storing data to enable efficient access and modification.',
                category: 'fundamentals',
                examples: ['Array', 'Linked List', 'Tree', 'Graph']
            },
            {
                term: 'Big O Notation',
                definition: 'Mathematical notation describing the limiting behavior of a function when the argument tends towards infinity.',
                category: 'complexity',
                examples: ['O(1)', 'O(n)', 'O(log n)', 'O(n²)']
            }
        ];
    }

    // Resource recommendations
    getRecommendedResources(topic) {
        return this.resources
            .filter(resource =>
                resource.topics && resource.topics.some(t =>
                    t.toLowerCase().includes(topic.toLowerCase())
                )
            )
            .sort((a, b) => (b.rating || 0) - (a.rating || 0))
            .slice(0, 3);
    }

    showRecommendations(topic) {
        const recommendations = this.getRecommendedResources(topic);

        if (recommendations.length === 0) {
            this.dashboard.showNotification(
                'No Recommendations',
                `No specific resources found for "${topic}". Try browsing all resources.`,
                'info'
            );
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-lightbulb me-2"></i>Recommended Resources for "${topic}"
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            ${recommendations.map(resource => `
                                <div class="col-md-6 col-lg-4 mb-3">
                                    <a href="${resource.url}" target="_blank" class="resource-card h-100">
                                        <div class="resource-icon">
                                            <i class="${this.getResourceIcon(resource.category)}"></i>
                                        </div>
                                        <h6 class="resource-title">${this.escapeHtml(resource.name)}</h6>
                                        <p class="resource-description">${this.escapeHtml(resource.description)}</p>
                                        <div class="resource-footer">
                                            <span class="resource-type">${this.formatCategory(resource.category)}</span>
                                            ${resource.rating ? `
                                                <div class="resource-rating">
                                                    ${this.renderStars(resource.rating)}
                                                </div>
                                            ` : ''}
                                        </div>
                                    </a>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-primary" onclick="dashboard.showPage('resources'); bootstrap.Modal.getInstance(this.closest('.modal')).hide();">
                            Browse All Resources
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();

        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });
    }
}

// Global functions
function showGlossaryModal() {
    if (window.resources) {
        window.resources.showGlossaryModal();
    }
}

function searchGlossary() {
    if (window.resources) {
        window.resources.searchGlossary();
    }
}

// Initialize when dashboard is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.dashboard) {
            window.resources = new ResourceManager(window.dashboard);

            // Override dashboard's loadResources method
            window.dashboard.loadResources = () => {
                window.resources.loadResources();
            };
        }
    }, 100);
});