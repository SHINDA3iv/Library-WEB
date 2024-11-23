document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    const response = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    if (response.ok) {
        const data = await response.json();
        localStorage.setItem('authToken', data.token);

        const currentURL = sessionStorage.getItem('redirectURL') || '/';
        localStorage.removeItem('redirectTo');
        window.location.href = currentURL;
    } else {
        const error = await response.json();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const authToken = localStorage.getItem('authToken');

    if (authToken) {
        try {
            const payload = JSON.parse(atob(authToken.split('.')[1]));
            const currentURL = sessionStorage.getItem('redirectURL') || '/';            

            if (payload.role === 'user' && !currentURL.includes('/admin/admin.html')) {
                window.location.href = '/';
            }
        } catch (error) {
            console.error('Ошибка при проверке токена:', error);
            localStorage.removeItem('authToken');
        }
    }});
