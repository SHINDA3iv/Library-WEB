document.addEventListener('DOMContentLoaded', () => {
    const redirectURL = window.location.href;
    sessionStorage.setItem('redirectURL', redirectURL);
    
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const userNameSpan = document.getElementById('user-name');
    const logoutBtn = document.getElementById('logout-btn');

    // Проверка наличия токена в localStorage
    const authToken = localStorage.getItem('authToken');
    if (authToken) {
        // Если токен есть, считаем пользователя авторизованным
        const user = JSON.parse(atob(authToken.split('.')[1])); // Расшифровываем токен для получения имени пользователя
        userNameSpan.textContent = `Пользователь: ${user.username}`; // Отображаем имя пользователя
        loginBtn.style.display = 'none'; // Скрываем кнопку "Вход"
        registerBtn.style.display = 'none'; // Скрываем кнопку "Регистрация"
        userNameSpan.style.display = 'inline'; // Показываем имя пользователя
        logoutBtn.style.display = 'inline'; // Показываем кнопку "Выйти"
    }
    else {
        loginBtn.style.display = 'inline'; // Скрываем кнопку "Вход"
        registerBtn.style.display = 'inline'; // Скрываем кнопку "Регистрация"
        userNameSpan.style.display = 'none'; // Показываем имя пользователя
        logoutBtn.style.display = 'none'; // Показываем кнопку "Выйти"
    }

    // Логика для кнопки выхода
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('authToken'); // Удаляем токен
        window.location.reload(); // Перезагружаем страницу для обновления состояния
    });
});