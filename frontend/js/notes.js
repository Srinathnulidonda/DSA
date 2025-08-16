// Notes management functionality

class NotesManager {
    constructor() {
        this.notes = [];
        this.filteredNotes = [];
        this.currentFilter = 'all';
        this.currentSort = 'updated';
        this.viewMode = 'grid'; // grid or list
        this.searchQuery = '';
        this.selectedNote = null;
        this.init();
    }

    async init() {
        await this.loadNotes();
        this.setupEventListeners();
        this.loadPopularTags();
        this.renderNotes();
        this.checkNoteContext();
    }

    async loadNotes() {
        try {
            const response = await api.get(API_ENDPOINTS.notes);
            this.notes = response.notes || [];
            this.filteredNotes = [...this.notes];
        } catch (error) {
            console.error('Failed to load notes:', error);
            this.notes = [];
            this.filteredNotes = [];
        }
    }

    setupEventListeners() {
        // New note button
        const newNoteBtn = document.getElementById('newNoteBtn');
        const fabButton = document.getElementById('fabButton');

        [newNoteBtn, fabButton].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => {
                    this.showNoteModal();
                });
            }
        });

        // View mode toggles
        const gridViewBtn = document.getElementById('gridViewBtn');
        const listViewBtn = document.getElementById('listViewBtn');

        if (gridViewBtn) {
            gridViewBtn.addEventListener('click', () => {
                this.switchViewMode('grid');
            });
        }

        if (listViewBtn) {
            listViewBtn.addEventListener('click', () => {
                this.switchViewMode('list');
            });
        }

        // Filter buttons
        const filterButtons = ['filterAll', 'filterPinned', 'filterRecent'];
        filterButtons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.addEventListener('click', () => {
                    this.setFilter(btnId.replace('filter', '').toLowerCase());
                });
            }
        });

        // Topic and sort filters
        const topicFilter = document.getElementById('topicFilter');
        const sortBy = document.getElementById('sortBy');

        if (topicFilter) {
            topicFilter.addEventListener('change', () => {
                this.applyFilters();
            });
        }

        if (sortBy) {
            sortBy.addEventListener('change', () => {
                this.currentSort = sortBy.value;
                this.applyFilters();
            });
        }

        // Search functionality
        const searchNotes = document.getElementById('searchNotes');
        const mobileSearchInput = document.getElementById('mobileSearchInput');

        [searchNotes, mobileSearchInput].forEach(input => {
            if (input) {
                input.addEventListener('input', this.debounce((e) => {
                    this.searchQuery = e.target.value.trim();
                    this.applyFilters();
                }, 300));
            }
        });

        // Note form
        const noteForm = document.getElementById('noteForm');
        if (noteForm) {
            noteForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveNote();
            });
        }

        // Note modal
        const saveNoteBtn = document.getElementById('saveNoteBtn');
        const closeNoteModal = document.getElementById('closeNoteModal');
        const pinNoteBtn = document.getElementById('pinNoteBtn');

        if (saveNoteBtn) {
            saveNoteBtn.addEventListener('click', () => {
                this.saveNote();
            });
        }

        if (closeNoteModal) {
            closeNoteModal.addEventListener('click', () => {
                modalManager.close('noteModal');
            });
        }

        if (pinNoteBtn) {
            pinNoteBtn.addEventListener('click', () => {
                this.togglePin();
            });
        }

        // Delete confirmation
        const cancelDelete = document.getElementById('cancelDelete');
        const confirmDelete = document.getElementById('confirmDelete');

        if (cancelDelete) {
            cancelDelete.addEventListener('click', () => {
                modalManager.close('deleteConfirmModal');
            });
        }

        if (confirmDelete) {
            confirmDelete.addEventListener('click', () => {
                this.confirmDelete();
            });
        }

        // Mobile search toggle
        this.setupMobileSearch();
    }

    setupMobileSearch() {
        if (!mobileUtils.isMobile()) return;

        const searchBtn = document.createElement('button');
        searchBtn.className = 'p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300';
        searchBtn.innerHTML = '<i class="bi bi-search text-xl"></i>';

        const navbar = document.querySelector('nav .flex.items-center.space-x-4');
        if (navbar) {
            navbar.insertBefore(searchBtn, navbar.firstChild);
        }

        const mobileSearch = document.getElementById('mobileSearch');

        searchBtn.addEventListener('click', () => {
            if (mobileSearch) {
                mobileSearch.classList.toggle('-translate-y-full');
            }
        });
    }

    checkNoteContext() {
        // Check if we're coming from roadmap with context
        const noteContext = storage.get('noteContext');
        if (noteContext) {
            this.showNoteModal(noteContext);
            storage.remove('noteContext');
        }

        // Check if there's a topic from pomodoro
        const pomodoroTopic = storage.get('pomodoroTopic');
        if (pomodoroTopic) {
            this.showNoteModal({ topic: pomodoroTopic });
            storage.remove('pomodoroTopic');
        }
    }

    renderNotes() {
        const container = document.getElementById('notesContainer');
        const emptyState = document.getElementById('emptyState');

        if (!container) return;

        if (this.filteredNotes.length === 0) {
            container.classList.add('hidden');
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }

        if (emptyState) emptyState.classList.add('hidden');
        container.classList.remove('hidden');

        // Update container classes based on view mode
        if (this.viewMode === 'grid') {
            container.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
        } else {
            container.className = 'space-y-4';
        }

        container.innerHTML = this.filteredNotes.map(note =>
            this.viewMode === 'grid' ? this.createNoteCard(note) : this.createNoteListItem(note)
        ).join('');
    }

    createNoteCard(note) {
        const preview = this.getContentPreview(note.content, 150);
        const tags = note.tags || [];

        return `
            <div class="note-card bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 cursor-pointer hover:shadow-lg transition-all duration-200 ${note.is_pinned ? 'ring-2 ring-yellow-400 border-yellow-400' : ''
            }" onclick="notesManager.editNote('${note.id}')">
                
                <!-- Header -->
                <div class="flex items-start justify-between mb-3">
                    <h3 class="font-semibold text-gray-900 dark:text-white line-clamp-2 flex-1">${note.title}</h3>
                    <div class="flex items-center space-x-2 ml-2">
                        ${note.is_pinned ? '<i class="bi bi-pin-fill text-yellow-500"></i>' : ''}
                        <div class="relative">
                            <button onclick="event.stopPropagation(); notesManager.showNoteMenu('${note.id}', event)" 
                                    class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded">
                                <i class="bi bi-three-dots-vertical"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Content Preview -->
                <p class="text-gray-600 dark:text-gray-400 text-sm line-clamp-4 mb-4">${preview}</p>

                <!-- Tags -->
                ${tags.length > 0 ? `
                    <div class="flex flex-wrap gap-2 mb-4">
                        ${tags.slice(0, 3).map(tag => `
                            <span class="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                                ${tag}
                            </span>
                        `).join('')}
                        ${tags.length > 3 ? `<span class="text-xs text-gray-500">+${tags.length - 3}</span>` : ''}
                    </div>
                ` : ''}

                <!-- Footer -->
                <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>${dateUtils.formatRelative(note.updated_at)}</span>
                    <div class="flex items-center space-x-3">
                        ${note.topic ? `<span class="capitalize">${note.topic}</span>` : ''}
                        ${note.week ? `<span>Week ${note.week}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    createNoteListItem(note) {
        const preview = this.getContentPreview(note.content, 200);
        const tags = note.tags || [];

        return `
            <div class="note-card bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${note.is_pinned ? 'border-l-4 border-l-yellow-400' : ''
            }" onclick="notesManager.editNote('${note.id}')">
                
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <div class="flex items-center space-x-2 mb-2">
                            ${note.is_pinned ? '<i class="bi bi-pin-fill text-yellow-500"></i>' : ''}
                            <h3 class="font-semibold text-gray-900 dark:text-white">${note.title}</h3>
                        </div>
                        
                        <p class="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-3">${preview}</p>
                        
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                                <span>${dateUtils.formatRelative(note.updated_at)}</span>
                                ${note.topic ? `<span class="capitalize">${note.topic}</span>` : ''}
                                ${note.week ? `<span>Week ${note.week}</span>` : ''}
                            </div>
                            
                            ${tags.length > 0 ? `
                                <div class="flex flex-wrap gap-1">
                                    ${tags.slice(0, 2).map(tag => `
                                        <span class="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
                                            ${tag}
                                        </span>
                                    `).join('')}
                                    ${tags.length > 2 ? `<span class="text-xs text-gray-500">+${tags.length - 2}</span>` : ''}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <button onclick="event.stopPropagation(); notesManager.showNoteMenu('${note.id}', event)" 
                            class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded ml-4">
                        <i class="bi bi-three-dots-vertical"></i>
                    </button>
                </div>
            </div>
        `;
    }

    getContentPreview(content, maxLength = 150) {
        if (!content) return 'No content';

        // Strip HTML tags if any
        const textContent = content.replace(/<[^>]*>/g, '');

        if (textContent.length <= maxLength) {
            return textContent;
        }

        return textContent.substring(0, maxLength).trim() + '...';
    }

    showNoteMenu(noteId, event) {
        event.stopPropagation();

        // Remove existing menu
        const existingMenu = document.getElementById('noteContextMenu');
        if (existingMenu) {
            existingMenu.remove();
        }

        const note = this.notes.find(n => n.id === noteId);
        if (!note) return;

        const menu = document.createElement('div');
        menu.id = 'noteContextMenu';
        menu.className = 'absolute bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-2 z-50';
        menu.style.left = `${event.clientX}px`;
        menu.style.top = `${event.clientY}px`;

        menu.innerHTML = `
            <button onclick="notesManager.editNote('${noteId}')" class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                <i class="bi bi-pencil mr-2"></i>Edit
            </button>
            <button onclick="notesManager.toggleNotePin('${noteId}')" class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                <i class="bi bi-pin mr-2"></i>${note.is_pinned ? 'Unpin' : 'Pin'}
            </button>
            <button onclick="notesManager.duplicateNote('${noteId}')" class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                <i class="bi bi-files mr-2"></i>Duplicate
            </button>
            <hr class="my-1 border-gray-200 dark:border-gray-700">
            <button onclick="notesManager.deleteNote('${noteId}')" class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700">
                <i class="bi bi-trash mr-2"></i>Delete
            </button>
        `;

        document.body.appendChild(menu);

        // Close menu when clicking outside
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };

        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 10);
    }

    showNoteModal(context = null) {
        const modal = document.getElementById('noteModal');
        const form = document.getElementById('noteForm');
        const title = document.getElementById('noteModalTitle');

        if (!modal || !form) return;

        // Reset form
        form.reset();
        document.getElementById('noteId').value = '';

        if (context && context.week && context.day) {
            title.textContent = `New Note - Week ${context.week}, Day ${context.day}`;
            document.getElementById('noteWeek').value = context.week;
            document.getElementById('noteTitle').placeholder = `Week ${context.week}, Day ${context.day} notes...`;
        } else if (context && context.topic) {
            title.textContent = 'New Note';
            document.getElementById('noteTitle').value = context.topic;
        } else {
            title.textContent = 'New Note';
        }

        // Update pin button state
        const pinBtn = document.getElementById('pinNoteBtn');
        if (pinBtn) {
            pinBtn.classList.remove('text-yellow-500');
            pinBtn.classList.add('text-gray-400');
        }

        modalManager.open('noteModal');

        // Focus on title field
        setTimeout(() => {
            document.getElementById('noteTitle').focus();
        }, 100);
    }

    editNote(noteId) {
        const note = this.notes.find(n => n.id === noteId);
        if (!note) return;

        const modal = document.getElementById('noteModal');
        const title = document.getElementById('noteModalTitle');

        if (!modal) return;

        // Populate form
        document.getElementById('noteId').value = note.id;
        document.getElementById('noteTitle').value = note.title;
        document.getElementById('noteContent').value = note.content;
        document.getElementById('noteTopic').value = note.topic || '';
        document.getElementById('noteWeek').value = note.week || '';
        document.getElementById('noteTags').value = note.tags ? note.tags.join(', ') : '';

        title.textContent = 'Edit Note';

        // Update pin button state
        const pinBtn = document.getElementById('pinNoteBtn');
        if (pinBtn) {
            if (note.is_pinned) {
                pinBtn.classList.add('text-yellow-500');
                pinBtn.classList.remove('text-gray-400');
            } else {
                pinBtn.classList.remove('text-yellow-500');
                pinBtn.classList.add('text-gray-400');
            }
        }

        this.selectedNote = note;
        modalManager.open('noteModal');
    }

    async saveNote() {
        const form = document.getElementById('noteForm');
        const formData = new FormData(form);

        const noteId = formData.get('noteId') || document.getElementById('noteId').value;
        const title = formData.get('title') || document.getElementById('noteTitle').value.trim();
        const content = formData.get('content') || document.getElementById('noteContent').value.trim();

        if (!title || !content) {
            notificationManager.error('Please fill in both title and content');
            return;
        }

        const noteData = {
            title,
            content,
            topic: document.getElementById('noteTopic').value || null,
            week: document.getElementById('noteWeek').value ? parseInt(document.getElementById('noteWeek').value) : null,
            tags: document.getElementById('noteTags').value.split(',').map(tag => tag.trim()).filter(tag => tag),
            is_pinned: this.selectedNote ? this.selectedNote.is_pinned : false
        };

        try {
            if (noteId) {
                // Update existing note
                await api.put(`${API_ENDPOINTS.notes}/${noteId}`, noteData);
                notificationManager.success('Note updated successfully');
            } else {
                // Create new note
                await api.post(API_ENDPOINTS.notes, noteData);
                notificationManager.success('Note created successfully');
            }

            modalManager.close('noteModal');
            await this.loadNotes();
            this.applyFilters();
            this.selectedNote = null;

        } catch (error) {
            console.error('Failed to save note:', error);
            notificationManager.error('Failed to save note');
        }
    }

    togglePin() {
        if (this.selectedNote) {
            this.selectedNote.is_pinned = !this.selectedNote.is_pinned;

            const pinBtn = document.getElementById('pinNoteBtn');
            if (pinBtn) {
                if (this.selectedNote.is_pinned) {
                    pinBtn.classList.add('text-yellow-500');
                    pinBtn.classList.remove('text-gray-400');
                } else {
                    pinBtn.classList.remove('text-yellow-500');
                    pinBtn.classList.add('text-gray-400');
                }
            }
        }
    }

    async toggleNotePin(noteId) {
        const note = this.notes.find(n => n.id === noteId);
        if (!note) return;

        try {
            await api.put(`${API_ENDPOINTS.notes}/${noteId}`, {
                is_pinned: !note.is_pinned
            });

            // Update local data
            note.is_pinned = !note.is_pinned;

            // Remove context menu
            const menu = document.getElementById('noteContextMenu');
            if (menu) menu.remove();

            this.applyFilters();
            notificationManager.success(note.is_pinned ? 'Note pinned' : 'Note unpinned');

        } catch (error) {
            console.error('Failed to toggle pin:', error);
            notificationManager.error('Failed to update note');
        }
    }

    async duplicateNote(noteId) {
        const note = this.notes.find(n => n.id === noteId);
        if (!note) return;

        try {
            const duplicateData = {
                title: `${note.title} (Copy)`,
                content: note.content,
                topic: note.topic,
                week: note.week,
                tags: note.tags
            };

            await api.post(API_ENDPOINTS.notes, duplicateData);

            // Remove context menu
            const menu = document.getElementById('noteContextMenu');
            if (menu) menu.remove();

            await this.loadNotes();
            this.applyFilters();
            notificationManager.success('Note duplicated successfully');

        } catch (error) {
            console.error('Failed to duplicate note:', error);
            notificationManager.error('Failed to duplicate note');
        }
    }

    deleteNote(noteId) {
        this.noteToDelete = noteId;
        modalManager.open('deleteConfirmModal');
    }

    async confirmDelete() {
        if (!this.noteToDelete) return;

        try {
            await api.delete(`${API_ENDPOINTS.notes}/${this.noteToDelete}`);

            modalManager.close('deleteConfirmModal');
            await this.loadNotes();
            this.applyFilters();
            notificationManager.success('Note deleted successfully');

        } catch (error) {
            console.error('Failed to delete note:', error);
            notificationManager.error('Failed to delete note');
        } finally {
            this.noteToDelete = null;
        }
    }

    applyFilters() {
        let filtered = [...this.notes];

        // Apply search filter
        if (this.searchQuery) {
            filtered = filtered.filter(note =>
                note.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                note.content.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                (note.tags && note.tags.some(tag => tag.toLowerCase().includes(this.searchQuery.toLowerCase())))
            );
        }

        // Apply category filter
        if (this.currentFilter === 'pinned') {
            filtered = filtered.filter(note => note.is_pinned);
        } else if (this.currentFilter === 'recent') {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            filtered = filtered.filter(note => new Date(note.updated_at) > weekAgo);
        }

        // Apply topic filter
        const topicFilter = document.getElementById('topicFilter');
        if (topicFilter && topicFilter.value) {
            filtered = filtered.filter(note => note.topic === topicFilter.value);
        }

        // Apply sorting
        filtered.sort((a, b) => {
            switch (this.currentSort) {
                case 'created':
                    return new Date(b.created_at) - new Date(a.created_at);
                case 'title':
                    return a.title.localeCompare(b.title);
                case 'topic':
                    return (a.topic || '').localeCompare(b.topic || '');
                default: // updated
                    return new Date(b.updated_at) - new Date(a.updated_at);
            }
        });

        // Prioritize pinned notes
        const pinned = filtered.filter(note => note.is_pinned);
        const unpinned = filtered.filter(note => !note.is_pinned);

        this.filteredNotes = [...pinned, ...unpinned];
        this.renderNotes();
    }

    setFilter(filter) {
        this.currentFilter = filter;

        // Update button states
        ['all', 'pinned', 'recent'].forEach(f => {
            const btn = document.getElementById(`filter${f.charAt(0).toUpperCase() + f.slice(1)}`);
            if (btn) {
                if (f === filter) {
                    btn.className = 'px-3 py-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-full';
                } else {
                    btn.className = 'px-3 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full';
                }
            }
        });

        this.applyFilters();
    }

    switchViewMode(mode) {
        this.viewMode = mode;

        // Update button states
        const gridBtn = document.getElementById('gridViewBtn');
        const listBtn = document.getElementById('listViewBtn');

        if (mode === 'grid') {
            if (gridBtn) gridBtn.className = 'px-3 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600';
            if (listBtn) listBtn.className = 'px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg';
        } else {
            if (listBtn) listBtn.className = 'px-3 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600';
            if (gridBtn) gridBtn.className = 'px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg';
        }

        this.renderNotes();
    }

    loadPopularTags() {
        const popularTags = document.getElementById('popularTags');
        if (!popularTags) return;

        // Extract all tags and count frequency
        const tagCounts = {};
        this.notes.forEach(note => {
            if (note.tags) {
                note.tags.forEach(tag => {
                    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                });
            }
        });

        // Sort by frequency and get top 5
        const topTags = Object.entries(tagCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([tag]) => tag);

        if (topTags.length === 0) {
            popularTags.innerHTML = '<span class="text-xs text-gray-500">No tags yet</span>';
            return;
        }

        popularTags.innerHTML = topTags.map(tag => `
            <button onclick="notesManager.searchByTag('${tag}')" 
                    class="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900 dark:hover:text-blue-400 transition-colors">
                ${tag}
            </button>
        `).join('');
    }

    searchByTag(tag) {
        const searchInput = document.getElementById('searchNotes') || document.getElementById('mobileSearchInput');
        if (searchInput) {
            searchInput.value = tag;
            this.searchQuery = tag;
            this.applyFilters();
        }
    }

    debounce(func, wait) {
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
}

// Initialize notes manager when on notes page
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('notes')) {
        window.notesManager = new NotesManager();
    }
});