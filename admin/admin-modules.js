// Функция для обработки ошибок
export function consoleError(message) {
    console.error(message);
}

// Функция для проверки доступа администратора
export async function verifyAdminAccess(token) {
    const response = await fetch('/admin/protected', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (response.ok) {
        const data = await response.json();
        return data.user;
    } else {
        throw new Error('Авторизация не удалась');
    }
}

// Функция для обработки ошибки доступа
async function showAccessDeniedMessage() {
    const response = await fetch('./warning.html');
    if (!response.ok) {
        consoleError('Не удалось загрузить шаблон предупреждения');
        return;
    }

    const warningHTML = await response.text();
    document.body.innerHTML = warningHTML;

    const loginButton = document.getElementById('login-button');
    if (loginButton) {
        loginButton.addEventListener('click', () => {
            window.location.href = '../auth/login.html';
        });
    }
}

export function domContentLoaded(document, func = null) {
    document.addEventListener('DOMContentLoaded', () => {
        const redirectURL = window.location.href;
        sessionStorage.setItem('redirectURL', redirectURL);
        
        const authToken = localStorage.getItem('authToken');
        const userNameSpan = document.getElementById('user-name');
        const logoutBtn = document.getElementById('logout-btn');
    
        if (authToken) {
            verifyAdminAccess(authToken)
                .then(user => {
                    userNameSpan.textContent = `Администратор: ${user.username}`;
                    
                    if (typeof func === 'function') {
                        func();
                    }
                    else if (func) {
                        consoleError("Передан некорректный аргумент вместо функции");
                    }
                    else{
                        consoleError("Функция некорректна");
                    }
                })
                .catch(error => {
                    consoleError('Ошибка авторизации: ' + error);
                    handleLogout();
                });
        } else {
            showAccessDeniedMessage();
        }
    
        logoutBtn.addEventListener('click', handleLogout);
    
        function handleLogout() {
            localStorage.removeItem('authToken');
            window.location.reload();
        }
    });
}