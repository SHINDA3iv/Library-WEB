const fileTable = document.getElementById('file-table').getElementsByTagName('tbody')[0];
const uploadForm = document.getElementById('upload-form');
const rankingTable = document.getElementById('ranking-table').getElementsByTagName('tbody')[0];
const pagination = document.getElementById('file-pagination');
let currentPage = 1;
limit = 10;

const rankingPagination = document.getElementById('ranking-pagination');
let rankingCurrentPage = 1;
let rankingLimit = parseInt(document.getElementById('ranking-items-per-page').value, 10);

// Функция для загрузки списка файлов
function loadFiles(page) {
    const url = new URL('http://localhost:5000/admin/files');
    url.searchParams.append('page', page);
    url.searchParams.append('limit', limit);
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (!Array.isArray(data.files)) {
                throw new TypeError('Файлы не являются массивом');
            }
            fileTable.innerHTML = '';
            data.files.forEach(file => {

                
                const row = fileTable.insertRow();
                const titleCell = row.insertCell();
                
                const titleLink = document.createElement('a');
                titleLink.textContent = file.title;
                titleLink.href = '/admin/admin-book.html?file=' + encodeURIComponent(file.file_path);
                titleLink.target = '_blank';

                titleCell.appendChild(titleLink);
                titleCell.style.cursor = 'pointer';

                titleCell.addEventListener('click', () => {
                    window.open(titleLink.href, '_blank');
                });

                const deleteButton = document.createElement('button');
                const icon = document.createElement('img');
                icon.src = '/admin/trash.png'; 
                icon.alt = 'Удалить';
                deleteButton.appendChild(icon);
                deleteButton.addEventListener('click', () => deleteFile(file.file_path));

                titleCell.appendChild(deleteButton);
            });

            displayFilePagination(data.page, data.totalPages);
        })
        .catch(error => {
            console.error('Ошибка при загрузке файлов для администрирования:', error);
        });
}

const fileItemsPerPageSelect = document.getElementById('file-items-per-page');
fileItemsPerPageSelect.addEventListener('change', () => {
    limit = parseInt(fileItemsPerPageSelect.value, 10);
    currentPage = 1;
    loadFiles(currentPage);
});

// Функция для отображения пагинации
function displayFilePagination(currentPage, totalPages) {
    pagination.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        const pageLink = document.createElement('button');
        pageLink.textContent = i;
        if (i === currentPage) {
            pageLink.style.backgroundColor = '#0056b3';
            pageLink.style.color = 'white';
        }
        pageLink.addEventListener('click', () => {
            loadFiles(i);
        });
        pagination.appendChild(pageLink);
    }
}

// Функция для удаления файла
function deleteFile(filename) {
    fetch(`/admin/files/${filename}`, {
        method: 'DELETE'
    })
    .then(response => {
        if (response.ok) {
            loadFiles(currentPage);
        } else {
            return response.json().then(data => { throw new Error(data.error); });
        }
    })
    .catch(error => {
        console.error('Ошибка при удалении файла:', error);
    });
}

// Функция для добавления файла
uploadForm.addEventListener('submit', event => {
    event.preventDefault();
    const formData = new FormData(uploadForm);

    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (response.ok) {
            loadFiles(currentPage);
            uploadForm.reset();
        } else {
            return response.json().then(data => { throw new Error(data.error); });
        }
    })
    .catch(error => {
        console.error('Ошибка при добавлении файла:', error);
    });
});

document.getElementById('ranking-items-per-page').addEventListener('change', () => {
    rankingLimit = parseInt(document.getElementById('ranking-items-per-page').value, 10);
    rankingCurrentPage = 1;
    loadDownloadRanking(rankingCurrentPage);
});

function loadDownloadRanking(page) {
    const url = new URL('/admin/downloads', window.location.origin);
    url.searchParams.append('page', page);
    url.searchParams.append('limit', rankingLimit);

    fetch(url)
        .then(response => response.json())
        .then(data => {
            rankingTable.innerHTML = '';
            data.ranking.forEach(entry => {
                const row = rankingTable.insertRow();
                row.insertCell().textContent = entry.title;
                row.insertCell().textContent = entry.download_count;
            });
            displayRankingPagination(data.page, data.totalPages);
        })
        .catch(error => {
            console.error('Ошибка при загрузке рейтинга скачиваний:', error);
        });
}

function displayRankingPagination(currentPage, totalPages) {
    rankingPagination.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        const pageLink = document.createElement('button');
        pageLink.textContent = i;
        if (i === currentPage) {
            pageLink.style.backgroundColor = '#0056b3';
            pageLink.style.color = 'white';
        }
        pageLink.addEventListener('click', () => loadDownloadRanking(i));
        rankingPagination.appendChild(pageLink);
    }
}

function openTab(tabName) {
    const tabContents = document.querySelectorAll('.tab-content');
    const tabButtons = document.querySelectorAll('.tab-button');

    tabContents.forEach(tab => {
        tab.classList.remove('active');
    });

    tabButtons.forEach(button => {
        button.classList.remove('active');
    });

    document.getElementById(tabName).classList.add('active');
    document.querySelector(`.tab-button[onclick="openTab('${tabName}')"]`).classList.add('active');
}

document.addEventListener('DOMContentLoaded', () => {
    const redirectURL = window.location.href;
    sessionStorage.setItem('redirectURL', redirectURL);
    
    const authToken = localStorage.getItem('authToken');
    const userNameSpan = document.getElementById('user-name');
    const logoutBtn = document.getElementById('logout-btn');

    if (authToken) {
        try {
            const payload = JSON.parse(atob(authToken.split('.')[1]));
            const currentTime = Math.floor(Date.now() / 1000);
            
            if (payload.exp < currentTime) {
                handleLogout();
            } else if (payload.role === 'admin') {
                userNameSpan.textContent = `Администратор: ${payload.username}`;

                loadFiles(currentPage);
                loadDownloadRanking(rankingCurrentPage);
            } else {
                showAccessDeniedMessage();
            }
        } catch (error) {
            console.error('Ошибка при проверке токена:', error);
            handleLogout();
        }
    } else {
        showAccessDeniedMessage();
    }

    logoutBtn.addEventListener('click', handleLogout);

    function handleLogout() {
        localStorage.removeItem('authToken');
        window.location.reload();
    }

    function showAccessDeniedMessage() {
        const authWarning = document.createElement('div');
        authWarning.textContent = 'Доступ запрещен. Пожалуйста, войдите с учетной записью администратора.';
        authWarning.className = 'warning';
        document.body.innerHTML = '';
        document.body.appendChild(authWarning);

        const loginButton = document.createElement('button');
        loginButton.textContent = 'Перейти к авторизации';
        loginButton.className = 'auth-button';
        loginButton.addEventListener('click', () => {
            window.location.href = '../auth/login.html';
        });
        document.body.appendChild(loginButton);
    }
});
