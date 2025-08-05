// Notes Management for DSA Learning Dashboard

class NotesManager {
    constructor() {
        this.notes = this.loadNotes();
        this.currentNote = null;
        this.autoSaveTimer = null;
        this.searchTimeout = null;
        this.setupEventListeners();
        this.initializeEditor();
    }

    loadNotes() {
        const saved = localStorage.getItem('dsaNotes');
        if (saved) {
            return JSON.parse(saved);
        }
        return this.getDefaultNotes();
    }

    getDefaultNotes() {
        return [
            {
                id: 'welcome-note',
                title: 'Welcome to DSA Notes',
                content: `# Welcome to Your DSA Learning Notes! 📚

This is your personal notebook for the DSA journey. Here are some tips:

## 📝 Note-Taking Tips
- Use markdown for formatting
- Create separate notes for each topic
- Include code examples
- Add your own explanations
- Review notes regularly

## 🔍 Features
- **Auto-save**: Your notes are saved automatically
- **Search**: Find notes quickly using the search feature
- **Categories**: Organize notes by week/topic
- **Markdown**: Use markdown for rich formatting
- **Cloud Sync**: Notes sync across devices when logged in

## 📖 Markdown Examples

### Code Blocks
\`\`\`python
def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1
\`\`\`

### Lists
- Arrays and Strings
- Linked Lists
- Trees and Graphs
- Dynamic Programming

### Links
[VisuAlgo](https://visualgo.net) - Great visualization tool

Happy learning! 🚀`,
                category: 'General',
                week: 0,
                tags: ['welcome', 'guide'],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isPinned: true
            }
        ];
    }

    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            this.initializeNotesInterface();
        });
    }

    initializeNotesInterface() {
        this.renderNotesList();
        this.setupSearchFunctionality();
        this.setupEditorEvents();
    }

    initializeEditor() {
        // Initialize markdown editor if available
        this.setupMarkdownPreview();
    }

    // Notes CRUD Operations
    createNote(title = 'New Note', category = 'General', week = null) {
        const newNote = {
            id: this.generateId(),
            title: title,
            content: '',
            category: category,
            week: week,
            tags: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isPinned: false
        };

        this.notes.unshift(newNote);
        this.saveNotes();
        this.renderNotesList();
        this.selectNote(newNote.id);
        return newNote;
    }

    updateNote(noteId, updates) {
        const noteIndex = this.notes.findIndex(note => note.id === noteId);
        if (noteIndex !== -1) {
            this.notes[noteIndex] = {
                ...this.notes[noteIndex],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            this.saveNotes();
            this.renderNotesList();
            return this.notes[noteIndex];
        }
        return null;
    }

    deleteNote(noteId) {
        if (confirm('Are you sure you want to delete this note?')) {
            this.notes = this.notes.filter(note => note.id !== noteId);
            this.saveNotes();
            this.renderNotesList();

            if (this.currentNote && this.currentNote.id === noteId) {
                this.currentNote = null;
                this.clearEditor();
            }

            showNotification('Note deleted successfully', 'success');
        }
    }

    duplicateNote(noteId) {
        const originalNote = this.notes.find(note => note.id === noteId);
        if (originalNote) {
            const duplicatedNote = {
                ...originalNote,
                id: this.generateId(),
                title: `${originalNote.title} (Copy)`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isPinned: false
            };

            this.notes.unshift(duplicatedNote);
            this.saveNotes();
            this.renderNotesList();
            showNotification('Note duplicated successfully', 'success');
        }
    }

    togglePinNote(noteId) {
        const note = this.notes.find(note => note.id === noteId);
        if (note) {
            note.isPinned = !note.isPinned;
            note.updatedAt = new Date().toISOString();

            // Sort notes to put pinned ones first
            this.notes.sort((a, b) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return new Date(b.updatedAt) - new Date(a.updatedAt);
            });

            this.saveNotes();
            this.renderNotesList();
        }
    }

    // Note Selection and Editing
    selectNote(noteId) {
        const note = this.notes.find(note => note.id === noteId);
        if (note) {
            this.currentNote = note;
            this.loadNoteInEditor(note);
            this.updateActiveNoteUI(noteId);
        }
    }

    loadNoteInEditor(note) {
        const titleElement = document.getElementById('currentNoteTitle');
        const contentElement = document.getElementById('noteContent');

        if (titleElement) {
            titleElement.textContent = note.title;
        }

        if (contentElement) {
            contentElement.value = note.content;
            this.updateMarkdownPreview(note.content);
        }
    }

    clearEditor() {
        const titleElement = document.getElementById('currentNoteTitle');
        const contentElement = document.getElementById('noteContent');

        if (titleElement) {
            titleElement.textContent = 'Select a note to edit';
        }

        if (contentElement) {
            contentElement.value = '';
            this.updateMarkdownPreview('');
        }
    }

    updateActiveNoteUI(noteId) {
        // Remove active class from all notes
        document.querySelectorAll('.note-item').forEach(item => {
            item.classList.remove('active');
        });

        // Add active class to selected note
        const activeNote = document.querySelector(`[data-note-id="${noteId}"]`);
        if (activeNote) {
            activeNote.classList.add('active');
        }
    }

    // Auto-save functionality
    setupEditorEvents() {
        const contentElement = document.getElementById('noteContent');
        if (contentElement) {
            contentElement.addEventListener('input', (e) => {
                this.handleContentChange(e.target.value);
            });

            contentElement.addEventListener('keydown', (e) => {
                this.handleKeyboardShortcuts(e);
            });
        }
    }

    handleContentChange(content) {
        if (this.currentNote) {
            // Update markdown preview
            this.updateMarkdownPreview(content);

            // Clear previous auto-save timer
            if (this.autoSaveTimer) {
                clearTimeout(this.autoSaveTimer);
            }

            // Set new auto-save timer
            this.autoSaveTimer = setTimeout(() => {
                this.autoSaveCurrentNote(content);
            }, 1000); // Auto-save after 1 second of inactivity
        }
    }

    autoSaveCurrentNote(content) {
        if (this.currentNote) {
            this.updateNote(this.currentNote.id, { content: content });
            this.showAutoSaveIndicator();
        }
    }

    showAutoSaveIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'auto-save-indicator position-fixed top-0 end-0 m-3 p-2 bg-success text-white rounded';
        indicator.innerHTML = '<i class="fas fa-check"></i> Auto-saved';
        indicator.style.zIndex = '9999';

        document.body.appendChild(indicator);

        setTimeout(() => {
            indicator.remove();
        }, 2000);
    }

    // Manual save
    saveCurrentNote() {
        if (this.currentNote) {
            const contentElement = document.getElementById('noteContent');
            if (contentElement) {
                this.updateNote(this.currentNote.id, {
                    content: contentElement.value
                });
                showNotification('Note saved successfully', 'success');
            }
        }
    }

    // Search functionality
    setupSearchFunctionality() {
        const searchInput = document.getElementById('notesSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                if (this.searchTimeout) {
                    clearTimeout(this.searchTimeout);
                }

                this.searchTimeout = setTimeout(() => {
                    this.searchNotes(e.target.value);
                }, 300);
            });
        }
    }

    searchNotes(query) {
        if (!query.trim()) {
            this.renderNotesList();
            return;
        }

        const filteredNotes = this.notes.filter(note =>
            note.title.toLowerCase().includes(query.toLowerCase()) ||
            note.content.toLowerCase().includes(query.toLowerCase()) ||
            note.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase())) ||
            note.category.toLowerCase().includes(query.toLowerCase())
        );

        this.renderNotesList(filteredNotes);
    }

    // Category and filtering
    filterNotesByCategory(category) {
        if (category === 'all') {
            this.renderNotesList();
        } else {
            const filteredNotes = this.notes.filter(note => note.category === category);
            this.renderNotesList(filteredNotes);
        }
    }

    filterNotesByWeek(week) {
        if (week === 'all') {
            this.renderNotesList();
        } else {
            const filteredNotes = this.notes.filter(note => note.week === parseInt(week));
            this.renderNotesList(filteredNotes);
        }
    }

    getCategories() {
        const categories = [...new Set(this.notes.map(note => note.category))];
        return ['General', ...categories.filter(cat => cat !== 'General')];
    }

    // Rendering
    renderNotesList(notesToRender = null) {
        const container = document.getElementById('notesList');
        if (!container) return;

        const notes = notesToRender || this.notes;

        if (notes.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4 text-muted">
                    <i class="fas fa-sticky-note fa-2x mb-2"></i>
                    <p>No notes found</p>
                </div>
            `;
            return;
        }

        container.innerHTML = notes.map(note => this.createNoteListItem(note)).join('');
    }

    createNoteListItem(note) {
        const preview = this.getContentPreview(note.content);
        const timeAgo = this.getTimeAgo(note.updatedAt);

        return `
            <div class="note-item list-group-item list-group-item-action" 
                 data-note-id="${note.id}" 
                 onclick="notesManager.selectNote('${note.id}')">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <div class="d-flex align-items-center mb-1">
                            ${note.isPinned ? '<i class="fas fa-thumbtack text-warning me-2"></i>' : ''}
                            <h6 class="mb-0 fw-bold">${note.title}</h6>
                        </div>
                        <p class="mb-1 text-muted small">${preview}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <div class="note-meta">
                                <span class="badge bg-secondary me-1">${note.category}</span>
                                ${note.week ? `<span class="badge bg-primary me-1">Week ${note.week}</span>` : ''}
                                ${note.tags.map(tag => `<span class="badge bg-info me-1">${tag}</span>`).join('')}
                            </div>
                            <small class="text-muted">${timeAgo}</small>
                        </div>
                    </div>
                    <div class="dropdown">
                        <button class="btn btn-sm btn-link text-muted" type="button" 
                                data-bs-toggle="dropdown" onclick="event.stopPropagation()">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <ul class="dropdown-menu">
                            <li><a class="dropdown-item" href="#" onclick="event.preventDefault(); notesManager.editNoteTitle('${note.id}')">
                                <i class="fas fa-edit me-2"></i>Rename</a></li>
                            <li><a class="dropdown-item" href="#" onclick="event.preventDefault(); notesManager.togglePinNote('${note.id}')">
                                <i class="fas fa-thumbtack me-2"></i>${note.isPinned ? 'Unpin' : 'Pin'}</a></li>
                            <li><a class="dropdown-item" href="#" onclick="event.preventDefault(); notesManager.duplicateNote('${note.id}')">
                                <i class="fas fa-copy me-2"></i>Duplicate</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item text-danger" href="#" onclick="event.preventDefault(); notesManager.deleteNote('${note.id}')">
                                <i class="fas fa-trash me-2"></i>Delete</a></li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }

    getContentPreview(content, maxLength = 100) {
        // Remove markdown formatting for preview
        const plainText = content
            .replace(/#+\s/g, '') // Headers
            .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
            .replace(/\*(.*?)\*/g, '$1') // Italic
            .replace(/`(.*?)`/g, '$1') // Inline code
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
            .replace(/```[\s\S]*?```/g, '[Code Block]') // Code blocks
            .trim();

        return plainText.length > maxLength
            ? plainText.substring(0, maxLength) + '...'
            : plainText || 'Empty note';
    }

    getTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
        const diffMinutes = Math.ceil(diffTime / (1000 * 60));

        if (diffMinutes < 60) {
            return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
        } else if (diffHours < 24) {
            return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    // Markdown functionality
    setupMarkdownPreview() {
        // Create markdown preview toggle
        this.createMarkdownToolbar();
    }

    createMarkdownToolbar() {
        const toolbar = document.createElement('div');
        toolbar.className = 'markdown-toolbar mb-2';
        toolbar.innerHTML = `
            <div class="btn-group btn-group-sm" role="group">
                <button type="button" class="btn btn-outline-secondary" onclick="notesManager.insertMarkdown('**', '**')" title="Bold">
                    <i class="fas fa-bold"></i>
                </button>
                <button type="button" class="btn btn-outline-secondary" onclick="notesManager.insertMarkdown('*', '*')" title="Italic">
                    <i class="fas fa-italic"></i>
                </button>
                <button type="button" class="btn btn-outline-secondary" onclick="notesManager.insertMarkdown('`', '`')" title="Code">
                    <i class="fas fa-code"></i>
                </button>
                <button type="button" class="btn btn-outline-secondary" onclick="notesManager.insertMarkdown('\\n```\\n', '\\n```\\n')" title="Code Block">
                    <i class="fas fa-file-code"></i>
                </button>
                <button type="button" class="btn btn-outline-secondary" onclick="notesManager.insertMarkdown('[', '](url)')" title="Link">
                    <i class="fas fa-link"></i>
                </button>
                <button type="button" class="btn btn-outline-secondary" onclick="notesManager.insertMarkdown('\\n- ', '')" title="List">
                    <i class="fas fa-list"></i>
                </button>
                <button type="button" class="btn btn-outline-secondary" onclick="notesManager.togglePreview()" title="Preview" id="previewToggle">
                    <i class="fas fa-eye"></i>
                </button>
            </div>
        `;

        const noteEditor = document.getElementById('noteEditor');
        if (noteEditor) {
            noteEditor.insertBefore(toolbar, noteEditor.firstChild);
        }
    }

    insertMarkdown(before, after) {
        const textarea = document.getElementById('noteContent');
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end);

        const replacement = before + selectedText + after;
        textarea.setRangeText(replacement, start, end, 'end');

        // Update content and trigger auto-save
        this.handleContentChange(textarea.value);
        textarea.focus();
    }

    togglePreview() {
        const textarea = document.getElementById('noteContent');
        const previewButton = document.getElementById('previewToggle');

        if (!textarea || !previewButton) return;

        let preview = document.getElementById('markdownPreview');

        if (!preview) {
            // Create preview element
            preview = document.createElement('div');
            preview.id = 'markdownPreview';
            preview.className = 'markdown-preview border rounded p-3';
            preview.style.display = 'none';
            textarea.parentNode.appendChild(preview);
        }

        if (preview.style.display === 'none') {
            // Show preview
            preview.style.display = 'block';
            textarea.style.display = 'none';
            previewButton.innerHTML = '<i class="fas fa-edit"></i>';
            this.updateMarkdownPreview(textarea.value);
        } else {
            // Show editor
            preview.style.display = 'none';
            textarea.style.display = 'block';
            previewButton.innerHTML = '<i class="fas fa-eye"></i>';
        }
    }

    updateMarkdownPreview(content) {
        const preview = document.getElementById('markdownPreview');
        if (preview) {
            preview.innerHTML = this.renderMarkdown(content);
        }
    }

    renderMarkdown(content) {
        // Simple markdown renderer (you might want to use a library like marked.js)
        return content
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^\* (.*$)/gim, '<li>$1</li>')
            .replace(/^\- (.*$)/gim, '<li>$1</li>')
            .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
            .replace(/\*(.*)\*/gim, '<em>$1</em>')
            .replace(/`(.*?)`/gim, '<code>$1</code>')
            .replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank">$1</a>')
            .replace(/\n/gim, '<br>');
    }

    // Note editing
    editNoteTitle(noteId) {
        const note = this.notes.find(n => n.id === noteId);
        if (!note) return;

        const newTitle = prompt('Enter new title:', note.title);
        if (newTitle && newTitle.trim() !== note.title) {
            this.updateNote(noteId, { title: newTitle.trim() });

            // Update current note title if it's the active note
            if (this.currentNote && this.currentNote.id === noteId) {
                document.getElementById('currentNoteTitle').textContent = newTitle.trim();
            }
        }
    }

    // Keyboard shortcuts
    handleKeyboardShortcuts(e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 's':
                    e.preventDefault();
                    this.saveCurrentNote();
                    break;
                case 'n':
                    e.preventDefault();
                    this.createNote();
                    break;
                case 'b':
                    e.preventDefault();
                    this.insertMarkdown('**', '**');
                    break;
                case 'i':
                    e.preventDefault();
                    this.insertMarkdown('*', '*');
                    break;
                case 'k':
                    e.preventDefault();
                    this.insertMarkdown('[', '](url)');
                    break;
            }
        }
    }

    // Data management
    saveNotes() {
        localStorage.setItem('dsaNotes', JSON.stringify(this.notes));

        // Also save to cloud if available
        if (window.dsaAPI && window.currentUser) {
            window.dsaAPI.saveNote({ notes: this.notes }).catch(console.error);
        }
    }

    exportNotes() {
        const dataStr = JSON.stringify(this.notes, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `dsa-notes-${new Date().toISOString().split('T')[0]}.json`;
        link.click();

        URL.revokeObjectURL(url);
        showNotification('Notes exported successfully!', 'success');
    }

    importNotes(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedNotes = JSON.parse(e.target.result);

                if (Array.isArray(importedNotes)) {
                    // Merge with existing notes
                    const mergedNotes = [...this.notes];

                    importedNotes.forEach(note => {
                        // Check if note already exists
                        if (!mergedNotes.find(existing => existing.id === note.id)) {
                            mergedNotes.push({
                                ...note,
                                id: note.id || this.generateId()
                            });
                        }
                    });

                    this.notes = mergedNotes;
                    this.saveNotes();
                    this.renderNotesList();
                    showNotification('Notes imported successfully!', 'success');
                } else {
                    throw new Error('Invalid notes format');
                }
            } catch (error) {
                showNotification('Failed to import notes. Please check the file format.', 'danger');
            }
        };
        reader.readAsText(file);
    }

    // Utility functions
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Public API methods for global access
    addNewNote() {
        const title = prompt('Enter note title:', 'New Note');
        if (title) {
            this.createNote(title.trim());
        }
    }

    deleteCurrentNote() {
        if (this.currentNote) {
            this.deleteNote(this.currentNote.id);
        }
    }
}

// Create global notes manager instance
const notesManager = new NotesManager();

// Make available globally
window.notesManager = notesManager;
window.addNewNote = () => notesManager.addNewNote();
window.saveCurrentNote = () => notesManager.saveCurrentNote();
window.deleteCurrentNote = () => notesManager.deleteCurrentNote();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotesManager;
}