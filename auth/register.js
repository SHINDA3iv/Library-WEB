document.getElementById('register-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;

    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        if (response.ok) {
            window.location.href = '../auth/login.html';
        } else {
        }
    } catch (error) {
        console.error('Ошибка при регистрации:', error);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const authToken = localStorage.getItem('authToken');

    if (authToken) {
        try {
            const payload = JSON.parse(atob(authToken.split('.')[1]));
            if (payload.role === 'user') {
                window.location.href = '/';
            }
        } catch (error) {
            console.error('Ошибка при проверке токена:', error);
            localStorage.removeItem('authToken');
        }
    }});