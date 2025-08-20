// Third-party library integrations and utilities

// Markdown Parser Integration
class MarkdownEditor {
    constructor(element, options = {}) {
        this.element = element;
        this.options = {
            toolbar: true,
            preview: true,
            autosave: true,
            ...options
        };

        this.init();
    }

    init() {
        // Create editor structure
        this.createEditor();

        // Setup event listeners
        this.setupListeners();

        // Load saved content
        if (this.options.autosave) {
            this.loadDraft();
        }
    }

    createEditor() {
        const container = document.createElement('div');
        container.className = 'markdown-editor';

        if (this.options.toolbar) {
            container.innerHTML += this.createToolbar();
        }

        container.innerHTML += `
            <div class="editor-container ${this.options.preview ? 'with-preview' : ''}">
                <div class="editor-pane">
                    <textarea class="editor-input form-control" placeholder="Write your notes here...">${this.element.value || ''}</textarea>
                </div>
                ${this.options.preview ? '<div class="preview-pane"><div class="preview-content"></div></div>' : ''}
            </div>
        `;

        this.element.replaceWith(container);
        this.container = container;
        this.textarea = container.querySelector('.editor-input');
        this.preview = container.querySelector('.preview-content');
    }

    createToolbar() {
        return `
            <div class="editor-toolbar">
                <div class="btn-group btn-group-sm">
                    <button type="button" class="btn btn-outline-secondary" data-action="bold" title="Bold">
                        <i class="bi bi-type-bold"></i>
                    </button>
                    <button type="button" class="btn btn-outline-secondary" data-action="italic" title="Italic">
                        <i class="bi bi-type-italic"></i>
                    </button>
                    <button type="button" class="btn btn-outline-secondary" data-action="heading" title="Heading">
                        <i class="bi bi-type-h1"></i>
                    </button>
                    <button type="button" class="btn btn-outline-secondary" data-action="link" title="Link">
                        <i class="bi bi-link-45deg"></i>
                    </button>
                    <button type="button" class="btn btn-outline-secondary" data-action="code" title="Code">
                        <i class="bi bi-code"></i>
                    </button>
                    <button type="button" class="btn btn-outline-secondary" data-action="list" title="List">
                        <i class="bi bi-list-ul"></i>
                    </button>
                    <button type="button" class="btn btn-outline-secondary" data-action="quote" title="Quote">
                        <i class="bi bi-quote"></i>
                    </button>
                </div>
                <div class="btn-group btn-group-sm ms-auto">
                    <button type="button" class="btn btn-outline-secondary" data-action="preview" title="Toggle Preview">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button type="button" class="btn btn-outline-secondary" data-action="fullscreen" title="Fullscreen">
                        <i class="bi bi-fullscreen"></i>
                    </button>
                </div>
            </div>
        `;
    }

