// js/animation.js
// Animation utilities and effects

// Intersection Observer for scroll animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const animationObserver = new IntersectionObserver((entries) => {
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

// Initialize animations
function initializeAnimations() {
    // Observe elements with animation classes
    const animatedElements = document.querySelectorAll('.animate-fade-in, .animate-fade-in-up, .animate-scale-in');
    animatedElements.forEach(el => animationObserver.observe(el));
}

// Confetti animation
function triggerConfetti(options = {}) {
    const defaults = {
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
    };

    if (typeof confetti !== 'undefined') {
        confetti({ ...defaults, ...options });
    }
}

// Progress bar animation
function animateProgressBar(element, targetValue, duration = 1000) {
    const startValue = parseInt(element.style.width) || 0;
    const startTime = performance.now();

    function updateProgress(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const currentValue = startValue + (targetValue - startValue) * easeOutQuad(progress);
        element.style.width = currentValue + '%';

        if (element.querySelector('span')) {
            element.querySelector('span').textContent = Math.round(currentValue) + '%';
        }

        if (progress < 1) {
            requestAnimationFrame(updateProgress);
        }
    }

    requestAnimationFrame(updateProgress);
}

// Easing functions
function easeOutQuad(t) {
    return t * (2 - t);
}

function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

// Number counter animation
function animateNumber(element, start, end, duration = 1000) {
    const startTime = performance.now();

    function updateNumber(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const currentValue = Math.round(start + (end - start) * easeOutQuad(progress));
        element.textContent = currentValue;

        if (progress < 1) {
            requestAnimationFrame(updateNumber);
        }
    }

    requestAnimationFrame(updateNumber);
}

// Page transition
function pageTransition(callback) {
    document.body.classList.add('page-exit-active');

    setTimeout(() => {
        callback();
        document.body.classList.remove('page-exit-active');
        document.body.classList.add('page-enter-active');

        setTimeout(() => {
            document.body.classList.remove('page-enter-active');
        }, 300);
    }, 300);
}

// Ripple effect
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

// Add ripple effect to buttons
document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('click', createRipple);
    });
});

// Loading skeleton
function showSkeleton(container, count = 3) {
    const skeletonHTML = `
        <div class="skeleton-wrapper">
            ${Array(count).fill('').map(() => `
                <div class="skeleton-item mb-3">
                    <div class="skeleton-box" style="width: 40%; height: 20px; margin-bottom: 10px;"></div>
                    <div class="skeleton-box" style="width: 100%; height: 16px; margin-bottom: 8px;"></div>
                    <div class="skeleton-box" style="width: 80%; height: 16px;"></div>
                </div>
            `).join('')}
        </div>
    `;
    container.innerHTML = skeletonHTML;
}

// Success checkmark animation
function showSuccessCheckmark(container) {
    const checkmarkHTML = `
        <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
            <circle class="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
            <path class="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
        </svg>
    `;
    container.innerHTML = checkmarkHTML;
}

// Typewriter effect
function typeWriter(element, text, speed = 50) {
    let i = 0;
    element.textContent = '';

    function type() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }

    type();
}

// Parallax scrolling
function initParallax() {
    const parallaxElements = document.querySelectorAll('.parallax');

    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;

        parallaxElements.forEach(element => {
            const speed = element.dataset.speed || 0.5;
            const yPos = -(scrolled * speed);
            element.style.transform = `translateY(${yPos}px)`;
        });
    });
}

// Export functions
window.initializeAnimations = initializeAnimations;
window.triggerConfetti = triggerConfetti;
window.animateProgressBar = animateProgressBar;
window.animateNumber = animateNumber;
window.pageTransition = pageTransition;
window.showSkeleton = showSkeleton;
window.showSuccessCheckmark = showSuccessCheckmark;
window.typeWriter = typeWriter;
window.initParallax = initParallax;

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    initializeAnimations();
    initParallax();
});

// Add ripple styles
const style = document.createElement('style');
style.textContent = `
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.5);
        transform: scale(0);
        animation: ripple-animation 0.6s ease-out;
        pointer-events: none;
    }
    
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    .btn {
        position: relative;
        overflow: hidden;
    }
    
    .checkmark {
        width: 100px;
        height: 100px;
        border-radius: 50%;
        display: block;
        stroke-width: 2;
        stroke: #28a745;
        stroke-miterlimit: 10;
        margin: 10% auto;
        box-shadow: inset 0px 0px 0px #28a745;
        animation: fill .4s ease-in-out .4s forwards, scale .3s ease-in-out .9s both;
    }
    
    .checkmark-circle {
        stroke-dasharray: 166;
        stroke-dashoffset: 166;
        stroke-width: 2;
        stroke-miterlimit: 10;
        stroke: #28a745;
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
            box-shadow: inset 0px 0px 0px 30px #28a745;
        }
    }
`;
document.head.appendChild(style);