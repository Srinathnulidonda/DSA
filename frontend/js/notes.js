// Notes management system
class NotesManager {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.currentFilter = { topic: '', week: '', search: '' };
        this.editingNote = null;
    }

    loadNotes() {
        this.populateFilters();
        this.renderNotes();
    }

    populateFilters() {
        this.populateTopicFilter();
        this.populateWeekFilter();
    }

    populateTopicFilter() {
        const topicFilter = document.getElementById('notes-topic-filter');
        if (!topicFilter) return;

        const topics = [...new Set(this.dashboard.userData.notes.map(note => note.topic).filter(Boolean))];

        topicFilter.innerHTML = '<option value="">All Topics</option>' +
            topics.map(topic => `<option value="${topic}">${topic}</option>`).join('');
    }

    populateWeekFilter() {
        const weekFilter = document.getElementById('notes-week-filter');
        if (!weekFilter) return;

        const weeks = [...new Set(this.dashboard.userData.notes.map(note => note.week).filter(Boolean))];
        weeks.sort((a, b) => a - b);

        weekFilter.innerHTML = '<option value="">All Weeks</option>' +
            weeks.map(week => `<option value="${week}">Week ${week}</option>`).join('');
    }

    renderNotes() {
        const container = document.getElementById('notes-grid');
        if (!container) return;

        const filteredNotes = this.getFilteredNotes();

        if (filteredNotes.length === 0) {
            container.innerHTML = this.renderEmptyState();
            return;
        }

        container.innerHTML = filteredNotes.map((note, index) => {
            return `
                <div class="col-lg-4 col-md-6 mb-4">
                    <div class="note-card stagger-item" style="animation-delay: ${index * 0.1}s" 
                         onclick="notes.viewNote('${note.id}')">
                        <div class="note-header">
                            <div>
                                <h6 class="note-title">${this.escapeHtml(note.title)}</h6>
                                <div class="note-meta">
                                    ${note.topic ? `<span class="topic-badge">${note.topic}</span>` : ''}
                                    ${note.week ? `<span class="week-badge">Week ${note.week}</span>` : ''}
                                    <span class="date-badge">${this.formatDate(note.createdAt)}</span>
                                </div>
                            </div>
                            <div class="note-actions">
                                <button class="btn btn-sm btn-outline-primary" 
                                        onclick="event.stopPropagation(); notes.editNote('${note.id}')">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger" 
                                        onclick="event.stopPropagation(); notes.deleteNote('${note.id}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                        
                        <div class="note-content">
                            ${this.truncateContent(note.content, 150)}
                        </div>
                        
                        ${note.tags && note.tags.length > 0 ? `
                            <div class="note-tags">
                                ${note.tags.map(tag => `<span class="note-tag">${tag}</span>`).join('')}
                            </div>
                        ` : ''}
                        
                        <div class="note-footer">
                            <small class="text-muted">
                                <i class="fas fa-clock me-1"></i>
                                ${this.getRelativeTime(note.updatedAt || note.createdAt)}
                            </small>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    getFilteredNotes() {
        return this.dashboard.userData.notes.filter(note => {
            const matchesSearch = !this.currentFilter.search ||
                note.title.toLowerCase().includes(this.currentFilter.search.toLowerCase()) ||
                note.content.toLowerCase().includes(this.currentFilter.search.toLowerCase());

            const matchesTopic = !this.currentFilter.topic || note.topic === this.currentFilter.topic;
            const matchesWeek = !this.currentFilter.week || note.week == this.currentFilter.week;

            return matchesSearch && matchesTopic && matchesWeek;
        }).sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
    }

    renderEmptyState() {
        return `
            <div class="col-12">
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class="fas fa-sticky-note"></i>
                    </div>
                    <h4 class="empty-state-title">No Notes Found</h4>
                    <p class="empty-state-description">
                        ${this.hasActiveFilters() ?
                'Try adjusting your search filters or create a new note.' :
                'Start your learning journey by adding your first note!'
            }
                    </p>
                    <button class="btn btn-primary" onclick="notes.showAddNoteModal()">
                        <i class="fas fa-plus me-2"></i>Add Your First Note
                    </button>
                </div>
            </div>
        `;
    }

    hasActiveFilters() {
        return this.currentFilter.search || this.currentFilter.topic || this.currentFilter.week;
    }

    searchNotes() {
        const searchInput = document.getElementById('notes-search');
        if (searchInput) {
            this.currentFilter.search = searchInput.value;
            this.renderNotes();
        }
    }

    filterNotes() {
        const topicFilter = document.getElementById('notes-topic-filter');
        const weekFilter = document.getElementById('notes-week-filter');

        if (topicFilter) this.currentFilter.topic = topicFilter.value;
        if (weekFilter) this.currentFilter.week = weekFilter.value;

        this.renderNotes();
    }

    showAddNoteModal() {
        this.editingNote = null;
        this.setupNoteModal();
        const modal = new bootstrap.Modal(document.getElementById('addNoteModal'));
        modal.show();
    }

    setupNoteModal() {
        const form = document.getElementById('add-note-form');
        if (!form) return;

        // Populate week selector
        const weekSelect = document.getElementById('note-week');
        if (weekSelect) {
            weekSelect.innerHTML = '<option value="">Select Week (Optional)</option>' +
                Array.from({ length: 14 }, (_, i) => i + 1)
                    .map(week => `<option value="${week}">Week ${week}</option>`)
                    .join('');

            // Set current week as default
            weekSelect.value = this.dashboard.userData.currentWeek;
        }

        // Clear or populate form based on edit mode
        if (this.editingNote) {
            this.populateEditForm();
        } else {
            this.clearForm();
        }
    }

    populateEditForm() {
        const note = this.editingNote;
        document.getElementById('note-title').value = note.title;
        document.getElementById('note-topic').value = note.topic || '';
        document.getElementById('note-week').value = note.week || '';
        document.getElementById('note-content').value = note.content;
        document.getElementById('note-tags').value = note.tags ? note.tags.join(', ') : '';

        // Update modal title
        document.querySelector('#addNoteModal .modal-title').innerHTML =
            '<i class="fas fa-edit me-2"></i>Edit Note';
    }

    clearForm() {
        document.getElementById('note-title').value = '';
        document.getElementById('note-topic').value = '';
        document.getElementById('note-content').value = '';
        document.getElementById('note-tags').value = '';

        // Reset modal title
        document.querySelector('#addNoteModal .modal-title').innerHTML =
            '<i class="fas fa-plus me-2"></i>Add New Note';
    }

    saveNote() {
        const title = document.getElementById('note-title').value.trim();
        const topic = document.getElementById('note-topic').value.trim();
        const week = document.getElementById('note-week').value;
        const content = document.getElementById('note-content').value.trim();
        const tagsInput = document.getElementById('note-tags').value.trim();

        if (!title || !content) {
            this.dashboard.showNotification('Validation Error', 'Title and content are required.', 'error');
            return;
        }

        const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

        const noteData = {
            title,
            topic,
            week: week ? parseInt(week) : null,
            content,
            tags,
            updatedAt: new Date().toISOString()
        };

        if (this.editingNote) {
            // Update existing note
            const noteIndex = this.dashboard.userData.notes.findIndex(n => n.id === this.editingNote.id);
            if (noteIndex !== -1) {
                this.dashboard.userData.notes[noteIndex] = {
                    ...this.dashboard.userData.notes[noteIndex],
                    ...noteData
                };
                this.dashboard.showNotification('Note Updated!', 'Your note has been successfully updated.', 'success');
            }
        } else {
            // Add new note
            const newNote = {
                id: this.generateNoteId(),
                ...noteData,
                createdAt: new Date().toISOString()
            };

            this.dashboard.userData.notes.unshift(newNote);
            this.dashboard.showNotification('Note Added!', 'Your note has been successfully created.', 'success');
        }

        this.dashboard.saveUserData();
        this.loadNotes();

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('addNoteModal'));
        modal.hide();
    }

    editNote(noteId) {
        this.editingNote = this.dashboard.userData.notes.find(note => note.id === noteId);
        if (this.editingNote) {
            this.showAddNoteModal();
        }
    }

    deleteNote(noteId) {
        if (confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
            this.dashboard.userData.notes = this.dashboard.userData.notes.filter(note => note.id !== noteId);
            this.dashboard.saveUserData();
            this.loadNotes();
            this.dashboard.showNotification('Note Deleted', 'The note has been removed.', 'info');
        }
    }

    viewNote(noteId) {
        const note = this.dashboard.userData.notes.find(n => n.id === noteId);
        if (!note) return;

        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <div>
                            <h5 class="modal-title">${this.escapeHtml(note.title)}</h5>
                            <div class="note-meta-modal">
                                ${note.topic ? `<span class="badge bg-primary me-2">${note.topic}</span>` : ''}
                                ${note.week ? `<span class="badge bg-secondary me-2">Week ${note.week}</span>` : ''}
                                <small class="text-muted">
                                    Created: ${this.formatDate(note.createdAt)}
                                    ${note.updatedAt && note.updatedAt !== note.createdAt ?
                ` • Updated: ${this.formatDate(note.updatedAt)}` : ''}
                                </small>
                            </div>
                        </div>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="note-content-full">
                            ${this.formatNoteContent(note.content)}
                        </div>
                        ${note.tags && note.tags.length > 0 ? `
                            <div class="note-tags-modal mt-3">
                                <h6 class="small text-muted mb-2">Tags:</h6>
                                ${note.tags.map(tag => `<span class="badge bg-light text-dark me-1">${tag}</span>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-primary" onclick="notes.editNote('${note.id}'); bootstrap.Modal.getInstance(this.closest('.modal')).hide();">
                            <i class="fas fa-edit me-1"></i>Edit Note
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

    formatNoteContent(content) {
        // Convert line breaks to paragraphs and handle basic formatting
        return content
            .split('\n\n')
            .map(paragraph => `<p>${this.escapeHtml(paragraph.replace(/\n/g, '<br>'))}</p>`)
            .join('');
    }

    generateNoteId() {
        return 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    truncateContent(content, maxLength) {
        if (content.length <= maxLength) {
            return this.escapeHtml(content);
        }
        return this.escapeHtml(content.substring(0, maxLength)) + '...';
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    getRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

        return this.formatDate(dateString);
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

    exportNotes() {
        const notesData = {
            notes: this.dashboard.userData.notes,
            exportDate: new Date().toISOString(),
            totalNotes: this.dashboard.userData.notes.length
        };

        const dataStr = JSON.stringify(notesData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `dsa-notes-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    }

    importNotes() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const importedData = JSON.parse(e.target.result);

                        if (importedData.notes && Array.isArray(importedData.notes)) {
                            // Merge with existing notes, avoiding duplicates
                            const existingIds = new Set(this.dashboard.userData.notes.map(n => n.id));
                            const newNotes = importedData.notes.filter(note => !existingIds.has(note.id));

                            this.dashboard.userData.notes.unshift(...newNotes);
                            this.dashboard.saveUserData();
                            this.loadNotes();

                            this.dashboard.showNotification(
                                'Notes Imported!',
                                `Successfully imported ${newNotes.length} new notes.`,
                                'success'
                            );
                        } else {
                            throw new Error('Invalid notes format');
                        }
                    } catch (error) {
                        this.dashboard.showNotification('Import Failed', 'Invalid file format.', 'error');
                    }
                };
                reader.readAsText(file);
            }
        };

        input.click();
    }

    // Quick note functionality
    addQuickNote(content, topic = null) {
        const quickNote = {
            id: this.generateNoteId(),
            title: `Quick Note - ${new Date().toLocaleDateString()}`,
            topic,
            week: this.dashboard.userData.currentWeek,
            content,
            tags: ['quick-note'],
            createdAt: new Date().toISOString()
        };

        this.dashboard.userData.notes.unshift(quickNote);
        this.dashboard.saveUserData();

        return quickNote;
    }
}

// Global functions
function showAddNoteModal() {
    window.notes.showAddNoteModal();
}

function saveNote() {
    window.notes.saveNote();
}

function searchNotes() {
    window.notes.searchNotes();
}

function filterNotes() {
    window.notes.filterNotes();
}

function showNotesModal() {
    if (window.notes) {
        window.notes.showAddNoteModal();
    }
}

// Initialize when dashboard is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.dashboard) {
            window.notes = new NotesManager(window.dashboard);

            // Override dashboard's loadNotes method
            window.dashboard.loadNotes = () => {
                window.notes.loadNotes();
            };
        }
    }, 100);
});