// Animation utilities and effects

// Intersection Observer for scroll animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');

            // Add stagger effect for children
            const children = entry.target.querySelectorAll('.animate-child');
            children.forEach((child, index) => {
                setTimeout(() => {
                    child.classList.add('animate-in');
                }, index * 100);
            });
        }
    });
}, observerOptions);

// Initialize scroll animations
document.addEventListener('DOMContentLoaded', () => {
    // Observe elements with animation classes
    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        scrollObserver.observe(el);
    });
});

// Ripple effect for buttons
function createRipple(event) {
    const button = event.currentTarget;
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.classList.add('ripple');

    button.appendChild(ripple);

    setTimeout(() => ripple.remove(), 600);
}

// Add ripple to all buttons
document.addEventListener('click', (e) => {
    if (e.target.matches('.btn, .btn *')) {
        const btn = e.target.closest('.btn');
        if (btn && !btn.classList.contains('no-ripple')) {
            createRipple(e);
        }
    }
});

// Page transition animations
class PageTransition {
    constructor() {
        this.overlay = this.createOverlay();
    }

    createOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'page-transition-overlay';
        overlay.innerHTML = `
            <div class="transition-logo">
                <i class="fas fa-code fa-2x text-primary"></i>
            </div>
        `;
        document.body.appendChild(overlay);
        return overlay;
    }

    async animateOut() {
        this.overlay.classList.add('active');
        await this.wait(500);
    }

    async animateIn() {
        this.overlay.classList.remove('active');
        await this.wait(500);
    }

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Smooth number counter animation
function animateCounter(element, start, end, duration) {
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            element.textContent = end;
            clearInterval(timer);
        } else {
            element.textContent = Math.round(current);
        }
    }, 16);
}

// Animate counters when visible
const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.animated) {
            const target = parseInt(entry.target.getAttribute('data-target') || entry.target.textContent);
            animateCounter(entry.target, 0, target, 1000);
            entry.target.animated = true;
        }
    });
});

document.querySelectorAll('.animate-counter').forEach(el => {
    counterObserver.observe(el);
});

// Parallax scrolling effect
function initParallax() {
    const parallaxElements = document.querySelectorAll('.parallax');

    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;

        parallaxElements.forEach(el => {
            const speed = el.getAttribute('data-speed') || 0.5;
            const yPos = -(scrolled * speed);
            el.style.transform = `translateY(${yPos}px)`;
        });
    });
}

// Smooth scroll to section
function smoothScrollTo(target, duration = 1000) {
    const targetElement = document.querySelector(target);
    if (!targetElement) return;

    const targetPosition = targetElement.offsetTop - 80;
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    let startTime = null;

    function animation(currentTime) {
        if (startTime === null) startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        const run = ease(timeElapsed, startPosition, distance, duration);
        window.scrollTo(0, run);
        if (timeElapsed < duration) requestAnimationFrame(animation);
    }

    function ease(t, b, c, d) {
        t /= d / 2;
        if (t < 1) return c / 2 * t * t + b;
        t--;
        return -c / 2 * (t * (t - 2) - 1) + b;
    }

    requestAnimationFrame(animation);
}

// Typewriter effect
class Typewriter {
    constructor(element, texts, options = {}) {
        this.element = element;
        this.texts = texts;
        this.options = {
            typeSpeed: options.typeSpeed || 100,
            deleteSpeed: options.deleteSpeed || 50,
            pauseTime: options.pauseTime || 2000,
            loop: options.loop !== false
        };
        this.textIndex = 0;
        this.charIndex = 0;
        this.isDeleting = false;
        this.init();
    }

    init() {
        this.type();
    }

    type() {
        const currentText = this.texts[this.textIndex];
        const displayText = currentText.substring(0, this.charIndex);

        this.element.textContent = displayText;
        this.element.classList.add('typing');

        if (!this.isDeleting && this.charIndex === currentText.length) {
            this.isDeleting = true;
            setTimeout(() => this.type(), this.options.pauseTime);
        } else if (this.isDeleting && this.charIndex === 0) {
            this.isDeleting = false;
            this.textIndex = (this.textIndex + 1) % this.texts.length;
            setTimeout(() => this.type(), 500);
        } else {
            this.charIndex += this.isDeleting ? -1 : 1;
            const speed = this.isDeleting ? this.options.deleteSpeed : this.options.typeSpeed;
            setTimeout(() => this.type(), speed);
        }
    }
}

