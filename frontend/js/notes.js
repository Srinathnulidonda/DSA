// notes.js - Notes functionality

let notesData = [];
let currentNote = null;
let quillEditor = null;
let viewMode = 'grid'; // grid or list

// Initialize notes
document.addEventListener('DOMContentLoaded', async () => {
    initializeEditor();
    await loadNotes();
    setupEventListeners();
    checkURLParams();
});

// Initialize Quill editor
function initializeEditor() {
    quillEditor = new Quill('#editor', {
        theme: 'snow',
        modules: {
            toolbar: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                ['blockquote', 'code-block'],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                [{ 'script': 'sub' }, { 'script': 'super' }],
                [{ 'indent': '-1' }, { 'indent': '+1' }],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'align': [] }],
                ['link', 'image', 'video'],
                ['clean']
            ]
        }
    });
}

// Load notes
async function loadNotes() {
    try {
        window.DSAApp.showLoader();

        const filters = getActiveFilters();
        const response = await window.API.getNotes(filters);
        notesData = response.data.notes;

        renderNotes();

    } catch (error) {
        console.error('Failed to load notes:', error);
        window.DSAApp.showToast('Failed to load notes', 'error');
    } finally {
        window.DSAApp.hideLoader();
    }
}

// Get active filters
function getActiveFilters() {
    const filters = {};

    const topic = document.getElementById('filterTopic')?.value;
    const week = document.getElementById('filterWeek')?.value;
    const search = document.getElementById('searchNotes')?.value;

    if (topic) filters.topic = topic;
    if (week) filters.week = week;
    if (search) filters.search = search;

    return filters;
}

// Render notes
function renderNotes() {
    const pinnedNotes = notesData.filter(note => note.is_pinned);
    const regularNotes = notesData.filter(note => !note.is_pinned);

    renderNoteSection('pinnedNotes', pinnedNotes);
    renderNoteSection('allNotes', regularNotes);
}

// Render note section
function renderNoteSection(containerId, notes) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (notes.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">No notes found</p>';
        return;
    }

    container.innerHTML = notes.map(note => createNoteCard(note)).join('');
}

