// Функция для обработки ошибок
export function consoleError(message) {
    console.error(message);
}

// Функция для проверки доступа администратора
export async function verifyTokenAccess(token) {
    const response = await fetch('/protected', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })

    if (response.ok) {
        const data = await response.json();
        return data.user;
    } else {
        throw new Error('Авторизация не удалась');
    }
}

export function domContentLoaded(document, func) {
    document.addEventListener('DOMContentLoaded', () => {
        const redirectURL = window.location.href;
        sessionStorage.setItem('redirectURL', redirectURL);
        
        const loginBtn = document.getElementById('login-btn');
        const registerBtn = document.getElementById('register-btn');
        const userNameSpan = document.getElementById('user-name');
        const logoutBtn = document.getElementById('logout-btn');
    
        const authToken = localStorage.getItem('authToken');
        if (authToken) {
            verifyTokenAccess(authToken).then(user => {
                userNameSpan.textContent = `Пользователь: ${user.username}`;
                loginBtn.style.display = 'none';
                registerBtn.style.display = 'none';
                userNameSpan.style.display = 'inline';
                logoutBtn.style.display = 'inline';
            })
            .catch(error => {
                consoleError('Ошибка авторизации: ' + error);
                handleLogout();
            });
        } else {
            loginBtn.style.display = 'inline';
            registerBtn.style.display = 'inline';
            userNameSpan.style.display = 'none';
            logoutBtn.style.display = 'none';
        }
    
        logoutBtn.addEventListener('click', handleLogout);
    
        function handleLogout() {
            localStorage.removeItem('authToken');
            window.location.reload();
        }
    
        if (typeof func === 'function') {
            func();
        }
    });
}