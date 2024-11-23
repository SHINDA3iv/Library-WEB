import { verifyTokenAccess, domContentLoaded, consoleError } from './modules.js';

// Получение параметров из URL
const params = new URLSearchParams(window.location.search);
const bookId = params.get('id');

// Функция для загрузки данных книги
function loadBookDetails(id) {
    let userId = null; 
    const authToken = localStorage.getItem('authToken');

    if (authToken) {
        verifyTokenAccess(authToken).then(user => {
            userId = user.userId;
        });
    }
    console.log(userId);
    fetch(`/book/${id}`, {
        method: 'GET',
        headers: {
            'User-Id': userId
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Книга не найдена');
            }
            return response.json();
        })
        .then(book => {
            document.getElementById('book-title').textContent = book.title;
            document.getElementById('book-cover').src = `/uploads/${book.image_path}`;
            document.getElementById('book-author').textContent = book.author_name;
            document.getElementById('book-genre').textContent = book.genre_name;
            document.getElementById('book-publisher').textContent = book.publisher_name;
            document.getElementById('book-year').textContent = book.publication_year;
            document.getElementById('book-download').onclick = (event) => {
                // Добавляем userId в заголовок запроса на сервер
                fetch(`/download/${book.file_path}`, {
                    method: 'GET',
                    headers: { 'User-Id': userId }
                })
                .then(response => {
                    if (response.ok) {
                        // Если нужно сделать что-то после скачивания
                        console.log('Файл скачан');
                    } else {
                        throw new Error('Ошибка при скачивании файла');
                    }
                })
                .catch(error => consoleError('Ошибка при скачивании: ' + error));
            };
        })
        .catch(error => {
            consoleError('Ошибка при загрузке данных книги: ' +    error);
        });
}

domContentLoaded(document, loadBookDetails(bookId));