    setupListeners() {
        // Toolbar actions
        this.container.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', () => this.handleAction(btn.dataset.action));
        });

        // Auto preview update
        if (this.preview) {
            this.textarea.addEventListener('input', () => {
                this.updatePreview();
                if (this.options.autosave) {
                    this.saveDraft();
                }
            });

            // Initial preview
            this.updatePreview();
        }

        // Keyboard shortcuts
        this.textarea.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'b': e.preventDefault(); this.handleAction('bold'); break;
                    case 'i': e.preventDefault(); this.handleAction('italic'); break;
                    case 'k': e.preventDefault(); this.handleAction('link'); break;
                }
            }
        });
    }

    handleAction(action) {
        const textarea = this.textarea;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selectedText = text.substring(start, end);

        let replacement = '';
        let cursorOffset = 0;

        switch (action) {
            case 'bold':
                replacement = `**${selectedText || 'bold text'}**`;
                cursorOffset = selectedText ? replacement.length : 2;
                break;
            case 'italic':
                replacement = `*${selectedText || 'italic text'}*`;
                cursorOffset = selectedText ? replacement.length : 1;
                break;
            case 'heading':
                replacement = `## ${selectedText || 'Heading'}`;
                cursorOffset = 3;
                break;
            case 'link':
                replacement = `[${selectedText || 'link text'}](url)`;
                cursorOffset = selectedText ? replacement.length - 5 : 1;
                break;
            case 'code':
                if (selectedText.includes('\n')) {
                    replacement = `\`\`\`\n${selectedText}\n\`\`\``;
                } else {
                    replacement = `\`${selectedText || 'code'}\``;
                }
                cursorOffset = selectedText ? replacement.length : 1;
                break;
            case 'list':
                replacement = selectedText.split('\n').map(line => `- ${line}`).join('\n');
                cursorOffset = 2;
                break;
            case 'quote':
                replacement = selectedText.split('\n').map(line => `> ${line}`).join('\n');
                cursorOffset = 2;
                break;
            case 'preview':
                this.container.classList.toggle('preview-hidden');
                return;
            case 'fullscreen':
                this.container.classList.toggle('fullscreen');
                return;
        }

        textarea.value = text.substring(0, start) + replacement + text.substring(end);
        textarea.focus();
        textarea.setSelectionRange(start + cursorOffset, start + cursorOffset);

        this.updatePreview();
    }

    parseMarkdown(text) {
        // Basic markdown parser
        let html = text;

        // Headers
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

        // Bold
        html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

        // Italic
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

        // Links
        html = html.replace(
            /```math\s*([\s\S]*?)```KATEX_INLINE_OPENKATEX_INLINE_OPEN([^)]+)KATEX_INLINE_CLOSEKATEX_INLINE_CLOSE/g,
            '<a href="$2" target="_blank">$1</a>'
        );

        // Code blocks
        html = html.replace(/```(.*?)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');

        // Inline code
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Lists
        html = html.replace(/^\* (.+)/gim, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

        // Line breaks
        html = html.replace(/\n/g, '<br>');

        // Paragraphs
        html = html.replace(/(<br>){2,}/g, '</p><p>');
        html = '<p>' + html + '</p>';

        return html;
    }

    updatePreview() {
        if (this.preview) {
            this.preview.innerHTML = this.parseMarkdown(this.textarea.value);

            // Syntax highlighting for code blocks
            this.preview.querySelectorAll('pre code').forEach(block => {
                this.highlightCode(block);
            });
        }
    }

    highlightCode(block) {
        // Basic syntax highlighting
        const language = block.className.replace('language-', '');
        const code = block.textContent;

        // Keywords
        const keywords = ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'class', 'import', 'export', 'def', 'elif'];
        let highlighted = code;

        keywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'g');
            highlighted = highlighted.replace(regex, `<span class="keyword">${keyword}</span>`);
        });

        // Strings
        highlighted = highlighted.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '<span class="string">$&</span>');

        // Comments
        highlighted = highlighted.replace(/(\/\/.*$)/gm, '<span class="comment">$1</span>');
        highlighted = highlighted.replace(/(#.*$)/gm, '<span class="comment">$1</span>');

        block.innerHTML = highlighted;
    }

    getValue() {
        return this.textarea.value;
    }

    setValue(value) {
        this.textarea.value = value;
        this.updatePreview();
    }

    saveDraft() {
        if (this.options.draftKey) {
            drafts.saveNote({
                id: this.options.draftKey,
                content: this.textarea.value
            });
        }
    }

    loadDraft() {
        if (this.options.draftKey) {
            const draft = drafts.getNote(this.options.draftKey);
            if (draft) {
                this.setValue(draft.content);
            }
        }
    }
}

// Chart.js Configuration Helper
class ChartHelper {
    static createProgressChart(canvas, data) {
        const ctx = canvas.getContext('2d');

        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Progress',
                    data: data.values,
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }

    static createStreakChart(canvas, data) {
        const ctx = canvas.getContext('2d');

        return new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Study Time (minutes)',
                    data: data.values,
                    backgroundColor: 'rgba(16, 185, 129, 0.8)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    static createTopicsChart(canvas, data) {
        const ctx = canvas.getContext('2d');

        return new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.values,
                    backgroundColor: [
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(139, 92, 246, 0.8)'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
}

// Timer Web Worker for Pomodoro
class TimerWorker {
    constructor() {
        // Create worker code as blob
        const workerCode = `
            let timer = null;
            let remaining = 0;
            let isPaused = true;

            self.onmessage = function(e) {
                const { action, duration } = e.data;
                
                switch(action) {
                    case 'start':
                        remaining = duration * 60;
                        isPaused = false;
                        startTimer();
                        break;
                    case 'pause':
                        isPaused = true;
                        break;
                    case 'resume':
                        isPaused = false;
                        break;
                    case 'stop':
                        clearInterval(timer);
                        remaining = 0;
                        isPaused = true;
                        self.postMessage({ type: 'stopped' });
                        break;
                }
            };

            function startTimer() {
                if (timer) clearInterval(timer);
                
                timer = setInterval(() => {
                    if (!isPaused && remaining > 0) {
                        remaining--;
                        self.postMessage({
                            type: 'tick',
                            remaining: remaining,
                            minutes: Math.floor(remaining / 60),
                            seconds: remaining % 60
                        });
                        
                        if (remaining === 0) {
                            clearInterval(timer);
                            self.postMessage({ type: 'completed' });
                        }
                    }
                }, 1000);
            }
        `;

        const blob = new Blob([workerCode], { type: 'application/javascript' });
        this.worker = new Worker(URL.createObjectURL(blob));
    }

    start(duration, onTick, onComplete) {
        this.worker.onmessage = (e) => {
            if (e.data.type === 'tick') {
                onTick(e.data);
            } else if (e.data.type === 'completed') {
                onComplete();
            }
        };

        this.worker.postMessage({ action: 'start', duration });
    }

    pause() {
        this.worker.postMessage({ action: 'pause' });
    }

    resume() {
        this.worker.postMessage({ action: 'resume' });
    }

    stop() {
        this.worker.postMessage({ action: 'stop' });
    }

    terminate() {
        this.worker.terminate();
    }
}

// Confetti Animation
class Confetti {
    constructor() {
        this.particles = [];
        this.animationId = null;
    }

    start() {
        const canvas = document.createElement('canvas');
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '9999';
        document.body.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        // Create particles
        for (let i = 0; i < 100; i++) {
            this.particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height - canvas.height,
                vx: Math.random() * 2 - 1,
                vy: Math.random() * 2 + 2,
                color: `hsl(${Math.random() * 360}, 100%, 50%)`,
                size: Math.random() * 4 + 2,
                angle: Math.random() * 360,
                angularVelocity: Math.random() * 0.2 - 0.1
            });
        }

        // Animate
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            this.particles = this.particles.filter(particle => {
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.vy += 0.1; // gravity
                particle.angle += particle.angularVelocity;

                ctx.save();
                ctx.translate(particle.x, particle.y);
                ctx.rotate(particle.angle);
                ctx.fillStyle = particle.color;
                ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
                ctx.restore();

                return particle.y < canvas.height + 10;
            });

            if (this.particles.length > 0) {
                this.animationId = requestAnimationFrame(animate);
            } else {
                canvas.remove();
            }
        };

        animate();

        // Auto stop after 5 seconds
        setTimeout(() => this.stop(), 5000);
    }

    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        this.particles = [];
    }
}

// Export utilities
window.MarkdownEditor = MarkdownEditor;
window.ChartHelper = ChartHelper;
window.TimerWorker = TimerWorker;
window.confetti = new Confetti();