// Create note card
function createNoteCard(note) {
    const preview = stripHtml(note.content).substring(0, 150) + '...';
    const tags = note.tags || [];

    return `
        <div class="col-lg-4 col-md-6 mb-4">
            <div class="note-card card border-0 shadow-sm rounded-4 h-100 hover-shadow" data-note-id="${note.id}">
                <div class="card-body p-4">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div class="d-flex flex-wrap gap-2">
                            ${note.topic ? `<span class="badge bg-primary rounded-pill">${note.topic}</span>` : ''}
                            ${note.week ? `<span class="badge bg-secondary rounded-pill">Week ${note.week}</span>` : ''}
                        </div>
                        <button class="btn btn-sm btn-light rounded-circle" onclick="togglePin('${note.id}')">
                            <i class="fas fa-thumbtack ${note.is_pinned ? 'text-primary' : 'text-muted'}"></i>
                        </button>
                    </div>
                    <h5 class="fw-bold mb-2">${note.title}</h5>
                    <p class="text-muted mb-3">${preview}</p>
                    ${tags.length > 0 ? `
                        <div class="mb-3">
                            ${tags.map(tag => `<span class="badge bg-light text-secondary me-1">#${tag}</span>`).join('')}
                        </div>
                    ` : ''}
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted">${formatTimeAgo(note.updated_at)}</small>
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-light rounded-circle" onclick="editNote('${note.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-light rounded-circle" onclick="shareNote('${note.id}')">
                                <i class="fas fa-share"></i>
                            </button>
                            <button class="btn btn-sm btn-light rounded-circle" onclick="deleteNote('${note.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Create new note
window.createNewNote = function () {
    currentNote = null;

    // Reset form
    document.getElementById('noteTitle').value = '';
    quillEditor.setText('');
    document.getElementById('noteTopic').value = '';
    document.getElementById('noteWeek').value = '';
    document.getElementById('noteTags').value = '';
    document.getElementById('pinNote').checked = false;

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('noteEditorModal'));
    modal.show();

    // Focus on title
    setTimeout(() => {
        document.getElementById('noteTitle').focus();
    }, 500);
};

// Edit note
window.editNote = async function (noteId) {
    try {
        currentNote = notesData.find(note => note.id === noteId);
        if (!currentNote) return;

        // Populate form
        document.getElementById('noteTitle').value = currentNote.title;
        quillEditor.root.innerHTML = currentNote.content;
        document.getElementById('noteTopic').value = currentNote.topic || '';
        document.getElementById('noteWeek').value = currentNote.week || '';
        document.getElementById('noteTags').value = (currentNote.tags || []).join(', ');
        document.getElementById('pinNote').checked = currentNote.is_pinned;

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('noteEditorModal'));
        modal.show();

    } catch (error) {
        console.error('Failed to edit note:', error);
        window.DSAApp.showToast('Failed to load note', 'error');
    }
};

// Save note
window.saveNote = async function () {
    const title = document.getElementById('noteTitle').value.trim();
    const content = quillEditor.root.innerHTML;
    const topic = document.getElementById('noteTopic').value;
    const week = document.getElementById('noteWeek').value;
    const tags = document.getElementById('noteTags').value
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
    const isPinned = document.getElementById('pinNote').checked;

    if (!title) {
        window.DSAApp.showToast('Please enter a title', 'error');
        return;
    }

    const noteData = {
        title,
        content,
        topic: topic || null,
        week: week ? parseInt(week) : null,
        tags,
        is_pinned: isPinned
    };

    try {
        window.DSAApp.showLoader();

        if (currentNote) {
            // Update existing note
            await window.API.updateNote(currentNote.id, noteData);
            window.DSAApp.showToast('Note updated successfully', 'success');
        } else {
            // Create new note
            await window.API.createNote(noteData);
            window.DSAApp.showToast('Note created successfully', 'success');
        }

        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('noteEditorModal')).hide();

        // Reload notes
        await loadNotes();

    } catch (error) {
        console.error('Failed to save note:', error);
        window.DSAApp.showToast('Failed to save note', 'error');
    } finally {
        window.DSAApp.hideLoader();
    }
};

// Delete note
window.deleteNote = async function (noteId) {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
        await window.API.deleteNote(noteId);
        window.DSAApp.showToast('Note deleted successfully', 'success');
        await loadNotes();
    } catch (error) {
        console.error('Failed to delete note:', error);
        window.DSAApp.showToast('Failed to delete note', 'error');
    }
};

// Toggle pin
window.togglePin = async function (noteId) {
    try {
        const note = notesData.find(n => n.id === noteId);
        if (!note) return;

        await window.API.updateNote(noteId, { is_pinned: !note.is_pinned });
        await loadNotes();

    } catch (error) {
        console.error('Failed to toggle pin:', error);
        window.DSAApp.showToast('Failed to update note', 'error');
    }
};

// Share note
window.shareNote = async function (noteId) {
    const note = notesData.find(n => n.id === noteId);
    if (!note) return;

    // Create shareable content
    const shareData = {
        title: note.title,
        text: stripHtml(note.content).substring(0, 200),
        url: `${window.location.origin}/notes.html?id=${noteId}`
    };

    try {
        if (navigator.share) {
            await navigator.share(shareData);
        } else {
            // Fallback to copy link
            await navigator.clipboard.writeText(shareData.url);
            window.DSAApp.showToast('Link copied to clipboard', 'success');
        }
    } catch (error) {
        console.error('Failed to share:', error);
    }
};

// Toggle view mode
window.toggleView = function () {
    viewMode = viewMode === 'grid' ? 'list' : 'grid';
    document.getElementById('viewIcon').className = viewMode === 'grid' ? 'fas fa-th-large' : 'fas fa-list';

    // Re-render notes with new view
    renderNotes();
};

// Setup event listeners
function setupEventListeners() {
    // Search
    const searchInput = document.getElementById('searchNotes');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(loadNotes, 300));
    }

    // Filters
    document.getElementById('filterTopic')?.addEventListener('change', loadNotes);
    document.getElementById('filterWeek')?.addEventListener('change', loadNotes);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'n') {
                e.preventDefault();
                createNewNote();
            }
        }
    });

    // Auto-save draft
    let autoSaveTimer;
    quillEditor.on('text-change', () => {
        clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(() => {
            saveDraft();
        }, 2000);
    });
}

// Save draft to localStorage
function saveDraft() {
    const draft = {
        title: document.getElementById('noteTitle').value,
        content: quillEditor.root.innerHTML,
        topic: document.getElementById('noteTopic').value,
        week: document.getElementById('noteWeek').value,
        tags: document.getElementById('noteTags').value,
        savedAt: new Date().toISOString()
    };

    localStorage.setItem('noteDraft', JSON.stringify(draft));
}

// Check URL params
function checkURLParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const noteId = urlParams.get('id');

    if (noteId) {
        // Load and display specific note
        setTimeout(() => {
            editNote(noteId);
        }, 500);
    }
}

// Utility functions
function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
}

function formatTimeAgo(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours < 24) return `${hours} hours ago`;
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days} days ago`;

    return date.toLocaleDateString();
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