// Particle animation for achievements
function createConfettiParticles(x, y, count = 30) {
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#a78bfa'];

    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.className = 'confetti-particle';
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];

        const angle = (Math.PI * 2 * i) / count;
        const velocity = 5 + Math.random() * 5;
        const vx = Math.cos(angle) * velocity;
        const vy = Math.sin(angle) * velocity - 5;

        document.body.appendChild(particle);

        let posX = 0;
        let posY = 0;
        let opacity = 1;
        let scale = 1;

        const animate = () => {
            posX += vx;
            posY += vy + 0.5;
            opacity -= 0.02;
            scale -= 0.01;

            particle.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
            particle.style.opacity = opacity;

            if (opacity > 0) {
                requestAnimationFrame(animate);
            } else {
                particle.remove();
            }
        };

        requestAnimationFrame(animate);
    }
}

// Loading animation manager
class LoadingManager {
    static show(container = document.body) {
        const loader = document.createElement('div');
        loader.className = 'loading-overlay';
        loader.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        `;
        container.appendChild(loader);

        setTimeout(() => loader.classList.add('active'), 10);
    }

    static hide(container = document.body) {
        const loader = container.querySelector('.loading-overlay');
        if (loader) {
            loader.classList.remove('active');
            setTimeout(() => loader.remove(), 300);
        }
    }
}

// Gesture animations for mobile
class GestureAnimation {
    constructor(element) {
        this.element = element;
        this.startX = 0;
        this.startY = 0;
        this.currentX = 0;
        this.currentY = 0;
        this.init();
    }

    init() {
        this.element.addEventListener('touchstart', this.handleStart.bind(this), { passive: true });
        this.element.addEventListener('touchmove', this.handleMove.bind(this), { passive: true });
        this.element.addEventListener('touchend', this.handleEnd.bind(this));
    }

    handleStart(e) {
        this.startX = e.touches[0].clientX;
        this.startY = e.touches[0].clientY;
    }

    handleMove(e) {
        this.currentX = e.touches[0].clientX;
        this.currentY = e.touches[0].clientY;

        const deltaX = this.currentX - this.startX;
        const deltaY = this.currentY - this.startY;

        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            this.element.style.transform = `translateX(${deltaX}px)`;
        }
    }

    handleEnd() {
        const deltaX = this.currentX - this.startX;

        if (Math.abs(deltaX) > 100) {
            this.element.style.transform = `translateX(${deltaX > 0 ? '100%' : '-100%'})`;
            this.element.style.opacity = '0';

            setTimeout(() => {
                this.element.dispatchEvent(new CustomEvent('swipe', {
                    detail: { direction: deltaX > 0 ? 'right' : 'left' }
                }));
            }, 300);
        } else {
            this.element.style.transform = 'translateX(0)';
        }
    }
}

// Export animation utilities
window.AnimationUtils = {
    PageTransition,
    Typewriter,
    LoadingManager,
    GestureAnimation,
    createRipple,
    animateCounter,
    smoothScrollTo,
    createConfettiParticles,
    initParallax
};

// CSS for animations
const animationStyles = document.createElement('style');
animationStyles.textContent = `
    /* Page transition overlay */
    .page-transition-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: white;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.5s ease;
    }
    
    .page-transition-overlay.active {
        opacity: 1;
        pointer-events: all;
    }
    
    .transition-logo {
        animation: pulse 1s infinite;
    }
    
    /* Ripple effect */
    .btn {
        position: relative;
        overflow: hidden;
    }
    
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.5);
        transform: scale(0);
        animation: ripple-animation 0.6s ease-out;
    }
    
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    /* Scroll animations */
    .animate-on-scroll {
        opacity: 0;
        transform: translateY(30px);
        transition: opacity 0.6s ease, transform 0.6s ease;
    }
    
    .animate-on-scroll.animate-in {
        opacity: 1;
        transform: translateY(0);
    }
    
    .animate-child {
        opacity: 0;
        transform: translateY(20px);
        transition: opacity 0.4s ease, transform 0.4s ease;
    }
    
    .animate-child.animate-in {
        opacity: 1;
        transform: translateY(0);
    }
    
    /* Typewriter cursor */
    .typing::after {
        content: '|';
        animation: blink 1s infinite;
    }
    
    @keyframes blink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0; }
    }
    
    /* Confetti particles */
    .confetti-particle {
        position: fixed;
        width: 10px;
        height: 10px;
        pointer-events: none;
        z-index: 9999;
    }
    
    /* Loading overlay */
    .loading-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
        z-index: 1000;
    }
    
    .loading-overlay.active {
        opacity: 1;
    }
`;

document.head.appendChild(animationStyles);