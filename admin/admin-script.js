import { verifyAdminAccess, domContentLoaded, consoleError } from './admin-modules.js';

const fileTable = document.getElementById('file-table').getElementsByTagName('tbody')[0];
const uploadForm = document.getElementById('upload-form');
const rankingTable = document.getElementById('ranking-table').getElementsByTagName('tbody')[0];
const pagination = document.getElementById('file-pagination');
let currentPage = 1;
let limit = 10;

const rankingPagination = document.getElementById('ranking-pagination');
let rankingCurrentPage = 1;
let rankingLimit = parseInt(document.getElementById('ranking-items-per-page').value, 10);

const logPagination = document.getElementById('log-pagination');
let logCurrentPage = 1;
let logLimit = 20;

// Общая функция для создания пагинации
function createPagination(paginationElement, currentPage, totalPages, onPageClick) {
    paginationElement.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        const pageLink = document.createElement('button');
        pageLink.textContent = i;
        if (i === currentPage) {
            pageLink.style.backgroundColor = '#0056b3';
            pageLink.style.color = 'white';
        }
        pageLink.addEventListener('click', () => onPageClick(i));
        paginationElement.appendChild(pageLink);
    }
}

// Универсальная функция для загрузки данных с API
function loadData(url, params, onSuccess, onError) {
    const apiUrl = new URL(url, window.location.origin);
    Object.keys(params).forEach(key => apiUrl.searchParams.append(key, params[key]));

    fetch(apiUrl)
        .then(response => response.json())
        .then(onSuccess)
        .catch(onError);
}

// Функция для загрузки файлов
function loadFiles(page) {
    loadData('/admin/files', { page, limit }, (data) => {
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
            titleCell.addEventListener('click', () => window.open(titleLink.href, '_blank'));

            const deleteButton = document.createElement('button');
            const icon = document.createElement('img');
            icon.src = '/admin/trash.png'; 
            icon.alt = 'Удалить';
            deleteButton.appendChild(icon);
            deleteButton.addEventListener('click', (event) => {
                event.stopPropagation();
                deleteFile(file.file_path);
            });

            titleCell.appendChild(deleteButton);
        });
        createPagination(pagination, data.page, data.totalPages, loadFiles);
    }, (error) => {
        consoleError('Ошибка при загрузке файлов для администрирования: ' + error);
    });
}

// Функция для удаления файла
async function deleteFile(filename) {
    let userId = null; 
    const authToken = localStorage.getItem('authToken');
    if (authToken) {
        const user = await verifyAdminAccess(authToken);
        userId = user.userId;
    }

    await fetch(`/admin/files/${filename}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
    })
    .then(response => {
        if (response.ok) {
            loadFiles(currentPage);
            loadDownloadRanking(rankingCurrentPage);
            loadLogs(logCurrentPage);
        } else {
            return response.json().then(data => { throw new Error(data.error); });
        }
    })
    .catch(error => {
        consoleError('Ошибка при удалении файла: ' + error);
    });
}

// Функция для добавления файла
uploadForm.addEventListener('submit', async event => {
    event.preventDefault();

    let userId = null;
    const authToken = localStorage.getItem('authToken');
    if (authToken) {
        try {
            const user = await verifyAdminAccess(authToken);
            userId = user.userId;
        } catch (error) {
            consoleError('Ошибка проверки токена: ' + error);
            return;
        }
    }

    const formData = new FormData(uploadForm);
    formData.append('uploaded_by', userId);

    fetch('/admin/upload', { method: 'POST', body: formData })
        .then(response => {
            if (response.ok) {
                loadFiles(currentPage);
                loadDownloadRanking(rankingCurrentPage);
                loadLogs(logCurrentPage);
                uploadForm.reset();
            } else {
                return response.json().then(data => { throw new Error(data.error); });
            }
        })
        .catch(error => {
            consoleError('Ошибка при добавлении файла: ' + error);
        });
});

// Функция для загрузки рейтинга скачиваний
function loadDownloadRanking(page) {
    loadData('/admin/downloads', { page, limit: rankingLimit }, (data) => {
        rankingTable.innerHTML = '';
        data.ranking.forEach(entry => {
            const row = rankingTable.insertRow();
            row.insertCell().textContent = entry.title;
            row.insertCell().textContent = entry.download_count;
        });
        createPagination(rankingPagination, data.page, data.totalPages, loadDownloadRanking);
    }, (error) => {
        consoleError('Ошибка при загрузке рейтинга скачиваний: ' + error);
    });
}

// Функция для загрузки логов
async function loadLogs(page) {
    loadData('/admin/logs', { page, limit: logLimit }, (data) => {
        const logTableBody = document.querySelector('#log-table tbody');
        logTableBody.innerHTML = '';

        data.logs.forEach(log => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${log.timestamp}</td>
                <td>${log.action}</td>
                <td>${log.user}</td>
            `;
            logTableBody.appendChild(row);
        });

        createPagination(logPagination, data.page, data.totalPages, loadLogs);
    }, (error) => {
        consoleError('Ошибка при загрузке логов: ' + error);
    });
}

// Обработчик изменения количества элементов на странице файлов
document.getElementById('file-items-per-page').addEventListener('change', () => {
    limit = parseInt(document.getElementById('file-items-per-page').value, 10);
    currentPage = 1;
    loadFiles(currentPage);
});

// Обработчик изменения количества элементов на странице рейтинга
document.getElementById('ranking-items-per-page').addEventListener('change', () => {
    rankingLimit = parseInt(document.getElementById('ranking-items-per-page').value, 10);
    rankingCurrentPage = 1;
    loadDownloadRanking(rankingCurrentPage);
});

// Обработчик изменения количества элементов на странице логов
document.getElementById('log-items-per-page').addEventListener('change', () => {
    logLimit = parseInt(document.getElementById('log-items-per-page').value, 10);
    logCurrentPage = 1;
    loadLogs(logCurrentPage);
});

// Функция для открытия вкладок
export function openTab(tabName) {
    const tabContents = document.querySelectorAll('.tab-content');
    const tabButtons = document.querySelectorAll('.tab-button');

    tabContents.forEach(tab => tab.classList.remove('active'));
    tabButtons.forEach(button => button.classList.remove('active'));

    document.getElementById(tabName).classList.add('active');
    document.querySelector(`.tab-button[onclick="openTab('${tabName}')"]`).classList.add('active');
}

document.getElementById('export-logs-btn').addEventListener('click', async () => {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const format = document.getElementById('file-format').value;

    if (!startDate || !endDate) {
        consoleError('Необходимо указать начальную и конечную дату');
        return;
    }

    try {
        const authToken = localStorage.getItem('authToken');
        const response = await fetch(`/admin/logs/export?start=${startDate}&end=${endDate}&format=${format}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
            }
        });

        if (!response.ok) {
            throw new Error(`Ошибка экспорта: ${response.statusText}`);
        }

        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `logs_${startDate}_${endDate}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        consoleError('Ошибка при скачивании логов: ' + error.message);
    }
});


function makeDates() {
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');

    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    startDateInput.value = firstDay.toISOString().split('T')[0];
    endDateInput.value = lastDay.toISOString().split('T')[0];
}

domContentLoaded(document, () => {
    loadFiles(currentPage);
    loadDownloadRanking(rankingCurrentPage);
    loadLogs(logCurrentPage);
    makeDates();
});

window.openTab = openTab;