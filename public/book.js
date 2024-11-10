// Получение параметров из URL
const params = new URLSearchParams(window.location.search);
const bookId = params.get('id');

// Функция для загрузки данных книги
function loadBookDetails(id) {
    fetch(`/book/${id}`)
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
            document.getElementById('book-download').href = `/download/${book.file_path}`;
        })
        .catch(error => {
            console.error('Ошибка при загрузке данных книги:', error);
        });
}

// Загружаем информацию о книге при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    loadBookDetails(bookId);
});
