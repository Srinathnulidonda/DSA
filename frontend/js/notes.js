// Notes Service with Real-time collaboration
class NotesService {
    constructor() {
        this.notes = [];
        this.searchIndex = new Map();
        this.isOnline = navigator.onLine;
        this.pendingChanges = [];
        this.collaborationId = null;
        this.collaborators = new Map();
        this.changeListeners = [];

        // Initialize real-time features
        this.initializeRealTimeFeatures();
        this.setupAutoSave();
        this.buildSearchIndex();
    }

    // Real-time Collaboration
    initializeRealTimeFeatures() {
        // Listen for real-time note updates
        if (window.DSAApp && window.DSAApp.api) {
            window.DSAApp.api.addEventListener('note-update', (data) => {
                this.handleRealTimeNoteUpdate(data);
            });
        }

        // Set up collaborative editing
        this.setupCollaborativeEditing();

        // Handle network status changes
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.syncPendingChanges();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }

    setupCollaborativeEditing() {
        // Initialize collaborative editing session
        this.collaborationId = this.generateCollaborationId();

        // Set up WebSocket for real-time collaboration
        if (window.DSAApp && window.DSAApp.api && window.DSAApp.api.websocket) {
            const ws = window.DSAApp.api.websocket;

            ws.addEventListener('message', (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'collaborative-note-edit') {
                    this.handleCollaborativeEdit(data.payload);
                }
            });
        }
    }

    generateCollaborationId() {
        return 'collab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    handleRealTimeNoteUpdate(data) {
        const { action, note, noteId } = data;

        switch (action) {
            case 'create':
                this.addNoteToLocal(note);
                break;
            case 'update':
                this.updateNoteInLocal(noteId, note);
                break;
            case 'delete':
                this.removeNoteFromLocal(noteId);
                break;
        }

        // Notify listeners
        this.notifyChangeListeners({ action, note, noteId });
    }

    handleCollaborativeEdit(data) {
        const { noteId, operation, userId, userInfo } = data;

        // Update collaborators list
        this.collaborators.set(userId, {
            ...userInfo,
            lastActivity: Date.now(),
            currentNote: noteId
        });

        // Apply collaborative operation
        this.applyCollaborativeOperation(noteId, operation);

        // Show collaborator indicator
        this.showCollaboratorActivity(userId, userInfo, operation);
    }

    // Auto-save functionality
    setupAutoSave() {
        this.autoSaveInterval = setInterval(() => {
            this.autoSaveChanges();
        }, 30000); // Auto-save every 30 seconds

        // Save on page unload
        window.addEventListener('beforeunload', () => {
            this.autoSaveChanges();
        });
    }

    autoSaveChanges() {
        if (this.pendingChanges.length > 0 && this.isOnline) {
            this.syncPendingChanges();
        }
    }

    // Core CRUD Operations
    async createNote(noteData) {
        const note = {
            id: this.generateNoteId(),
            content: noteData.content || '',
            topic: noteData.topic || '',
            week: noteData.week || '',
            day: noteData.day || '',
            tags: noteData.tags || [],
            category: noteData.category || 'general',
            priority: noteData.priority || 'medium',
            review_needed: noteData.review_needed || false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            version: 1,
            offline_created: !this.isOnline
        };

        // Add to local collection
        this.addNoteToLocal(note);

        // Sync with server if online
        if (this.isOnline) {
            try {
                const serverNote = await window.DSAApp.api.createNote(note);

                // Update with server data
                this.updateNoteInLocal(note.id, serverNote);

                console.log('✅ Note created and synced');
                return serverNote;

            } catch (error) {
                console.error('❌ Failed to sync note creation:', error);
                this.addToPendingChanges('create', note);
            }
        } else {
            this.addToPendingChanges('create', note);
        }

        return note;
    }

    async updateNote(noteId, updateData) {
        const existingNote = this.findNoteById(noteId);
        if (!existingNote) {
            throw new Error('Note not found');
        }

        const updatedNote = {
            ...existingNote,
            ...updateData,
            updated_at: new Date().toISOString(),
            version: (existingNote.version || 1) + 1
        };

        // Update locally
        this.updateNoteInLocal(noteId, updatedNote);

        // Sync with server if online
        if (this.isOnline) {
            try {
                const serverNote = await window.DSAApp.api.updateNote(noteId, updatedNote);

                // Update with server data
                this.updateNoteInLocal(noteId, serverNote);

                console.log('✅ Note updated and synced');
                return serverNote;

            } catch (error) {
                console.error('❌ Failed to sync note update:', error);
                this.addToPendingChanges('update', updatedNote);
            }
        } else {
            this.addToPendingChanges('update', updatedNote);
        }

        return updatedNote;
    }

    async deleteNote(noteId) {
        const note = this.findNoteById(noteId);
        if (!note) {
            throw new Error('Note not found');
        }

        // Mark as deleted locally
        this.removeNoteFromLocal(noteId);

        // Sync with server if online
        if (this.isOnline) {
            try {
                await window.DSAApp.api.deleteNote(noteId);
                console.log('✅ Note deleted and synced');

            } catch (error) {
                console.error('❌ Failed to sync note deletion:', error);
                this.addToPendingChanges('delete', { id: noteId });
            }
        } else {
            this.addToPendingChanges('delete', { id: noteId });
        }

        return true;
    }

    // Search and Filter Operations
    searchNotes(query, filters = {}) {
        if (!query || query.length < 2) {
            return this.filterNotes(filters);
        }

        const searchTerms = query.toLowerCase().split(' ');
        const results = [];

        this.notes.forEach(note => {
            let score = 0;
            const searchableText = `
                ${note.content} 
                ${note.topic} 
                ${note.tags.join(' ')} 
                ${note.category}
            `.toLowerCase();

            // Calculate relevance score
            searchTerms.forEach(term => {
                if (note.topic.toLowerCase().includes(term)) score += 10;
                if (note.content.toLowerCase().includes(term)) score += 5;
                if (note.tags.some(tag => tag.toLowerCase().includes(term))) score += 8;
                if (note.category.toLowerCase().includes(term)) score += 3;
            });

            if (score > 0) {
                results.push({ ...note, searchScore: score });
            }
        });

        // Sort by relevance
        results.sort((a, b) => b.searchScore - a.searchScore);

        // Apply additional filters
        return this.applyFilters(results, filters);
    }

    filterNotes(filters = {}) {
        let filteredNotes = [...this.notes];

        // Apply filters
        if (filters.week) {
            filteredNotes = filteredNotes.filter(note => note.week === filters.week);
        }

        if (filters.day) {
            filteredNotes = filteredNotes.filter(note => note.day === filters.day);
        }

        if (filters.category) {
            filteredNotes = filteredNotes.filter(note => note.category === filters.category);
        }

        if (filters.priority) {
            filteredNotes = filteredNotes.filter(note => note.priority === filters.priority);
        }

        if (filters.tags && filters.tags.length > 0) {
            filteredNotes = filteredNotes.filter(note =>
                filters.tags.some(tag => note.tags.includes(tag))
            );
        }

        if (filters.review_needed !== undefined) {
            filteredNotes = filteredNotes.filter(note => note.review_needed === filters.review_needed);
        }

        // Sort by updated date (newest first)
        filteredNotes.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

        return filteredNotes;
    }

    applyFilters(notes, filters) {
        if (Object.keys(filters).length === 0) {
            return notes;
        }

        return notes.filter(note => {
            if (filters.week && note.week !== filters.week) return false;
            if (filters.day && note.day !== filters.day) return false;
            if (filters.category && note.category !== filters.category) return false;
            if (filters.priority && note.priority !== filters.priority) return false;
            if (filters.review_needed !== undefined && note.review_needed !== filters.review_needed) return false;

            if (filters.tags && filters.tags.length > 0) {
                if (!filters.tags.some(tag => note.tags.includes(tag))) return false;
            }

            return true;
        });
    }

    // Advanced Search Features
    buildSearchIndex() {
        this.searchIndex.clear();

        this.notes.forEach(note => {
            const words = this.extractWords(note);
            words.forEach(word => {
                if (!this.searchIndex.has(word)) {
                    this.searchIndex.set(word, new Set());
                }
                this.searchIndex.get(word).add(note.id);
            });
        });
    }

    extractWords(note) {
        const text = `${note.content} ${note.topic} ${note.tags.join(' ')} ${note.category}`;
        return text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2);
    }

    findSimilarNotes(noteId, limit = 5) {
        const note = this.findNoteById(noteId);
        if (!note) return [];

        const noteWords = this.extractWords(note);
        const similarities = new Map();

        this.notes.forEach(otherNote => {
            if (otherNote.id === noteId) return;

            const otherWords = this.extractWords(otherNote);
            const commonWords = noteWords.filter(word => otherWords.includes(word));
            const similarity = commonWords.length / Math.max(noteWords.length, otherWords.length);

            if (similarity > 0.1) {
                similarities.set(otherNote.id, similarity);
            }
        });

        return Array.from(similarities.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([id]) => this.findNoteById(id));
    }

    // Note Organization
    getNotesStatistics() {
        const stats = {
            total: this.notes.length,
            by_category: {},
            by_priority: {},
            by_week: {},
            review_needed: 0,
            recently_created: 0,
            recently_updated: 0
        };

        const now = Date.now();
        const oneDayAgo = now - (24 * 60 * 60 * 1000);
        const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);

        this.notes.forEach(note => {
            // Category distribution
            stats.by_category[note.category] = (stats.by_category[note.category] || 0) + 1;

            // Priority distribution
            stats.by_priority[note.priority] = (stats.by_priority[note.priority] || 0) + 1;

            // Week distribution
            if (note.week) {
                stats.by_week[note.week] = (stats.by_week[note.week] || 0) + 1;
            }

            // Review needed
            if (note.review_needed) {
                stats.review_needed++;
            }

            // Time-based stats
            const createdTime = new Date(note.created_at).getTime();
            const updatedTime = new Date(note.updated_at).getTime();

            if (createdTime > oneDayAgo) {
                stats.recently_created++;
            }

            if (updatedTime > oneWeekAgo) {
                stats.recently_updated++;
            }
        });

        return stats;
    }

    getAllTags() {
        const tagCounts = new Map();

        this.notes.forEach(note => {
            note.tags.forEach(tag => {
                tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
            });
        });

        return Array.from(tagCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([tag, count]) => ({ tag, count }));
    }

    suggestTags(currentTags = [], content = '') {
        const allTags = this.getAllTags();
        const contentWords = content.toLowerCase().split(/\s+/);

        // Filter out already selected tags
        const availableTags = allTags.filter(({ tag }) => !currentTags.includes(tag));

        // Score tags based on content relevance
        const scoredTags = availableTags.map(({ tag, count }) => {
            let score = count; // Base score from frequency

            // Boost score if tag appears in content
            if (contentWords.some(word => word.includes(tag.toLowerCase()) || tag.toLowerCase().includes(word))) {
                score += 10;
            }

            return { tag, score };
        });

        return scoredTags
            .sort((a, b) => b.score - a.score)
            .slice(0, 10)
            .map(({ tag }) => tag);
    }

    // Import/Export
    exportNotes(format = 'json') {
        const exportData = {
            version: '1.0',
            exported_at: new Date().toISOString(),
            notes: this.notes,
            statistics: this.getNotesStatistics()
        };

        switch (format) {
            case 'json':
                return JSON.stringify(exportData, null, 2);

            case 'markdown':
                return this.exportToMarkdown();

            case 'csv':
                return this.exportToCSV();

            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    exportToMarkdown() {
        let markdown = '# DSA Learning Notes\n\n';

        // Group by week
        const notesByWeek = this.groupNotesByWeek();

        Object.entries(notesByWeek).forEach(([week, notes]) => {
            markdown += `## ${week.toUpperCase().replace('_', ' ')}\n\n`;

            notes.forEach(note => {
                markdown += `### ${note.topic}\n\n`;
                markdown += `**Category:** ${note.category}\n`;
                markdown += `**Priority:** ${note.priority}\n`;
                markdown += `**Tags:** ${note.tags.join(', ')}\n`;
                markdown += `**Created:** ${new Date(note.created_at).toLocaleDateString()}\n\n`;
                markdown += `${note.content}\n\n`;
                markdown += '---\n\n';
            });
        });

        return markdown;
    }

    exportToCSV() {
        const headers = ['ID', 'Topic', 'Content', 'Week', 'Day', 'Category', 'Priority', 'Tags', 'Review Needed', 'Created', 'Updated'];
        const rows = [headers.join(',')];

        this.notes.forEach(note => {
            const row = [
                note.id,
                `"${note.topic.replace(/"/g, '""')}"`,
                `"${note.content.replace(/"/g, '""')}"`,
                note.week,
                note.day,
                note.category,
                note.priority,
                `"${note.tags.join(', ')}"`,
                note.review_needed,
                new Date(note.created_at).toISOString(),
                new Date(note.updated_at).toISOString()
            ];
            rows.push(row.join(','));
        });

        return rows.join('\n');
    }

    async importNotes(data, format = 'json') {
        try {
            let notesToImport = [];

            switch (format) {
                case 'json':
                    const jsonData = typeof data === 'string' ? JSON.parse(data) : data;
                    notesToImport = jsonData.notes || jsonData;
                    break;

                case 'csv':
                    notesToImport = this.parseCSV(data);
                    break;

                default:
                    throw new Error(`Unsupported import format: ${format}`);
            }

            // Validate and import notes
            const importResults = {
                success: 0,
                errors: 0,
                duplicates: 0
            };

            for (const noteData of notesToImport) {
                try {
                    // Check for duplicates
                    const existingNote = this.notes.find(n =>
                        n.topic === noteData.topic &&
                        n.content === noteData.content
                    );

                    if (existingNote) {
                        importResults.duplicates++;
                        continue;
                    }

                    // Create new note
                    await this.createNote({
                        ...noteData,
                        imported: true
                    });

                    importResults.success++;

                } catch (error) {
                    console.error('Error importing note:', error);
                    importResults.errors++;
                }
            }

            return importResults;

        } catch (error) {
            console.error('Import failed:', error);
            throw error;
        }
    }

    parseCSV(csvData) {
        const lines = csvData.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        const notes = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const values = this.parseCSVLine(line);
            const note = {};

            headers.forEach((header, index) => {
                note[header.toLowerCase().replace(' ', '_')] = values[index] || '';
            });

            // Convert tags string to array
            if (note.tags) {
                note.tags = note.tags.split(',').map(t => t.trim()).filter(t => t);
            }

            // Convert boolean fields
            note.review_needed = note.review_needed === 'true';

            notes.push(note);
        }

        return notes;
    }

    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"' && !inQuotes) {
                inQuotes = true;
            } else if (char === '"' && inQuotes) {
                if (line[i + 1] === '"') {
                    current += '"';
                    i++; // Skip next quote
                } else {
                    inQuotes = false;
                }
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }

        values.push(current.trim());
        return values;
    }

    // Utility Methods
    addNoteToLocal(note) {
        this.notes.push(note);
        this.updateSearchIndex(note);
        this.saveToLocalStorage();
    }

    updateNoteInLocal(noteId, updatedNote) {
        const index = this.notes.findIndex(n => n.id === noteId);
        if (index >= 0) {
            this.notes[index] = updatedNote;
            this.updateSearchIndex(updatedNote);
            this.saveToLocalStorage();
        }
    }

    removeNoteFromLocal(noteId) {
        const index = this.notes.findIndex(n => n.id === noteId);
        if (index >= 0) {
            this.notes.splice(index, 1);
            this.removeFromSearchIndex(noteId);
            this.saveToLocalStorage();
        }
    }

    findNoteById(noteId) {
        return this.notes.find(n => n.id === noteId);
    }

    generateNoteId() {
        return 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    updateSearchIndex(note) {
        // Remove old entries
        this.removeFromSearchIndex(note.id);

        // Add new entries
        const words = this.extractWords(note);
        words.forEach(word => {
            if (!this.searchIndex.has(word)) {
                this.searchIndex.set(word, new Set());
            }
            this.searchIndex.get(word).add(note.id);
        });
    }

    removeFromSearchIndex(noteId) {
        this.searchIndex.forEach((noteIds, word) => {
            noteIds.delete(noteId);
            if (noteIds.size === 0) {
                this.searchIndex.delete(word);
            }
        });
    }

    groupNotesByWeek() {
        const grouped = {};

        this.notes.forEach(note => {
            const week = note.week || 'unassigned';
            if (!grouped[week]) {
                grouped[week] = [];
            }
            grouped[week].push(note);
        });

        return grouped;
    }

    saveToLocalStorage() {
        if (window.DSAApp && window.DSAApp.storage) {
            window.DSAApp.storage.set('notes', this.notes);
        }
    }

    loadFromLocalStorage() {
        if (window.DSAApp && window.DSAApp.storage) {
            const stored = window.DSAApp.storage.get('notes', []);
            this.notes = Array.isArray(stored) ? stored : [];
            this.buildSearchIndex();
        }
    }

    addToPendingChanges(action, note) {
        this.pendingChanges.push({
            action,
            note,
            timestamp: Date.now()
        });

        if (window.DSAApp && window.DSAApp.storage) {
            window.DSAApp.storage.set('pendingNoteChanges', this.pendingChanges);
        }
    }

    async syncPendingChanges() {
        if (this.pendingChanges.length === 0) return;

        console.log(`Syncing ${this.pendingChanges.length} pending note changes...`);

        const results = [];
        for (const change of this.pendingChanges) {
            try {
                switch (change.action) {
                    case 'create':
                        await window.DSAApp.api.createNote(change.note);
                        break;
                    case 'update':
                        await window.DSAApp.api.updateNote(change.note.id, change.note);
                        break;
                    case 'delete':
                        await window.DSAApp.api.deleteNote(change.note.id);
                        break;
                }
                results.push({ success: true, change });
            } catch (error) {
                console.error('Failed to sync note change:', error);
                results.push({ success: false, change, error });
            }
        }

        // Clear successfully synced changes
        this.pendingChanges = this.pendingChanges.filter((change, index) =>
            !results[index].success
        );

        if (window.DSAApp && window.DSAApp.storage) {
            window.DSAApp.storage.set('pendingNoteChanges', this.pendingChanges);
        }

        return results;
    }

    // Event Listeners
    addChangeListener(callback) {
        this.changeListeners.push(callback);
    }

    removeChangeListener(callback) {
        const index = this.changeListeners.indexOf(callback);
        if (index > -1) {
            this.changeListeners.splice(index, 1);
        }
    }

    notifyChangeListeners(change) {
        this.changeListeners.forEach(callback => {
            try {
                callback(change);
            } catch (error) {
                console.error('Error in note change listener:', error);
            }
        });
    }

    // Collaborative Features
    applyCollaborativeOperation(noteId, operation) {
        const note = this.findNoteById(noteId);
        if (!note) return;

        switch (operation.type) {
            case 'text-insert':
                this.applyTextInsert(note, operation);
                break;
            case 'text-delete':
                this.applyTextDelete(note, operation);
                break;
            case 'tag-add':
                this.applyTagAdd(note, operation);
                break;
            case 'tag-remove':
                this.applyTagRemove(note, operation);
                break;
        }

        this.updateNoteInLocal(noteId, note);
    }

    applyTextInsert(note, operation) {
        const { position, text } = operation.data;
        note.content = note.content.slice(0, position) + text + note.content.slice(position);
    }

    applyTextDelete(note, operation) {
        const { position, length } = operation.data;
        note.content = note.content.slice(0, position) + note.content.slice(position + length);
    }

    applyTagAdd(note, operation) {
        const { tag } = operation.data;
        if (!note.tags.includes(tag)) {
            note.tags.push(tag);
        }
    }

    applyTagRemove(note, operation) {
        const { tag } = operation.data;
        note.tags = note.tags.filter(t => t !== tag);
    }

    showCollaboratorActivity(userId, userInfo, operation) {
        // Show visual indicator of collaborator activity
        const indicator = document.createElement('div');
        indicator.className = 'collaborator-indicator';
        indicator.innerHTML = `
            <img src="${userInfo.photoURL || '/default-avatar.png'}" alt="${userInfo.displayName}" />
            <span>${userInfo.displayName} is editing...</span>
        `;

        document.body.appendChild(indicator);

        setTimeout(() => {
            indicator.remove();
        }, 3000);
    }

    // Public API
    getAllNotes() {
        return [...this.notes];
    }

    getNotesByWeek(week) {
        return this.notes.filter(note => note.week === week);
    }

    getNotesByCategory(category) {
        return this.notes.filter(note => note.category === category);
    }

    getNotesForReview() {
        return this.notes.filter(note => note.review_needed);
    }

    getRecentNotes(days = 7) {
        const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
        return this.notes.filter(note =>
            new Date(note.updated_at).getTime() > cutoff
        );
    }
}