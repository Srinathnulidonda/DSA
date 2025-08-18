// js/animation.js
/**
 * Animation System
 * Handles all animations, transitions, and visual effects
 */

class AnimationEngine {
    constructor() {
        this.animations = new Map();
        this.observers = new Map();
        this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.init();
    }

    init() {
        this.setupIntersectionObserver();
        this.setupScrollAnimations();
        this.setupHoverEffects();
        this.setupFocusAnimations();
        this.setupTransitionEvents();
    }

    // Intersection Observer for scroll-triggered animations
    setupIntersectionObserver() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.triggerAnimation(entry.target);
                }
            });
        }, observerOptions);

        // Observe elements with animation classes
        document.querySelectorAll('[data-animate]').forEach(el => {
            observer.observe(el);
        });

        this.observers.set('scroll', observer);
    }

    // Trigger animation on element
    triggerAnimation(element) {
        const animationType = element.dataset.animate;
        const delay = parseInt(element.dataset.delay) || 0;

        if (this.reducedMotion) {
            element.classList.add('animate-complete');
            return;
        }

        setTimeout(() => {
            switch (animationType) {
                case 'fadeIn':
                    this.fadeIn(element);
                    break;
                case 'slideInLeft':
                    this.slideInLeft(element);
                    break;
                case 'slideInRight':
                    this.slideInRight(element);
                    break;
                case 'slideInUp':
                    this.slideInUp(element);
                    break;
                case 'slideInDown':
                    this.slideInDown(element);
                    break;
                case 'scaleIn':
                    this.scaleIn(element);
                    break;
                case 'bounceIn':
                    this.bounceIn(element);
                    break;
                case 'rotateIn':
                    this.rotateIn(element);
                    break;
                default:
                    this.fadeIn(element);
            }
        }, delay);
    }

    // Animation methods
    fadeIn(element, duration = 600) {
        if (this.reducedMotion) {
            element.style.opacity = '1';
            return;
        }

        element.style.opacity = '0';
        element.style.transition = `opacity ${duration}ms ease-out`;

        requestAnimationFrame(() => {
            element.style.opacity = '1';
        });

        this.trackAnimation(element, 'fadeIn', duration);
    }

    slideInLeft(element, duration = 600, distance = 30) {
        if (this.reducedMotion) {
            element.style.transform = 'translateX(0)';
            element.style.opacity = '1';
            return;
        }

        element.style.transform = `translateX(-${distance}px)`;
        element.style.opacity = '0';
        element.style.transition = `all ${duration}ms ease-out`;

        requestAnimationFrame(() => {
            element.style.transform = 'translateX(0)';
            element.style.opacity = '1';
        });

        this.trackAnimation(element, 'slideInLeft', duration);
    }

    slideInRight(element, duration = 600, distance = 30) {
        if (this.reducedMotion) {
            element.style.transform = 'translateX(0)';
            element.style.opacity = '1';
            return;
        }

        element.style.transform = `translateX(${distance}px)`;
        element.style.opacity = '0';
        element.style.transition = `all ${duration}ms ease-out`;

        requestAnimationFrame(() => {
            element.style.transform = 'translateX(0)';
            element.style.opacity = '1';
        });

        this.trackAnimation(element, 'slideInRight', duration);
    }

    slideInUp(element, duration = 600, distance = 30) {
        if (this.reducedMotion) {
            element.style.transform = 'translateY(0)';
            element.style.opacity = '1';
            return;
        }

        element.style.transform = `translateY(${distance}px)`;
        element.style.opacity = '0';
        element.style.transition = `all ${duration}ms ease-out`;

        requestAnimationFrame(() => {
            element.style.transform = 'translateY(0)';
            element.style.opacity = '1';
        });

        this.trackAnimation(element, 'slideInUp', duration);
    }

    slideInDown(element, duration = 600, distance = 30) {
        if (this.reducedMotion) {
            element.style.transform = 'translateY(0)';
            element.style.opacity = '1';
            return;
        }

        element.style.transform = `translateY(-${distance}px)`;
        element.style.opacity = '0';
        element.style.transition = `all ${duration}ms ease-out`;

        requestAnimationFrame(() => {
            element.style.transform = 'translateY(0)';
            element.style.opacity = '1';
        });

        this.trackAnimation(element, 'slideInDown', duration);
    }

    scaleIn(element, duration = 600) {
        if (this.reducedMotion) {
            element.style.transform = 'scale(1)';
            element.style.opacity = '1';
            return;
        }

        element.style.transform = 'scale(0.9)';
        element.style.opacity = '0';
        element.style.transition = `all ${duration}ms ease-out`;

        requestAnimationFrame(() => {
            element.style.transform = 'scale(1)';
            element.style.opacity = '1';
        });

        this.trackAnimation(element, 'scaleIn', duration);
    }

    bounceIn(element, duration = 800) {
        if (this.reducedMotion) {
            element.style.transform = 'scale(1)';
            element.style.opacity = '1';
            return;
        }

        element.style.transform = 'scale(0.3)';
        element.style.opacity = '0';
        element.style.transition = `all ${duration}ms cubic-bezier(0.68, -0.55, 0.265, 1.55)`;

        requestAnimationFrame(() => {
            element.style.transform = 'scale(1)';
            element.style.opacity = '1';
        });

        this.trackAnimation(element, 'bounceIn', duration);
    }

    rotateIn(element, duration = 600) {
        if (this.reducedMotion) {
            element.style.transform = 'rotate(0deg)';
            element.style.opacity = '1';
            return;
        }

        element.style.transform = 'rotate(-180deg) scale(0.9)';
        element.style.opacity = '0';
        element.style.transition = `all ${duration}ms ease-out`;

        requestAnimationFrame(() => {
            element.style.transform = 'rotate(0deg) scale(1)';
            element.style.opacity = '1';
        });

        this.trackAnimation(element, 'rotateIn', duration);
    }

    // Track animation completion
    trackAnimation(element, type, duration) {
        const animationId = `${type}-${Date.now()}`;
        this.animations.set(animationId, {
            element,
            type,
            startTime: Date.now()
        });

        setTimeout(() => {
            element.classList.add('animation-complete');
            this.animations.delete(animationId);
        }, duration);
    }

    // Page transition animations
    pageTransition(type = 'fade', duration = 300) {
        if (this.reducedMotion) return Promise.resolve();

        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'page-transition-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: #fff;
                z-index: 9999;
                pointer-events: none;
            `;

            document.body.appendChild(overlay);

            switch (type) {
                case 'fade':
                    this.fadeTransition(overlay, duration, resolve);
                    break;
                case 'slide':
                    this.slideTransition(overlay, duration, resolve);
                    break;
                case 'zoom':
                    this.zoomTransition(overlay, duration, resolve);
                    break;
                default:
                    this.fadeTransition(overlay, duration, resolve);
            }
        });
    }

    fadeTransition(overlay, duration, callback) {
        overlay.style.opacity = '0';
        overlay.style.transition = `opacity ${duration}ms ease-in-out`;

        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
        });

        setTimeout(() => {
            overlay.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(overlay);
                callback();
            }, duration);
        }, duration);
    }

    slideTransition(overlay, duration, callback) {
        overlay.style.transform = 'translateX(100%)';
        overlay.style.transition = `transform ${duration}ms ease-in-out`;

        requestAnimationFrame(() => {
            overlay.style.transform = 'translateX(0)';
        });

        setTimeout(() => {
            overlay.style.transform = 'translateX(-100%)';
            setTimeout(() => {
                document.body.removeChild(overlay);
                callback();
            }, duration);
        }, duration);
    }

    zoomTransition(overlay, duration, callback) {
        overlay.style.transform = 'scale(0)';
        overlay.style.borderRadius = '50%';
        overlay.style.transition = `transform ${duration}ms ease-in-out`;

        requestAnimationFrame(() => {
            overlay.style.transform = 'scale(2)';
        });

        setTimeout(() => {
            overlay.style.transform = 'scale(0)';
            setTimeout(() => {
                document.body.removeChild(overlay);
                callback();
            }, duration);
        }, duration);
    }

    // Confetti animation
    createConfetti(options = {}) {
        if (this.reducedMotion) return;

        const defaults = {
            count: 50,
            colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd'],
            duration: 3000,
            spread: 60,
            startVelocity: 30
        };

        const config = { ...defaults, ...options };

        for (let i = 0; i < config.count; i++) {
            this.createConfettiPiece(config, i * 10);
        }
    }

    createConfettiPiece(config, delay) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti-piece';
            confetti.style.cssText = `
                position: fixed;
                width: 10px;
                height: 10px;
                background: ${config.colors[Math.floor(Math.random() * config.colors.length)]};
                border-radius: 2px;
                left: ${Math.random() * 100}vw;
                top: -10px;
                z-index: 9999;
                pointer-events: none;
            `;

            document.body.appendChild(confetti);

            const animation = confetti.animate([
                {
                    transform: 'translateY(-10px) rotate(0deg)',
                    opacity: 1
                },
                {
                    transform: `translateY(100vh) translateX(${(Math.random() - 0.5) * 200}px) rotate(${Math.random() * 720}deg)`,
                    opacity: 0
                }
            ], {
                duration: config.duration + Math.random() * 1000,
                easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            });

            animation.onfinish = () => {
                document.body.removeChild(confetti);
            };
        }, delay);
    }

    // Particle system for background effects
    createParticleSystem(container, options = {}) {
        if (this.reducedMotion) return;

        const defaults = {
            count: 20,
            size: 2,
            color: 'rgba(0, 123, 255, 0.3)',
            speed: 1,
            direction: 'up'
        };

        const config = { ...defaults, ...options };
        const particles = [];

        for (let i = 0; i < config.count; i++) {
            const particle = this.createParticle(container, config);
            particles.push(particle);
        }

        return {
            particles,
            destroy: () => {
                particles.forEach(particle => {
                    if (particle.parentNode) {
                        particle.parentNode.removeChild(particle);
                    }
                });
            }
        };
    }

    createParticle(container, config) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.cssText = `
            position: absolute;
            width: ${config.size}px;
            height: ${config.size}px;
            background: ${config.color};
            border-radius: 50%;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            pointer-events: none;
        `;

        container.appendChild(particle);

        const animate = () => {
            const currentTop = parseFloat(particle.style.top);
            const newTop = config.direction === 'up' ?
                currentTop - config.speed :
                currentTop + config.speed;

            if (newTop < -10 || newTop > 110) {
                particle.style.top = config.direction === 'up' ? '110%' : '-10%';
                particle.style.left = Math.random() * 100 + '%';
            } else {
                particle.style.top = newTop + '%';
            }

            requestAnimationFrame(animate);
        };

        animate();
        return particle;
    }

    // Scroll animations
    setupScrollAnimations() {
        let ticking = false;

        const updateScrollAnimations = () => {
            const scrolled = window.pageYOffset;
            const parallaxElements = document.querySelectorAll('[data-parallax]');

            parallaxElements.forEach(element => {
                if (this.reducedMotion) return;

                const speed = element.dataset.parallax || 0.5;
                const yPos = -(scrolled * speed);
                element.style.transform = `translateY(${yPos}px)`;
            });

            ticking = false;
        };

        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(updateScrollAnimations);
                ticking = true;
            }
        });
    }

    // Hover effects
    setupHoverEffects() {
        const hoverElements = document.querySelectorAll('[data-hover]');

        hoverElements.forEach(element => {
            const hoverType = element.dataset.hover;

            element.addEventListener('mouseenter', () => {
                if (this.reducedMotion) return;
                this.applyHoverEffect(element, hoverType, true);
            });

            element.addEventListener('mouseleave', () => {
                if (this.reducedMotion) return;
                this.applyHoverEffect(element, hoverType, false);
            });
        });
    }

    applyHoverEffect(element, type, isEntering) {
        const duration = 200;
        element.style.transition = `all ${duration}ms ease`;

        switch (type) {
            case 'lift':
                element.style.transform = isEntering ? 'translateY(-5px)' : 'translateY(0)';
                element.style.boxShadow = isEntering ?
                    '0 8px 25px -5px rgba(0, 0, 0, 0.2)' :
                    '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                break;
            case 'scale':
                element.style.transform = isEntering ? 'scale(1.05)' : 'scale(1)';
                break;
            case 'rotate':
                element.style.transform = isEntering ? 'rotate(5deg)' : 'rotate(0deg)';
                break;
            case 'glow':
                element.style.boxShadow = isEntering ?
                    '0 0 20px rgba(0, 123, 255, 0.5)' :
                    'none';
                break;
        }
    }

    // Focus animations
    setupFocusAnimations() {
        const focusElements = document.querySelectorAll('input, textarea, select, button, [tabindex]');

        focusElements.forEach(element => {
            element.addEventListener('focus', () => {
                if (this.reducedMotion) return;
                this.applyFocusAnimation(element, true);
            });

            element.addEventListener('blur', () => {
                if (this.reducedMotion) return;
                this.applyFocusAnimation(element, false);
            });
        });
    }

    applyFocusAnimation(element, isFocused) {
        if (element.classList.contains('form-control')) {
            element.style.transition = 'all 0.3s ease';
            element.style.transform = isFocused ? 'scale(1.02)' : 'scale(1)';
        }
    }

    // Transition events
    setupTransitionEvents() {
        document.addEventListener('transitionend', (e) => {
            if (e.target.classList.contains('animation-element')) {
                e.target.dispatchEvent(new CustomEvent('animationComplete', {
                    detail: { element: e.target, property: e.propertyName }
                }));
            }
        });
    }

    // Loading animations
    createLoadingSpinner(container, options = {}) {
        const defaults = {
            size: '40px',
            color: '#007bff',
            thickness: '4px'
        };

        const config = { ...defaults, ...options };

        const spinner = document.createElement('div');
        spinner.className = 'custom-spinner';
        spinner.style.cssText = `
            width: ${config.size};
            height: ${config.size};
            border: ${config.thickness} solid #f3f3f3;
            border-top: ${config.thickness} solid ${config.color};
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        `;

        // Add keyframes if not already present
        if (!document.querySelector('#spinner-keyframes')) {
            const style = document.createElement('style');
            style.id = 'spinner-keyframes';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }

        container.appendChild(spinner);
        return spinner;
    }

    // Text animations
    animateText(element, text, options = {}) {
        const defaults = {
            speed: 50,
            cursor: true,
            loop: false
        };

        const config = { ...defaults, ...options };

        if (this.reducedMotion) {
            element.textContent = text;
            return;
        }

        let i = 0;
        const originalText = element.textContent;
        element.textContent = '';

        const typeText = () => {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
                setTimeout(typeText, config.speed);
            } else if (config.loop) {
                setTimeout(() => {
                    element.textContent = '';
                    i = 0;
                    typeText();
                }, 2000);
            }
        };

        typeText();
    }

    // Counter animation
    animateCounter(element, target, options = {}) {
        const defaults = {
            duration: 1000,
            start: 0,
            prefix: '',
            suffix: ''
        };

        const config = { ...defaults, ...options };

        if (this.reducedMotion) {
            element.textContent = config.prefix + target + config.suffix;
            return;
        }

        const startTime = performance.now();
        const startValue = config.start;

        const updateCounter = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / config.duration, 1);

            const currentValue = Math.floor(startValue + (target - startValue) * progress);
            element.textContent = config.prefix + currentValue + config.suffix;

            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            }
        };

        requestAnimationFrame(updateCounter);
    }

    // Cleanup
    destroy() {
        this.observers.forEach(observer => observer.disconnect());
        this.observers.clear();
        this.animations.clear();
    }
}

// Create global animation engine
window.animationEngine = new AnimationEngine();

// Global animation functions
window.animateElement = (element, type, options) => {
    return animationEngine.triggerAnimation(element, type, options);
};

window.showConfetti = (options) => {
    return animationEngine.createConfetti(options);
};

window.animateCounter = (element, target, options) => {
    return animationEngine.animateCounter(element, target, options);
};

window.animateText = (element, text, options) => {
    return animationEngine.animateText(element, text, options);
};

// Page transition helper
window.transitionToPage = async (url, type = 'fade') => {
    await animationEngine.pageTransition(type);
    window.location.href = url;
};

// Auto-setup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Add data attributes to elements that should animate
    const animatedElements = document.querySelectorAll('.stat-card, .dashboard-card, .feature-card');
    animatedElements.forEach((element, index) => {
        element.setAttribute('data-animate', 'slideInUp');
        element.setAttribute('data-delay', index * 100);
    });
});

// Listen for reduced motion preference changes
window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
    animationEngine.reducedMotion = e.matches;
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AnimationEngine };
}