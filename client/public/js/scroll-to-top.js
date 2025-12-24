document.addEventListener('DOMContentLoaded', function () {
    // Create button element
    const btn = document.createElement('button');
    btn.id = 'scrollToTopBtn';
    btn.title = 'Lên đầu trang';
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';

    document.body.appendChild(btn);

    // Show/Hide button logic
    const toggleVisibility = () => {
        if (window.scrollY > 300) {
            btn.classList.add('show');
        } else {
            btn.classList.remove('show');
        }
    };

    window.addEventListener('scroll', toggleVisibility);

    // Scroll to top logic
    btn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
});
