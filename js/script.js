const navLinks = document.querySelectorAll('.nav li a');
const sections = document.querySelectorAll('.section');
const aside = document.querySelector('.aside');
const navToggler = document.getElementById('nav-toggler');
const navOverlay = document.getElementById('nav-overlay');

function openNav() {
    aside.classList.add('open');
    if (window.innerWidth < 1200) navOverlay.classList.add('active');
}

function closeNav() {
    aside.classList.remove('open');
    navOverlay.classList.remove('active');
}

navToggler.addEventListener('click', () => {
    aside.classList.contains('open') ? closeNav() : openNav();
});

navOverlay.addEventListener('click', closeNav);

const sectionClasses = ['home', 'about', 'skills', 'projects', 'achievements', 'contact'];

navLinks.forEach((link, index) => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        const target = document.querySelector('.' + sectionClasses[index]);
        if (!target) return;
        const offset = window.innerWidth < 1200 ? 55 : 0;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
        closeNav();
    });
});

// Hire Me button → navigate to Contact section
document.querySelector('.hire-me').addEventListener('click', (e) => {
    e.preventDefault();
    navLinks.forEach(l => l.classList.remove('active'));
    navLinks[5].classList.add('active');
    closeNav();
    const target = document.querySelector('.contact');
    const offset = window.innerWidth < 1200 ? 55 : 0;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
});

// EmailJS
emailjs.init('cYe5ss-oo4adWD9u8');

document.getElementById('contact-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const btn = this.querySelector('button[type="submit"]');
    btn.textContent = 'Sending...';
    btn.disabled = true;

    emailjs.sendForm('service_qx5qtrd', 'template_tg96xss', this)
        .then(() => {
            btn.textContent = 'Sent!';
            this.reset();
            setTimeout(() => {
                btn.textContent = 'Send Mail';
                btn.disabled = false;
            }, 3000);
        })
        .catch(() => {
            btn.textContent = 'Failed. Try again';
            btn.disabled = false;
        });
});

// Typed.js
new Typed('.typing', {
    strings: ['Full Stack Development', 'Machine Learning'],
    typeSpeed: 100,
    backSpeed: 50,
    loop: true
});

const switcher = document.getElementById('style-switcher');
document.getElementById('switcher-toggler').addEventListener('click', () => {
    switcher.classList.toggle('open');
});

function changeSkin(color) {
    document.getElementById('skin-link').href = 'css/skins/' + color + '.css';
    localStorage.setItem('skin', color);
}

// Dark / Light Mode
const dayNight = document.getElementById('day-night');
dayNight.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    const icon = dayNight.querySelector('i');
    if (document.body.classList.contains('dark')) {
        icon.classList.replace('fa-moon', 'fa-sun');
        localStorage.setItem('theme', 'dark');
    } else {
        icon.classList.replace('fa-sun', 'fa-moon');
        localStorage.setItem('theme', 'light');
    }
});

// Mobile fixed buttons
const mobileDayNight = document.getElementById('mobile-day-night');
const mobileSwitcherBtn = document.getElementById('mobile-switcher-btn');

if (mobileDayNight) {
    mobileDayNight.addEventListener('click', () => {
        document.body.classList.toggle('dark');
        const icon = mobileDayNight.querySelector('i');
        if (document.body.classList.contains('dark')) {
            icon.classList.replace('fa-moon', 'fa-sun');
            localStorage.setItem('theme', 'dark');
        } else {
            icon.classList.replace('fa-sun', 'fa-moon');
            localStorage.setItem('theme', 'light');
        }
        const desktopIcon = dayNight.querySelector('i');
        desktopIcon.className = icon.className;
    });
}

if (mobileSwitcherBtn) {
    mobileSwitcherBtn.addEventListener('click', () => {
        switcher.classList.toggle('open');
    });
}

(function() {
    const savedSkin = localStorage.getItem('skin');
    if (savedSkin) changeSkin(savedSkin);

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme !== 'light') {
        document.body.classList.add('dark');
        dayNight.querySelector('i').classList.replace('fa-moon', 'fa-sun');
        if (mobileDayNight) mobileDayNight.querySelector('i').classList.replace('fa-moon', 'fa-sun');
    }
})();
