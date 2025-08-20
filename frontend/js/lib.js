// Library Functions and Third-party Integrations
const Lib = {
    // Chart.js Configuration
    charts: {
        // Default chart options
        getDefaultOptions(theme = 'light') {
            const isDark = theme === 'dark';
            return {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: isDark ? '#f8fafc' : '#1e293b',
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        backgroundColor: isDark ? '#1e293b' : '#ffffff',
                        titleColor: isDark ? '#f8fafc' : '#1e293b',
                        bodyColor: isDark ? '#cbd5e1' : '#64748b',
                        borderColor: isDark ? '#334155' : '#e2e8f0',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: isDark ? '#334155' : '#f1f5f9',
                            borderColor: isDark ? '#475569' : '#e2e8f0'
                        },
                        ticks: {
                            color: isDark ? '#cbd5e1' : '#64748b'
                        }
                    },
                    y: {
                        grid: {
                            color: isDark ? '#334155' : '#f1f5f9',
                            borderColor: isDark ? '#475569' : '#e2e8f0'
                        },
                        ticks: {
                            color: isDark ? '#cbd5e1' : '#64748b'
                        }
                    }
                }
            };
        },

        // Create progress chart
        createProgressChart(canvasId, data) {
            const ctx = document.getElementById(canvasId);
            if (!ctx) return null;

            const theme = ThemeManager.getCurrentTheme();

            return new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Completed', 'Remaining'],
                    datasets: [{
                        data: [data.completed, data.total - data.completed],
                        backgroundColor: [
                            CHART_COLORS.SUCCESS,
                            theme === 'dark' ? '#334155' : '#f1f5f9'
                        ],
                        borderWidth: 0,
                        cutout: '70%'
                    }]
                },
                options: {
                    ...this.getDefaultOptions(theme),
                    plugins: {
                        ...this.getDefaultOptions(theme).plugins,
                        legend: {
                            display: false
                        }
                    }
                }
            });
        },

        // Create streak chart
        createStreakChart(canvasId, streakData) {
            const ctx = document.getElementById(canvasId);
            if (!ctx) return null;

            const theme = ThemeManager.getCurrentTheme();

            return new Chart(ctx, {
                type: 'line',
                data: {
                    labels: streakData.labels,
                    datasets: [{
                        label: 'Study Streak',
                        data: streakData.values,
                        borderColor: CHART_COLORS.PRIMARY,
                        backgroundColor: theme === 'dark' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: CHART_COLORS.PRIMARY,
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    }]
                },
                options: {
                    ...this.getDefaultOptions(theme),
                    scales: {
                        ...this.getDefaultOptions(theme).scales,
                        y: {
                            ...this.getDefaultOptions(theme).scales.y,
                            beginAtZero: true,
                            max: Math.max(...streakData.values) + 5
                        }
                    }
                }
            });
        },

        // Create time distribution chart
        createTimeChart(canvasId, timeData) {
            const ctx = document.getElementById(canvasId);
            if (!ctx) return null;

            const theme = ThemeManager.getCurrentTheme();

            return new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: timeData.labels,
                    datasets: [{
                        label: 'Study Time (minutes)',
                        data: timeData.values,
                        backgroundColor: CHART_COLORS.INFO,
                        borderColor: CHART_COLORS.INFO,
                        borderWidth: 1,
                        borderRadius: 4,
                        borderSkipped: false
                    }]
                },
                options: {
                    ...this.getDefaultOptions(theme),
                    scales: {
                        ...this.getDefaultOptions(theme).scales,
                        y: {
                            ...this.getDefaultOptions(theme).scales.y,
                            beginAtZero: true
                        }
                    }
                }
            });
        },

        // Update chart theme
        updateChartTheme(chart, theme) {
            const options = this.getDefaultOptions(theme);
            chart.options = { ...chart.options, ...options };
            chart.update('none');
        }
    },

    // Markdown Editor
    markdown: {
        // Convert markdown to HTML
        toHtml(markdown) {
            if (!markdown) return '';

            // Configure marked options
            marked.setOptions({
                breaks: true,
                gfm: true,
                highlight: function (code, lang) {
                    if (lang && Prism.languages[lang]) {
                        return Prism.highlight(code, Prism.languages[lang], lang);
                    }
                    return code;
                }
            });

            return marked.parse(markdown);
        },

        // Create markdown editor
        createEditor(textareaId, options = {}) {
            const textarea = document.getElementById(textareaId);
            if (!textarea) return null;

            const container = document.createElement('div');
            container.className = 'markdown-editor border rounded';

            // Create toolbar
            const toolbar = this.createToolbar();
            container.appendChild(toolbar);

            // Wrap textarea
            textarea.parentNode.insertBefore(container, textarea);
            container.appendChild(textarea);

            // Add editor styling
            textarea.className += ' form-control border-0 rounded-0';
            textarea.style.minHeight = options.minHeight || '200px';
            textarea.style.resize = 'vertical';

            // Create preview
            if (options.preview !== false) {
                const preview = this.createPreview();
                container.appendChild(preview);

                // Toggle between edit and preview
                this.setupPreviewToggle(textarea, preview, toolbar);
            }

            // Add keyboard shortcuts
            this.addKeyboardShortcuts(textarea);

            return {
                getContent: () => textarea.value,
                setContent: (content) => { textarea.value = content; },
                getHtml: () => this.toHtml(textarea.value)
            };
        },

        createToolbar() {
            const toolbar = document.createElement('div');
            toolbar.className = 'markdown-toolbar border-bottom p-2 bg-light';

            const buttons = [
                { icon: 'bi-type-bold', title: 'Bold', action: 'bold' },
                { icon: 'bi-type-italic', title: 'Italic', action: 'italic' },
                { icon: 'bi-link-45deg', title: 'Link', action: 'link' },
                { icon: 'bi-code-slash', title: 'Code', action: 'code' },
                { icon: 'bi-list-ul', title: 'List', action: 'list' },
                { icon: 'bi-blockquote-left', title: 'Quote', action: 'quote' },
                { icon: 'bi-eye', title: 'Preview', action: 'preview' }
            ];

            buttons.forEach(button => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'btn btn-sm btn-outline-secondary me-1';
                btn.innerHTML = `<i class="${button.icon}"></i>`;
                btn.title = button.title;
                btn.dataset.action = button.action;
                toolbar.appendChild(btn);
            });

            return toolbar;
        },

        createPreview() {
            const preview = document.createElement('div');
            preview.className = 'markdown-preview p-3 bg-white d-none';
            preview.style.minHeight = '200px';
            return preview;
        },

        setupPreviewToggle(textarea, preview, toolbar) {
            const previewBtn = toolbar.querySelector('[data-action="preview"]');
            let isPreview = false;

            previewBtn.addEventListener('click', () => {
                isPreview = !isPreview;

                if (isPreview) {
                    textarea.classList.add('d-none');
                    preview.classList.remove('d-none');
                    preview.innerHTML = this.toHtml(textarea.value);
                    previewBtn.innerHTML = '<i class="bi-pencil"></i>';
                    previewBtn.title = 'Edit';
                } else {
                    textarea.classList.remove('d-none');
                    preview.classList.add('d-none');
                    previewBtn.innerHTML = '<i class="bi-eye"></i>';
                    previewBtn.title = 'Preview';
                }
            });
        },

        addKeyboardShortcuts(textarea) {
            textarea.addEventListener('keydown', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    switch (e.key) {
                        case 'b':
                            e.preventDefault();
                            this.insertMarkdown(textarea, '**', '**');
                            break;
                        case 'i':
                            e.preventDefault();
                            this.insertMarkdown(textarea, '_', '_');
                            break;
                        case 'k':
                            e.preventDefault();
                            this.insertLink(textarea);
                            break;
                    }
                }

                if (e.key === 'Tab') {
                    e.preventDefault();
                    this.insertTab(textarea);
                }
            });
        },

        insertMarkdown(textarea, before, after) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = textarea.value;
            const selectedText = text.substring(start, end);

            const newText = text.substring(0, start) + before + selectedText + after + text.substring(end);
            textarea.value = newText;

            // Set cursor position
            const newPos = start + before.length + selectedText.length;
            textarea.setSelectionRange(newPos, newPos);
            textarea.focus();
        },

        insertLink(textarea) {
            const url = prompt('Enter URL:');
            if (url) {
                const text = prompt('Enter link text:') || url;
                this.insertMarkdown(textarea, `[${text}](`, ')');
            }
        },

        insertTab(textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;

            textarea.value = textarea.value.substring(0, start) + '  ' + textarea.value.substring(end);
            textarea.setSelectionRange(start + 2, start + 2);
        }
    },

    // Timer Worker
    timer: {
        worker: null,
        callbacks: {},

        // Initialize timer worker
        init() {
            if (!this.worker) {
                this.createWorker();
            }
        },

        createWorker() {
            const workerCode = `
                let timerId = null;
                let isRunning = false;
                
                self.onmessage = function(e) {
                    const { action, data } = e.data;
                    
                    switch (action) {
                        case 'start':
                            if (!isRunning) {
                                isRunning = true;
                                timerId = setInterval(() => {
                                    self.postMessage({ action: 'tick' });
                                }, 1000);
                            }
                            break;
                            
                        case 'pause':
                            if (isRunning) {
                                isRunning = false;
                                clearInterval(timerId);
                                timerId = null;
                            }
                            break;
                            
                        case 'stop':
                            isRunning = false;
                            if (timerId) {
                                clearInterval(timerId);
                                timerId = null;
                            }
                            break;
                    }
                };
            `;

            const blob = new Blob([workerCode], { type: 'application/javascript' });
            this.worker = new Worker(URL.createObjectURL(blob));

            this.worker.onmessage = (e) => {
                const { action } = e.data;
                if (this.callbacks[action]) {
                    this.callbacks[action]();
                }
            };
        },

        start() {
            this.worker.postMessage({ action: 'start' });
        },

        pause() {
            this.worker.postMessage({ action: 'pause' });
        },

        stop() {
            this.worker.postMessage({ action: 'stop' });
        },

        onTick(callback) {
            this.callbacks.tick = callback;
        }
    },

    // Code Syntax Highlighting
    syntax: {
        // Highlight code block
        highlight(code, language = 'javascript') {
            if (!Prism.languages[language]) {
                language = 'javascript';
            }

            return Prism.highlight(code, Prism.languages[language], language);
        },

        // Highlight all code blocks on page
        highlightAll() {
            Prism.highlightAll();
        },

        // Add copy button to code blocks
        addCopyButtons() {
            document.querySelectorAll('pre code').forEach(block => {
                if (block.parentNode.querySelector('.copy-btn')) return;

                const button = document.createElement('button');
                button.className = 'copy-btn btn btn-sm btn-outline-secondary position-absolute top-0 end-0 m-2';
                button.innerHTML = '<i class="bi-clipboard"></i>';
                button.title = 'Copy to clipboard';

                button.addEventListener('click', () => {
                    navigator.clipboard.writeText(block.textContent).then(() => {
                        button.innerHTML = '<i class="bi-check"></i>';
                        setTimeout(() => {
                            button.innerHTML = '<i class="bi-clipboard"></i>';
                        }, 2000);
                    });
                });

                block.parentNode.style.position = 'relative';
                block.parentNode.appendChild(button);
            });
        }
    },

    // Utilities for complex UI interactions
    ui: {
        // Create draggable elements
        makeDraggable(element, options = {}) {
            let isDragging = false;
            let startX, startY, startLeft, startTop;

            const handle = options.handle ? element.querySelector(options.handle) : element;

            handle.addEventListener('mousedown', startDrag);
            handle.addEventListener('touchstart', startDrag);

            function startDrag(e) {
                isDragging = true;

                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const clientY = e.touches ? e.touches[0].clientY : e.clientY;

                startX = clientX;
                startY = clientY;
                startLeft = parseInt(window.getComputedStyle(element).left, 10) || 0;
                startTop = parseInt(window.getComputedStyle(element).top, 10) || 0;

                document.addEventListener('mousemove', drag);
                document.addEventListener('touchmove', drag);
                document.addEventListener('mouseup', stopDrag);
                document.addEventListener('touchend', stopDrag);

                e.preventDefault();
            }

            function drag(e) {
                if (!isDragging) return;

                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const clientY = e.touches ? e.touches[0].clientY : e.clientY;

                const deltaX = clientX - startX;
                const deltaY = clientY - startY;

                element.style.left = (startLeft + deltaX) + 'px';
                element.style.top = (startTop + deltaY) + 'px';
            }

            function stopDrag() {
                isDragging = false;
                document.removeEventListener('mousemove', drag);
                document.removeEventListener('touchmove', drag);
                document.removeEventListener('mouseup', stopDrag);
                document.removeEventListener('touchend', stopDrag);
            }
        },

        // Create resizable elements
        makeResizable(element, options = {}) {
            const resizer = document.createElement('div');
            resizer.className = 'resizer position-absolute bottom-0 end-0';
            resizer.style.width = '10px';
            resizer.style.height = '10px';
            resizer.style.cursor = 'se-resize';
            resizer.innerHTML = '<i class="bi-grip-horizontal"></i>';

            element.style.position = 'relative';
            element.appendChild(resizer);

            let isResizing = false;

            resizer.addEventListener('mousedown', startResize);

            function startResize(e) {
                isResizing = true;
                document.addEventListener('mousemove', resize);
                document.addEventListener('mouseup', stopResize);
                e.preventDefault();
            }

            function resize(e) {
                if (!isResizing) return;

                const rect = element.getBoundingClientRect();
                const newWidth = e.clientX - rect.left;
                const newHeight = e.clientY - rect.top;

                if (newWidth > (options.minWidth || 100)) {
                    element.style.width = newWidth + 'px';
                }

                if (newHeight > (options.minHeight || 100)) {
                    element.style.height = newHeight + 'px';
                }
            }

            function stopResize() {
                isResizing = false;
                document.removeEventListener('mousemove', resize);
                document.removeEventListener('mouseup', stopResize);
            }
        },

        // Smooth scroll to element
        scrollTo(element, options = {}) {
            const targetElement = typeof element === 'string' ? document.querySelector(element) : element;

            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: options.block || 'start',
                    inline: options.inline || 'nearest'
                });
            }
        },

        // Lazy load images
        lazyLoadImages() {
            const images = document.querySelectorAll('img[data-src]');

            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        img.classList.remove('lazy');
                        observer.unobserve(img);
                    }
                });
            });

            images.forEach(img => {
                imageObserver.observe(img);
            });
        },

        // Create infinite scroll
        infiniteScroll(container, callback, options = {}) {
            const threshold = options.threshold || 100;
            let isLoading = false;

            const scrollHandler = Utils.throttle(() => {
                if (isLoading) return;

                const { scrollTop, scrollHeight, clientHeight } = container;

                if (scrollTop + clientHeight >= scrollHeight - threshold) {
                    isLoading = true;
                    callback().finally(() => {
                        isLoading = false;
                    });
                }
            }, 250);

            container.addEventListener('scroll', scrollHandler);

            return () => {
                container.removeEventListener('scroll', scrollHandler);
            };
        }
    }
};

// Initialize timer worker
Lib.timer.init();

// Make available globally
window.Lib = Lib;