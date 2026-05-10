// ========== GoldFX Main Script ==========

document.addEventListener('DOMContentLoaded', function() {

    // ========== Tooltip ها ==========
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // ========== Popover ها ==========
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });

    // ========== Smooth Scroll ==========
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // ========== Auto Hide Alerts ==========
    setTimeout(function() {
        const alerts = document.querySelectorAll('.alert:not(.alert-warning.fw-bold)');
        alerts.forEach(alert => {
            alert.style.transition = 'opacity 0.5s';
            alert.style.opacity = '0';
            setTimeout(() => alert.remove(), 500);
        });
    }, 5000);

    // ========== Number Animation ==========
    function animateNumbers() {
        document.querySelectorAll('.animate-number').forEach(el => {
            const finalValue = parseFloat(el.getAttribute('data-value'));
            const duration = 2000;
            const start = performance.now();
            
            function update(currentTime) {
                const elapsed = currentTime - start;
                const progress = Math.min(elapsed / duration, 1);
                const current = finalValue * progress;
                el.textContent = current.toFixed(2).toLocaleString('fa-IR');
                
                if (progress < 1) {
                    requestAnimationFrame(update);
                } else {
                    el.textContent = finalValue.toFixed(2).toLocaleString('fa-IR');
                }
            }
            
            requestAnimationFrame(update);
        });
    }
    animateNumbers();

    // ========== Copy to Clipboard ==========
    window.copyToClipboard = function(text) {
        navigator.clipboard.writeText(text).then(() => {
            Swal.fire({
                icon: 'success',
                title: 'کپی شد!',
                timer: 1500,
                showConfirmButton: false,
                toast: true,
                position: 'top-end'
            });
        });
    };

    // ========== Confirm Before Action ==========
    document.querySelectorAll('.confirm-action').forEach(btn => {
        btn.addEventListener('click', function(e) {
            if (!confirm('آیا از انجام این عملیات اطمینان دارید؟')) {
                e.preventDefault();
            }
        });
    });

    // ========== Password Strength ==========
    const passwordInputs = document.querySelectorAll('input[type="password"][name="password"], input[type="password"][name="newPassword"]');
    passwordInputs.forEach(input => {
        input.addEventListener('input', function() {
            const val = this.value;
            let strength = 0;
            if (val.length >= 6) strength++;
            if (val.length >= 8) strength++;
            if (/[A-Z]/.test(val)) strength++;
            if (/[0-9]/.test(val)) strength++;
            if (/[^A-Za-z0-9]/.test(val)) strength++;
            
            const colors = ['#dc3545', '#fd7e14', '#ffc107', '#198754', '#0d6efd'];
            this.style.borderColor = colors[strength] || '#ffd700';
        });
    });

    // ========== Amount Format ==========
    document.querySelectorAll('input[type="number"]').forEach(input => {
        input.addEventListener('blur', function() {
            if (this.value) {
                this.value = parseFloat(this.value).toFixed(2);
            }
        });
    });

    // ========== Print Page ==========
    window.printPage = function() {
        window.print();
    };

    // ========== Back to Top ==========
    let backToTopBtn = document.createElement('button');
    backToTopBtn.innerHTML = '<i class="bi bi-arrow-up"></i>';
    backToTopBtn.className = 'btn btn-warning btn-sm position-fixed bottom-0 end-0 m-3 rounded-circle d-none';
    backToTopBtn.style.cssText = 'width: 40px; height: 40px; z-index: 9999;';
    backToTopBtn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    document.body.appendChild(backToTopBtn);
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 500) {
            backToTopBtn.classList.remove('d-none');
        } else {
            backToTopBtn.classList.add('d-none');
        }
    });

    // ========== Ripple Effect on Buttons ==========
    document.querySelectorAll('.btn').forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = (e.clientX - rect.left - size/2) + 'px';
            ripple.style.top = (e.clientY - rect.top - size/2) + 'px';
            ripple.style.position = 'absolute';
            ripple.style.borderRadius = '50%';
            ripple.style.background = 'rgba(255,255,255,0.3)';
            ripple.style.transform = 'scale(0)';
            ripple.style.animation = 'rippleEffect 0.6s linear';
            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            this.appendChild(ripple);
            
            setTimeout(() => ripple.remove(), 600);
        });
    });

});

// ========== Ripple Animation Style ==========
const style = document.createElement('style');
style.textContent = `
    @keyframes rippleEffect {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
