import { verifyTokenAccess, domContentLoaded, consoleError } from './modules.js';

// Получение параметров из URL
const params = new URLSearchParams(window.location.search);
const bookId = params.get('id');

const bookCover = document.getElementById('book-cover');

// Функция для загрузки данных книги
async function loadBookDetails(id) {
    let userId = null; 
    const authToken = localStorage.getItem('authToken');
    if (authToken) {
        const user = await verifyTokenAccess(authToken);
        userId = user.userId;
    }
    try {
        const response = await fetch(`/book/${id}`, {
            method: 'GET',
            headers: {
                'User-Id': userId
            }
        });

        if (!response.ok) {
            throw new Error('Книга не найдена');
        }

        const book = await response.json();
        document.getElementById('book-title').textContent = book.title;
        document.getElementById('book-cover').src = `/uploads/${book.image_path}`;
        document.getElementById('book-author').textContent = book.author_name;
        document.getElementById('book-genre').textContent = book.genre_name;
        document.getElementById('book-publisher').textContent = book.publisher_name;
        document.getElementById('book-year').textContent = book.publication_year;
        document.getElementById('book-download').href = `/download/${book.file_path}?userId=${userId}`;
    } catch (error) {
        consoleError('Ошибка при загрузке данных книги: ' + error);
    }
}

domContentLoaded(document, () => { loadBookDetails(bookId); });