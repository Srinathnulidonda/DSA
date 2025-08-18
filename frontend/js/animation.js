// js/animation.js
// Animation utilities and effects

class DSAAnimations {
    // Intersection Observer for scroll animations
    static initScrollAnimations() {
        const animatedElements = document.querySelectorAll('[data-animate]');

        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const element = entry.target;
                        const animation = element.dataset.animate;
                        const delay = element.dataset.animateDelay || 0;

                        setTimeout(() => {
                            element.classList.add('animated', animation);
                            observer.unobserve(element);
                        }, delay);
                    }
                });
            }, {
                threshold: 0.1,
                rootMargin: '0px 0px -100px 0px'
            });

            animatedElements.forEach(el => observer.observe(el));
        } else {
            // Fallback for browsers without IntersectionObserver
            animatedElements.forEach(el => {
                const animation = el.dataset.animate;
                el.classList.add('animated', animation);
            });
        }
    }

    // Confetti animation for achievements
    static confetti(duration = 3000) {
        const container = document.createElement('div');
        container.className = 'confetti-container';
        container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9999;
        `;

        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9'];
        const confettiCount = 100;

        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti-piece';
            confetti.style.cssText = `
                position: absolute;
                width: 10px;
                height: 10px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                left: ${Math.random() * 100}%;
                animation: confetti-fall ${2 + Math.random() * 2}s linear infinite;
                animation-delay: ${Math.random() * 2}s;
                transform: rotate(${Math.random() * 360}deg);
            `;
            container.appendChild(confetti);
        }

        document.body.appendChild(container);

        setTimeout(() => {
            container.remove();
        }, duration);
    }

    // Number counter animation
    static countUp(element, start, end, duration = 2000) {
        const startTime = performance.now();
        const range = end - start;

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            const current = start + (range * this.easeOutQuart(progress));
            element.textContent = Math.floor(current);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.textContent = end;
            }
        };

        requestAnimationFrame(animate);
    }

    // Easing function
    static easeOutQuart(t) {
        return 1 - Math.pow(1 - t, 4);
    }

    // Typewriter effect
    static typewriter(element, text, speed = 50) {
        let i = 0;
        element.textContent = '';

        const type = () => {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
                setTimeout(type, speed);
            }
        };

        type();
    }

    // Ripple effect for buttons
    static initRippleEffect() {
        document.addEventListener('click', (e) => {
            const button = e.target.closest('.btn-ripple');
            if (!button) return;

            const ripple = document.createElement('span');
            ripple.className = 'ripple';

            const rect = button.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;

            ripple.style.cssText = `
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
            `;

            button.appendChild(ripple);

            setTimeout(() => ripple.remove(), 600);
        });
    }

    // Progress bar animation
    static animateProgressBar(element, targetWidth, duration = 1000) {
        const startWidth = parseFloat(element.style.width) || 0;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            const currentWidth = startWidth + (targetWidth - startWidth) * this.easeOutQuart(progress);
            element.style.width = `${currentWidth}%`;

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    // Shake animation for errors
    static shake(element, duration = 500) {
        element.classList.add('animate-shake');
        setTimeout(() => {
            element.classList.remove('animate-shake');
        }, duration);
    }

    // Pulse animation for notifications
    static pulse(element, count = 3) {
        let pulses = 0;

        const doPulse = () => {
            element.classList.add('animate-pulse');

            setTimeout(() => {
                element.classList.remove('animate-pulse');
                pulses++;

                if (pulses < count) {
                    setTimeout(doPulse, 200);
                }
            }, 1000);
        };

        doPulse();
    }

    // Fade in/out
    static fadeIn(element, duration = 300) {
        element.style.opacity = '0';
        element.style.display = 'block';

        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            element.style.opacity = progress;

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    static fadeOut(element, duration = 300) {
        const startTime = performance.now();
        const startOpacity = parseFloat(element.style.opacity) || 1;

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            element.style.opacity = startOpacity * (1 - progress);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.style.display = 'none';
            }
        };

        requestAnimationFrame(animate);
    }

    // Slide animations
    static slideDown(element, duration = 300) {
        element.style.height = '0';
        element.style.overflow = 'hidden';
        element.style.display = 'block';

        const targetHeight = element.scrollHeight;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            element.style.height = `${targetHeight * this.easeOutQuart(progress)}px`;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.style.height = '';
                element.style.overflow = '';
            }
        };

        requestAnimationFrame(animate);
    }

    static slideUp(element, duration = 300) {
        const startHeight = element.scrollHeight;
        const startTime = performance.now();

        element.style.height = `${startHeight}px`;
        element.style.overflow = 'hidden';

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            element.style.height = `${startHeight * (1 - this.easeOutQuart(progress))}px`;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.style.display = 'none';
                element.style.height = '';
                element.style.overflow = '';
            }
        };

        requestAnimationFrame(animate);
    }

    // Loading skeleton animation
    static showSkeleton(container, count = 3) {
        let skeletons = '';

        for (let i = 0; i < count; i++) {
            skeletons += `
                <div class="skeleton-item mb-3">
                    <div class="skeleton skeleton-title"></div>
                    <div class="skeleton skeleton-text"></div>
                    <div class="skeleton skeleton-text" style="width: 80%"></div>
                </div>
            `;
        }

        container.innerHTML = skeletons;
    }

    // Particle animation for background
    static createParticles(container, count = 50) {
        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.cssText = `
                position: absolute;
                width: ${2 + Math.random() * 4}px;
                height: ${2 + Math.random() * 4}px;
                background: rgba(59, 130, 246, ${0.3 + Math.random() * 0.5});
                border-radius: 50%;
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
                animation: float ${10 + Math.random() * 20}s infinite;
                animation-delay: ${Math.random() * 5}s;
            `;
            container.appendChild(particle);
        }
    }

    // Success checkmark animation
    static successCheckmark(container) {
        const svg = `
            <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                <circle class="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
                <path class="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
            </svg>
        `;

        container.innerHTML = svg;
    }

    // Loading dots animation
    static loadingDots(container) {
        container.innerHTML = `
            <div class="loading-dots">
                <div class="loading-dot"></div>
                <div class="loading-dot"></div>
                <div class="loading-dot"></div>
            </div>
        `;
    }

    // Hover effects for cards
    static initCardHoverEffects() {
        const cards = document.querySelectorAll('.hover-lift');

        cards.forEach(card => {
            card.addEventListener('mouseenter', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                card.style.transform = `
                    perspective(1000px)
                    rotateX(${(y - rect.height / 2) / 10}deg)
                    rotateY(${-(x - rect.width / 2) / 10}deg)
                    translateZ(10px)
                `;
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = '';
            });
        });
    }

    // Initialize all animations
    static init() {
        this.initScrollAnimations();
        this.initRippleEffect();
        this.initCardHoverEffects();

        // Add CSS for animations if not already present
        if (!document.getElementById('dsa-animations-css')) {
            const style = document.createElement('style');
            style.id = 'dsa-animations-css';
            style.textContent = `
                @keyframes confetti-fall {
                    0% {
                        transform: translateY(-100vh) rotate(0deg);
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(100vh) rotate(720deg);
                        opacity: 0;
                    }
                }
                
                .ripple {
                    position: absolute;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.6);
                    transform: scale(0);
                    animation: ripple-effect 0.6s ease-out;
                    pointer-events: none;
                }
                
                @keyframes ripple-effect {
                    to {
                        transform: scale(4);
                        opacity: 0;
                    }
                }
                
                @keyframes float {
                    0%, 100% {
                        transform: translateY(0) translateX(0);
                    }
                    33% {
                        transform: translateY(-30px) translateX(30px);
                    }
                    66% {
                        transform: translateY(30px) translateX(-30px);
                    }
                }
                
                .skeleton {
                    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                    background-size: 200% 100%;
                    animation: loading 1.5s infinite;
                }
                
                .skeleton-title {
                    height: 24px;
                    margin-bottom: 12px;
                    border-radius: 4px;
                }
                
                .skeleton-text {
                    height: 16px;
                    margin-bottom: 8px;
                    border-radius: 4px;
                }
                
                .checkmark {
                    width: 100px;
                    height: 100px;
                    border-radius: 50%;
                    display: block;
                    stroke-width: 2;
                    stroke: #22c55e;
                    stroke-miterlimit: 10;
                    margin: 10% auto;
                    box-shadow: inset 0px 0px 0px #22c55e;
                    animation: fill .4s ease-in-out .4s forwards, scale .3s ease-in-out .9s both;
                }
                
                .checkmark-circle {
                    stroke-dasharray: 166;
                    stroke-dashoffset: 166;
                    stroke-width: 2;
                    stroke-miterlimit: 10;
                    stroke: #22c55e;
                    fill: none;
                    animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
                }
                
                .checkmark-check {
                    transform-origin: 50% 50%;
                    stroke-dasharray: 48;
                    stroke-dashoffset: 48;
                    animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards;
                }
                
                @keyframes stroke {
                    100% {
                        stroke-dashoffset: 0;
                    }
                }
                
                @keyframes scale {
                    0%, 100% {
                        transform: none;
                    }
                    50% {
                        transform: scale3d(1.1, 1.1, 1);
                    }
                }
                
                @keyframes fill {
                    100% {
                        box-shadow: inset 0px 0px 0px 30px #22c55e;
                    }
                }
                
                .animated {
                    animation-duration: 1s;
                    animation-fill-mode: both;
                }
                
                .hover-lift {
                    transition: transform 0.3s ease, box-shadow 0.3s ease;
                }
                
                .hover-lift:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
                }
            `;
            document.head.appendChild(style);
        }
    }
}

// Auto-initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    DSAAnimations.init();
});

// Export for use
window.DSAAnimations = DSAAnimations;