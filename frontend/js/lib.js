// Library Extensions and Integrations for DSA Path Application

const Lib = {
    // Markdown processor
    markdown: {
        renderer: null,

        init() {
            if (typeof marked !== 'undefined') {
                this.renderer = new marked.Renderer();
                this.setupRenderer();
                marked.setOptions({
                    renderer: this.renderer,
                    highlight: this.highlightCode,
                    gfm: true,
                    breaks: true,
                    sanitize: false
                });
            }
        },

        setupRenderer() {
            // Custom link renderer
            this.renderer.link = (href, title, text) => {
                const isExternal = href.startsWith('http') && !href.includes(window.location.hostname);
                const target = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
                const titleAttr = title ? ` title="${title}"` : '';
                return `<a href="${href}"${titleAttr}${target}>${text}</a>`;
            };

            // Custom code block renderer
            this.renderer.code = (code, language) => {
                const validLang = language && hljs.getLanguage(language) ? language : 'plaintext';
                const highlighted = hljs.highlight(code, { language: validLang }).value;
                return `<div class="code-block"><pre><code class="hljs language-${validLang}">${highlighted}</code></pre><button class="code-copy-btn" onclick="Lib.utils.copyCode(this)">Copy</button></div>`;
            };

            // Custom table renderer
            this.renderer.table = (header, body) => {
                return `<div class="table-responsive"><table class="table table-striped">${header}${body}</table></div>`;
            };
        },

        highlightCode(code, language) {
            if (typeof hljs !== 'undefined') {
                const validLang = language && hljs.getLanguage(language) ? language : 'plaintext';
                return hljs.highlight(code, { language: validLang }).value;
            }
            return code;
        },

        render(markdown) {
            if (typeof marked !== 'undefined') {
                return marked(markdown);
            }
            return markdown.replace(/\n/g, '<br>');
        }
    },

    // Chart.js configurations
    charts: {
        init() {
            if (typeof Chart !== 'undefined') {
                this.setupDefaults();
                this.registerCustomPlugins();
            }
        },

        setupDefaults() {
            Chart.defaults.font.family = 'Inter, sans-serif';
            Chart.defaults.font.size = 12;
            Chart.defaults.animation.duration = 800;
            Chart.defaults.responsive = true;
            Chart.defaults.maintainAspectRatio = false;
        },

        registerCustomPlugins() {
            // Empty state plugin
            Chart.register({
                id: 'emptyState',
                beforeDraw: (chart) => {
                    const { data } = chart.config;
                    if (data.datasets.length === 0 || data.datasets[0].data.length === 0) {
                        const { ctx, chartArea: { left, top, width, height } } = chart;
                        ctx.save();
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.font = '16px Inter, sans-serif';
                        ctx.fillStyle = '#9ca3af';
                        ctx.fillText('No data available', left + width / 2, top + height / 2);
                        ctx.restore();
                    }
                }
            });
        },

        createProgressChart(canvas, data) {
            return new Chart(canvas, {
                type: 'doughnut',
                data: {
                    labels: ['Completed', 'Remaining'],
                    datasets: [{
                        data: [data.completed, data.total - data.completed],
                        backgroundColor: ['#10b981', '#e5e7eb'],
                        borderWidth: 0
                    }]
                },
                options: {
                    cutout: '70%',
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const percentage = ((context.parsed / data.total) * 100).toFixed(1);
                                    return `${context.label}: ${context.parsed} (${percentage}%)`;
                                }
                            }
                        }
                    }
                },
                plugins: [{
                    id: 'centerText',
                    beforeDraw: (chart) => {
                        const { ctx, chartArea: { left, top, width, height } } = chart;
                        ctx.save();
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.font = 'bold 24px Inter, sans-serif';
                        ctx.fillStyle = '#1f2937';
                        const percentage = ((data.completed / data.total) * 100).toFixed(0);
                        ctx.fillText(`${percentage}%`, left + width / 2, top + height / 2);
                        ctx.restore();
                    }
                }]
            });
        },

        createStreakChart(canvas, streakData) {
            return new Chart(canvas, {
                type: 'line',
                data: {
                    labels: streakData.labels,
                    datasets: [{
                        label: 'Study Streak',
                        data: streakData.values,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            });
        },

        createWeeklyProgressChart(canvas, weeklyData) {
            return new Chart(canvas, {
                type: 'bar',
                data: {
                    labels: weeklyData.map(w => `Week ${w.week}`),
                    datasets: [{
                        label: 'Completion %',
                        data: weeklyData.map(w => w.percentage),
                        backgroundColor: weeklyData.map(w =>
                            w.percentage === 100 ? '#10b981' :
                                w.percentage >= 50 ? '#3b82f6' : '#f59e0b'
                        ),
                        borderRadius: 4
                    }]
                },
                options: {
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                                callback: (value) => value + '%'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => `${context.parsed.y}% completed`
                            }
                        }
                    }
                }
            });
        }
    },

    // Pomodoro timer worker
    timer: {
        worker: null,
        callbacks: {},

        init() {
            this.createWorker();
        },

        createWorker() {
            const workerCode = `
        let timerId = null;
        let startTime = null;
        let duration = 0;
        
        self.onmessage = function(e) {
          const { action, data } = e.data;
          
          switch (action) {
            case 'start':
              startTime = Date.now();
              duration = data.duration * 60 * 1000; // Convert to milliseconds
              timerId = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const remaining = Math.max(0, duration - elapsed);
                
                self.postMessage({
                  type: 'tick',
                  remaining: Math.ceil(remaining / 1000),
                  elapsed: Math.floor(elapsed / 1000)
                });
                
                if (remaining <= 0) {
                  clearInterval(timerId);
                  self.postMessage({ type: 'complete' });
                }
              }, 1000);
              break;
              
            case 'pause':
              if (timerId) {
                clearInterval(timerId);
                timerId = null;
              }
              break;
              
            case 'resume':
              if (!timerId && startTime) {
                timerId = setInterval(() => {
                  const elapsed = Date.now() - startTime;
                  const remaining = Math.max(0, duration - elapsed);
                  
                  self.postMessage({
                    type: 'tick',
                    remaining: Math.ceil(remaining / 1000),
                    elapsed: Math.floor(elapsed / 1000)
                  });
                  
                  if (remaining <= 0) {
                    clearInterval(timerId);
                    self.postMessage({ type: 'complete' });
                  }
                }, 1000);
              }
              break;
              
            case 'stop':
              if (timerId) {
                clearInterval(timerId);
                timerId = null;
              }
              startTime = null;
              duration = 0;
              break;
          }
        };
      `;

            const blob = new Blob([workerCode], { type: 'application/javascript' });
            this.worker = new Worker(URL.createObjectURL(blob));

            this.worker.onmessage = (e) => {
                const { type, ...data } = e.data;
                if (this.callbacks[type]) {
                    this.callbacks[type](data);
                }
            };
        },

        start(duration, callbacks = {}) {
            this.callbacks = callbacks;
            this.worker.postMessage({
                action: 'start',
                data: { duration }
            });
        },

        pause() {
            this.worker.postMessage({ action: 'pause' });
        },

        resume() {
            this.worker.postMessage({ action: 'resume' });
        },

        stop() {
            this.worker.postMessage({ action: 'stop' });
            this.callbacks = {};
        }
    },

    // Audio management
    audio: {
        sounds: {},
        isEnabled: true,

        init() {
            this.loadSounds();
            this.checkPermissions();
        },

        loadSounds() {
            this.sounds = {
                notification: new Audio('/assets/sounds/notification.mp3'),
                timerComplete: new Audio('/assets/sounds/timer-complete.mp3'),
                achievement: new Audio('/assets/sounds/achievement.mp3')
            };

            // Preload sounds
            Object.values(this.sounds).forEach(sound => {
                sound.preload = 'auto';
                sound.volume = 0.7;
            });
        },

        play(soundName) {
            if (!this.isEnabled || !this.sounds[soundName]) return;

            const sound = this.sounds[soundName];
            sound.currentTime = 0;

            const playPromise = sound.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.warn('Audio play failed:', error);
                });
            }
        },

        setEnabled(enabled) {
            this.isEnabled = enabled;
            Storage.preferences.updatePreferences({ soundEnabled: enabled });
        },

        checkPermissions() {
            // Check if audio context is suspended (autoplay policy)
            if (typeof AudioContext !== 'undefined') {
                const audioContext = new (AudioContext || webkitAudioContext)();
                if (audioContext.state === 'suspended') {
                    document.addEventListener('click', () => {
                        audioContext.resume();
                    }, { once: true });
                }
            }
        }
    },

    // Utility functions
    utils: {
        copyCode(button) {
            const codeBlock = button.parentElement;
            const code = codeBlock.querySelector('code');
            if (code) {
                Utils.browser.copyToClipboard(code.textContent).then(success => {
                    if (success) {
                        button.textContent = 'Copied!';
                        setTimeout(() => {
                            button.textContent = 'Copy';
                        }, 2000);
                    }
                });
            }
        },

        formatFileSize(bytes) {
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            if (bytes === 0) return '0 Bytes';
            const i = Math.floor(Math.log(bytes) / Math.log(1024));
            return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
        },

        generateId() {
            return Date.now().toString(36) + Math.random().toString(36).substr(2);
        },

        createRipple(element, event) {
            const ripple = document.createElement('span');
            const rect = element.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = event.clientX - rect.left - size / 2;
            const y = event.clientY - rect.top - size / 2;

            ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        transform: scale(0);
        animation: ripple 0.6s linear;
        pointer-events: none;
      `;

            element.style.position = 'relative';
            element.style.overflow = 'hidden';
            element.appendChild(ripple);

            setTimeout(() => {
                ripple.remove();
            }, 600);
        }
    },

    // Performance monitoring
    performance: {
        marks: new Map(),

        mark(name) {
            const timestamp = performance.now();
            this.marks.set(name, timestamp);
            performance.mark(name);
        },

        measure(name, startMark, endMark) {
            try {
                performance.measure(name, startMark, endMark);
                const measure = performance.getEntriesByName(name, 'measure')[0];
                return measure.duration;
            } catch (error) {
                console.warn('Performance measurement failed:', error);
                return 0;
            }
        },

        getDuration(startMark) {
            const start = this.marks.get(startMark);
            if (start) {
                return performance.now() - start;
            }
            return 0;
        }
    }
};

// Initialize library extensions
document.addEventListener('DOMContentLoaded', () => {
    Lib.markdown.init();
    Lib.charts.init();
    Lib.timer.init();
    Lib.audio.init();
});

// Export Lib for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Lib;
}