// Notes Management Module
const Notes = {
    // Save a new note
    save: function (userProgress, currentUser) {
        const titleEl = document.getElementById('noteTitle');
        const contentEl = document.getElementById('noteContent');

        const title = titleEl.value.trim();
        const content = contentEl.value.trim();

        if (!title || !content) {
            Utils.showToast('Please enter both title and content for your note.', 'error');
            return;
        }

        const note = {
            id: Date.now(),
            title: title,
            content: content,
            timestamp: new Date().toISOString(),
            week: this.getCurrentWeek(userProgress),
            tags: this.extractTags(content),
            category: this.categorizeNote(title, content)
        };

        if (!userProgress.notes) {
            userProgress.notes = [];
        }

        userProgress.notes.push(note);

        // Save to Firebase
        if (currentUser && typeof firebase !== 'undefined') {
            const database = firebase.database();
            database.ref(`users/${currentUser}/notes/${note.id}`).set(note);
        }

        // Clear form
        titleEl.value = '';
        contentEl.value = '';

        // Clear draft
        localStorage.removeItem('noteDraft');

        this.displaySaved(userProgress);
        Utils.showToast('Note saved successfully!', 'success');

        // Save progress
        if (window.app) {
            window.app.saveProgress();
        }
    },

    // Delete a note
    delete: function (noteId, userProgress, currentUser) {
        if (!confirm('Are you sure you want to delete this note?')) {
            return;
        }

        userProgress.notes = userProgress.notes.filter(note => note.id !== noteId);

        // Delete from Firebase
        if (currentUser && typeof firebase !== 'undefined') {
            const database = firebase.database();
            database.ref(`users/${currentUser}/notes/${noteId}`).remove();
        }

        this.displaySaved(userProgress);
        Utils.showToast('Note deleted.', 'success');
    },

    // Display saved notes
    displaySaved: function (userProgress) {
        const savedNotes = document.getElementById('savedNotes');
        if (!savedNotes) return;

        const progress = userProgress || (window.app && window.app.userProgress) || { notes: [] };
        const notes = progress.notes || [];

        if (notes.length === 0) {
            savedNotes.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-sticky-note fa-3x text-muted mb-3"></i>
                    <p class="text-muted">No notes saved yet. Start taking notes to see them here!</p>
                </div>
            `;
            return;
        }

        // Sort notes by timestamp (newest first)
        const sortedNotes = notes.sort((a, b) =>
            new Date(b.timestamp) - new Date(a.timestamp)
        );

        savedNotes.innerHTML = sortedNotes.map(note => `
            <div class="note-item">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <h6 class="mb-1">${this.escapeHtml(note.title)}</h6>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteNote(${note.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <p class="mb-2">${this.escapeHtml(note.content.substring(0, 150))}${note.content.length > 150 ? '...' : ''}</p>
                ${note.tags && note.tags.length > 0 ? `
                    <div class="mb-2">
                        ${note.tags.map(tag => `<span class="badge bg-secondary me-1">${tag}</span>`).join('')}
                    </div>
                ` : ''}
                <div class="note-timestamp">
                    ${Utils.formatDate(note.timestamp)} - Week ${note.week}
                </div>
            </div>
        `).join('');
    },

    // Setup auto-save functionality
    setupAutoSave: function () {
        let saveTimeout;
        const titleEl = document.getElementById('noteTitle');
        const contentEl = document.getElementById('noteContent');

        if (!titleEl || !contentEl) return;

        const autoSave = () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                const title = titleEl.value.trim();
                const content = contentEl.value.trim();

                if (title || content) {
                    // Save to localStorage as draft
                    localStorage.setItem('noteDraft', JSON.stringify({ title, content }));
                }
            }, 1000);
        };

        titleEl.addEventListener('input', autoSave);
        contentEl.addEventListener('input', autoSave);

        // Load draft on page load
        this.loadDraft();
    },

    // Load draft note
    loadDraft: function () {
        const draft = localStorage.getItem('noteDraft');
        if (!draft) return;

        try {
            const { title, content } = JSON.parse(draft);
            const titleEl = document.getElementById('noteTitle');
            const contentEl = document.getElementById('noteContent');

            if (titleEl && !titleEl.value) {
                titleEl.value = title || '';
            }
            if (contentEl && !contentEl.value) {
                contentEl.value = content || '';
            }
        } catch (error) {
            console.error('Error loading draft:', error);
        }
    },

    // Get current week based on progress
    getCurrentWeek: function (userProgress) {
        const completedTopics = userProgress.completedTopics.length;
        const topicsPerWeek = 7;
        return Math.min(14, Math.floor(completedTopics / topicsPerWeek) + 1);
    },

    // Extract tags from content
    extractTags: function (content) {
        const tagRegex = /#(\w+)/g;
        const tags = [];
        let match;

        while ((match = tagRegex.exec(content)) !== null) {
            tags.push(match[1].toLowerCase());
        }

        return [...new Set(tags)]; // Remove duplicates
    },

    // Categorize note based on content
    categorizeNote: function (title, content) {
        const text = (title + ' ' + content).toLowerCase();

        const categories = {
            'algorithm': ['algorithm', 'complexity', 'big o', 'time', 'space'],
            'datastructure': ['array', 'list', 'stack', 'queue', 'tree', 'graph', 'heap', 'hash'],
            'implementation': ['code', 'implement', 'function', 'class', 'method'],
            'concept': ['concept', 'theory', 'definition', 'explain'],
            'problem': ['problem', 'solution', 'approach', 'solve'],
            'project': ['project', 'build', 'create', 'develop']
        };

        for (const [category, keywords] of Object.entries(categories)) {
            if (keywords.some(keyword => text.includes(keyword))) {
                return category;
            }
        }

        return 'general';
    },

    // Search notes
    search: function (searchTerm, userProgress) {
        const notes = userProgress.notes || [];
        const term = searchTerm.toLowerCase();

        return notes.filter(note =>
            note.title.toLowerCase().includes(term) ||
            note.content.toLowerCase().includes(term) ||
            (note.tags && note.tags.some(tag => tag.includes(term)))
        );
    },

    // Export notes
    export: function (userProgress) {
        const notes = userProgress.notes || [];

        if (notes.length === 0) {
            Utils.showToast('No notes to export.', 'info');
            return;
        }

        const exportData = {
            notes: notes,
            exportDate: new Date().toISOString(),
            totalNotes: notes.length
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `dsa-notes-${new Date().toISOString().split('T')[0]}.json`;
        link.click();

        Utils.showToast(`${notes.length} notes exported successfully!`, 'success');
    },

    // Export as Markdown
    exportAsMarkdown: function (userProgress) {
        const notes = userProgress.notes || [];

        if (notes.length === 0) {
            Utils.showToast('No notes to export.', 'info');
            return;
        }

        let markdown = '# DSA Learning Notes\n\n';
        markdown += `_Exported on ${new Date().toLocaleDateString()}_\n\n`;

        // Group notes by week
        const notesByWeek = {};
        notes.forEach(note => {
            const week = note.week || 'Uncategorized';
            if (!notesByWeek[week]) {
                notesByWeek[week] = [];
            }
            notesByWeek[week].push(note);
        });

        // Generate markdown
        Object.entries(notesByWeek).forEach(([week, weekNotes]) => {
            markdown += `## Week ${week}\n\n`;

            weekNotes.forEach(note => {
                markdown += `### ${note.title}\n\n`;
                markdown += `${note.content}\n\n`;

                if (note.tags && note.tags.length > 0) {
                    markdown += `_Tags: ${note.tags.map(tag => `#${tag}`).join(', ')}_\n\n`;
                }

                markdown += `_Created: ${Utils.formatDate(note.timestamp, 'long')}_\n\n`;
                markdown += '---\n\n';
            });
        });

        const dataBlob = new Blob([markdown], { type: 'text/markdown' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `dsa-notes-${new Date().toISOString().split('T')[0]}.md`;
        link.click();

        Utils.showToast('Notes exported as Markdown!', 'success');
    },

    // Escape HTML to prevent XSS
    escapeHtml: function (text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    },

    // Get note statistics
    getStatistics: function (userProgress) {
        const notes = userProgress.notes || [];

        const stats = {
            totalNotes: notes.length,
            notesByWeek: {},
            notesByCategory: {},
            mostUsedTags: {},
            averageNoteLength: 0
        };

        if (notes.length === 0) return stats;

        let totalLength = 0;

        notes.forEach(note => {
            // By week
            const week = note.week || 'Uncategorized';
            stats.notesByWeek[week] = (stats.notesByWeek[week] || 0) + 1;

            // By category
            const category = note.category || 'general';
            stats.notesByCategory[category] = (stats.notesByCategory[category] || 0) + 1;

            // Tags
            if (note.tags) {
                note.tags.forEach(tag => {
                    stats.mostUsedTags[tag] = (stats.mostUsedTags[tag] || 0) + 1;
                });
            }

            // Length
            totalLength += note.content.length;
        });

        stats.averageNoteLength = Math.round(totalLength / notes.length);

        // Sort tags by frequency
        stats.mostUsedTags = Object.entries(stats.mostUsedTags)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .reduce((obj, [tag, count]) => {
                obj[tag] = count;
                return obj;
            }, {});

        return stats;
    }
};

// Export Notes module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Notes;
}