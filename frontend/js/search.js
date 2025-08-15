// search.js - Search functionality

let searchResults = {
    topics: [],
    resources: [],
    notes: [],
    problems: []
};

// Initialize search page
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    checkURLParams();
});

// Setup event listeners
function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');

    // Real-time search
    searchInput.addEventListener('input', debounce(performSearch, 300));

    // Enter key
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    // Filter checkboxes
    document.querySelectorAll('.form-check-input').forEach(checkbox => {
        checkbox.addEventListener('change', filterResults);
    });
}

// Perform search
window.performSearch = async function () {
    const query = document.getElementById('searchInput').value.trim();

    if (!query) {
        showInitialState();
        return;
    }

    try {
        // Show loading state
        showLoadingState();

        // Search API
        const response = await window.API.search(query);
        searchResults = response.data.results;

        // Update UI
        displayResults(query);

    } catch (error) {
        console.error('Search failed:', error);
        window.DSAApp.showToast('Search failed', 'error');
        showNoResults();
    }
};

// Display results
function displayResults(query) {
    // Hide initial state
    document.getElementById('initialState').style.display = 'none';

    // Show results summary
    const totalResults =
        searchResults.topics.length +
        searchResults.resources.length +
        searchResults.notes.length +
        searchResults.problems.length;

    document.getElementById('resultsCount').textContent = totalResults;
    document.getElementById('searchQuery').textContent = query;
    document.getElementById('resultsSummary').style.display = 'block';

    if (totalResults === 0) {
        showNoResults();
        return;
    }

    // Show filtered results
    filterResults();
}

// Filter results based on checkboxes
function filterResults() {
    const showTopics = document.getElementById('filterTopics').checked;
    const showResources = document.getElementById('filterResources').checked;
    const showNotes = document.getElementById('filterNotes').checked;
    const showProblems = document.getElementById('filterProblems').checked;

    // Topics
    if (showTopics && searchResults.topics.length > 0) {
        displayTopics();
        document.getElementById('topicsResults').style.display = 'block';
    } else {
        document.getElementById('topicsResults').style.display = 'none';
    }

    // Resources
    if (showResources && searchResults.resources.length > 0) {
        displayResources();
        document.getElementById('resourcesResults').style.display = 'block';
    } else {
        document.getElementById('resourcesResults').style.display = 'none';
    }

    // Notes
    if (showNotes && searchResults.notes.length > 0) {
        displayNotes();
        document.getElementById('notesResults').style.display = 'block';
    } else {
        document.getElementById('notesResults').style.display = 'none';
    }

    // Hide no results if any results are shown
    const hasVisibleResults =
        (showTopics && searchResults.topics.length > 0) ||
        (showResources && searchResults.resources.length > 0) ||
        (showNotes && searchResults.notes.length > 0) ||
        (showProblems && searchResults.problems.length > 0);

    document.getElementById('noResults').style.display = hasVisibleResults ? 'none' : 'block';
}

// Display topics
function displayTopics() {
    const container = document.getElementById('topicsContainer');

    container.innerHTML = searchResults.topics.map(topic => `
        <div class="col-lg-4 col-md-6 mb-3">
            <div class="card border-0 shadow-sm rounded-3 hover-shadow">
                <div class="card-body">
                    <h6 class="fw-bold mb-2">
                        <i class="fas fa-book text-primary me-2"></i>
                        ${topic.topic}
                    </h6>
                    <p class="text-muted small mb-2">Week ${topic.week}, Day ${topic.day}</p>
                    <p class="mb-3">${topic.activities}</p>
                    <a href="/roadmap.html?week=${topic.week}&day=${topic.day}" class="btn btn-sm btn-outline-primary">
                        View Topic
                    </a>
                </div>
            </div>
        </div>
    `).join('');
}

// Display resources
function displayResources() {
    const container = document.getElementById('resourcesContainer');

    container.innerHTML = searchResults.resources.map(resource => `
        <div class="col-lg-4 col-md-6 mb-3">
            <div class="card border-0 shadow-sm rounded-3 hover-shadow">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="fw-bold mb-0">
                            <i class="fas fa-${getResourceIcon(resource.type)} text-info me-2"></i>
                            ${resource.title}
                        </h6>
                        <span class="badge bg-secondary">${resource.type}</span>
                    </div>
                    <a href="${resource.url}" target="_blank" class="btn btn-sm btn-outline-info">
                        Open Resource <i class="fas fa-external-link-alt ms-1"></i>
                    </a>
                </div>
            </div>
        </div>
    `).join('');
}

// Display notes
function displayNotes() {
    const container = document.getElementById('notesContainer');

    container.innerHTML = searchResults.notes.map(note => `
        <div class="col-lg-4 col-md-6 mb-3">
            <div class="card border-0 shadow-sm rounded-3 hover-shadow">
                <div class="card-body">
                    <h6 class="fw-bold mb-2">
                        <i class="fas fa-sticky-note text-warning me-2"></i>
                        ${note.title}
                    </h6>
                    <p class="text-muted small mb-3">${note.excerpt}</p>
                    <a href="/notes.html?id=${note.id}" class="btn btn-sm btn-outline-warning">
                        View Note
                    </a>
                </div>
            </div>
        </div>
    `).join('');
}

// Quick search
window.quickSearch = function (query) {
    document.getElementById('searchInput').value = query;
    performSearch();
};

// Show initial state
function showInitialState() {
    document.getElementById('initialState').style.display = 'block';
    document.getElementById('resultsSummary').style.display = 'none';
    document.getElementById('topicsResults').style.display = 'none';
    document.getElementById('resourcesResults').style.display = 'none';
    document.getElementById('notesResults').style.display = 'none';
    document.getElementById('noResults').style.display = 'none';
}

// Show loading state
function showLoadingState() {
    document.getElementById('initialState').style.display = 'none';
    document.getElementById('resultsSummary').style.display = 'none';
    document.getElementById('topicsResults').style.display = 'none';
    document.getElementById('resourcesResults').style.display = 'none';
    document.getElementById('notesResults').style.display = 'none';

    // You could add a loading spinner here
}

// Show no results
function showNoResults() {
    document.getElementById('noResults').style.display = 'block';
}

// Check URL params
function checkURLParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');

    if (query) {
        document.getElementById('searchInput').value = query;
        performSearch();
    }
}

// Helper functions
function getResourceIcon(type) {
    const icons = {
        'text': 'file-alt',
        'video': 'video',
        'interactive': 'laptop-code',
        'practice': 'code'
    };
    return icons[type] || 'link';
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}