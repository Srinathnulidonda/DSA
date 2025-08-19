// js/animation.js
// Confetti animation
function createConfetti() {
    const colors = ['#0d6efd', '#198754', '#ffc107', '#dc3545', '#0dcaf0'];
    const confettiCount = 150;

    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 3 + 's';
        document.body.appendChild(confetti);

        // Remove confetti after animation
        setTimeout(() => {
            confetti.remove();
        }, 3000);
    }
}

// Achievement animation
function showAchievement(title, message) {
    createConfetti();

    const toast = document.createElement('div');
    toast.className = 'achievement-toast animate-slide-in';
    toast.innerHTML = `
        <div class="achievement-icon">
            <i class="fas fa-trophy"></i>
        </div>
        <div>
            <h6 class="mb-1">${title}</h6>
            <p class="mb-0 text-muted">${message}</p>
        </div>
    `;

    document.body.appendChild(toast);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.add('animate-slide-out');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// Number animation
function animateNumber(element, start, end, duration) {
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
        current += increment;

        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            current = end;
            clearInterval(timer);
        }

        element.textContent = Math.round(current);
    }, 16);
}

// Typing animation
function typeWriter(element, text, speed = 50) {
    let index = 0;
    element.textContent = '';

    function type() {
        if (index < text.length) {
            element.textContent += text.charAt(index);
            index++;
            setTimeout(type, speed);
        }
    }

    type();
}

// Intersection Observer for scroll animations
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fade-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('[data-animate]').forEach(element => {
        observer.observe(element);
    });
}

// Page transition
function pageTransition(url) {
    document.body.classList.add('page-exit-active');

    setTimeout(() => {
        window.location.href = url;
    }, 300);
}

// Loading animation
function showLoading(element) {
    const originalContent = element.innerHTML;
    element.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Loading...';
    element.disabled = true;

    return () => {
        element.innerHTML = originalContent;
        element.disabled = false;
    };
}

// Skeleton loading
function createSkeleton(type = 'text', width = '100%', height = '20px') {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton';
    skeleton.style.width = width;
    skeleton.style.height = height;

    if (type === 'circle') {
        skeleton.style.borderRadius = '50%';
    } else if (type === 'rounded') {
        skeleton.style.borderRadius = '0.375rem';
    }

    return skeleton;
}

// Progress animation
function animateProgress(element, percentage) {
    const progressBar = element.querySelector('.progress-bar');
    progressBar.style.width = '0%';

    setTimeout(() => {
        progressBar.style.width = percentage + '%';
    }, 100);
}

// Initialize animations
document.addEventListener('DOMContentLoaded', function () {
    initScrollAnimations();
});

// Export functions
window.createConfetti = createConfetti;
window.showAchievement = showAchievement;
window.animateNumber = animateNumber;
window.typeWriter = typeWriter;
window.pageTransition = pageTransition;
window.showLoading = showLoading;
window.createSkeleton = createSkeleton;
window.animateProgress = animateProgress;