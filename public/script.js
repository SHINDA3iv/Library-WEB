const bookGrid = document.getElementById('book-grid');
const pagination = document.getElementById('pagination');
const filterForm = document.getElementById('filter-form');
let currentPage = 1;
limit = 6;

// Функция для загрузки файлов с сервера
function loadFiles(page, title = '', author = '', theme = '', year = '') {
    const url = new URL('http://localhost:5000/books');
    url.searchParams.append('page', page);
    url.searchParams.append('limit', limit);
    if (title) url.searchParams.append('title', title);
    if (author) url.searchParams.append('author', author);
    if (theme) url.searchParams.append('theme', theme);
    if (year) url.searchParams.append('year', year);

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(response.error);
            }
            return response.json();
        })
        .then(data => {
            displayFiles(data.files);
            displayPagination(data.page, data.totalPages);
        })
        .catch(error => {
            console.error('Ошибка при загрузке файлов:', error);
        });
}

const itemsPerPageSelect = document.getElementById('items-per-page');
itemsPerPageSelect.addEventListener('change', () => {
    limit = parseInt(itemsPerPageSelect.value, 10);
    currentPage = 1;
    loadFiles(currentPage, 
               document.getElementById('title').value, 
               document.getElementById('author').value, 
               document.getElementById('theme').value, 
               document.getElementById('year').value);
});

// Отображение файлов на странице
function displayFiles(files) {
    bookGrid.innerHTML = '';
    if (files.length === 0) {
        bookGrid.innerHTML = '<p>Нет доступных файлов.</p>';
        return;
    }
    files.forEach(file => {
        const bookCard = document.createElement('div');
        bookCard.classList.add('book-card');
        
        const bookLink = document.createElement('a');
        bookLink.href = `book.html?id=${file.book_id}`;
        bookLink.classList.add('book-card-link');
        bookLink.target = '_blank'; 
        
        bookLink.innerHTML = `
            <img src="/uploads/${file.image_path}" alt="${file.title}">
            <h3>${file.title}</h3>
            <p>${file.author_name}</p>
            <a href="/download/${file.file_path}" class="download-link">Скачать</a>
        `;
        
        bookCard.appendChild(bookLink);
        bookGrid.appendChild(bookCard);
    });
}

// Отображение кнопок пагинации
function displayPagination(page, totalPages) {
    pagination.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        const pageLink = document.createElement('button');
        pageLink.textContent = i;
        if (i === page) {
            pageLink.style.backgroundColor = '#0056b3';
        }
        pageLink.addEventListener('click', () => {
            currentPage = i;
            loadFiles(currentPage, document.getElementById('title').value, document.getElementById('author').value, document.getElementById('theme').value, document.getElementById('year').value, limit);
        });
        pagination.appendChild(pageLink);
    }
}

const toggleFilterBtn = document.getElementById('toggle-filter');
const filterContainer = document.getElementById('filter-container');

// Логика для скрытия/показа фильтра
toggleFilterBtn.addEventListener('click', () => {
    if (filterContainer.classList.contains('active')) {
        filterContainer.classList.remove('active');
        toggleFilterBtn.textContent = 'Показать фильтры';
    } else {
        filterContainer.classList.add('active');
        toggleFilterBtn.textContent = 'Скрыть фильтры';
    }
});

// Обработка формы фильтра
filterForm.addEventListener('submit', (event) => {
    event.preventDefault();
    currentPage = 1;
    const title = document.getElementById('title').value;
    const author = document.getElementById('author').value;
    const theme = document.getElementById('theme').value;
    const year = document.getElementById('year').value;
    loadFiles(currentPage, title, author, theme, year);
});

document.addEventListener('DOMContentLoaded', () => {
    const redirectURL = window.location.href;
    sessionStorage.setItem('redirectURL', redirectURL);
    
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const userNameSpan = document.getElementById('user-name');
    const logoutBtn = document.getElementById('logout-btn');

    const authToken = localStorage.getItem('authToken');
    if (authToken) {
        try {
            const payload = JSON.parse(atob(authToken.split('.')[1])); 
            const currentTime = Math.floor(Date.now() / 1000);

            if (payload.exp < currentTime) {
                handleLogout();
            } else {
                userNameSpan.textContent = `Пользователь: ${payload.username}`; 
                loginBtn.style.display = 'none';
                registerBtn.style.display = 'none';
                userNameSpan.style.display = 'inline';
                logoutBtn.style.display = 'inline';
            }
        } catch (error) {
            console.error('Ошибка при расшифровке токена:', error);
            handleLogout();
        }
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
});

loadFiles(currentPage);