const params = new URLSearchParams(window.location.search);
const filePath = params.get('file');
let currentPageIndex = 0;

// Загружаем информацию о книге
fetch(`/admin/book/${filePath}?admin=${true}`)
    .then(response => response.json())
    .then(data => {
        document.getElementById('book-title').textContent = data.title;
        document.getElementById('book-author').textContent = data.author_name;
        document.getElementById('book-genre').textContent = data.genre_name;
        document.getElementById('book-publisher').textContent = data.publisher_name;
        document.getElementById('book-year').textContent = data.publication_year;
        document.getElementById('book-uploaded-by').textContent = data.uploaded_by || "Неизвестно";
        document.getElementById('book-file-path').textContent = data.file_path;
        document.getElementById('book-cover').src = `/uploads/${data.image_path}`;

        const fileExtension = data.file_path.split('.').pop().toLowerCase();

        if (fileExtension === 'txt') {
            fetch(`/uploads/${data.file_path}`)
                .then(response => response.text())
                .then(content => {
                    displayTextContent(content);
                })
                .catch(error => {
                    console.error('Ошибка при загрузке содержимого книги:', error);
                });
        } else if (fileExtension === 'pdf') {
            loadPdfContent(`/uploads/${data.file_path}`);
        }
    })
    .catch(error => {
        console.error('Ошибка при загрузке информации о книге:', error);
    });

function displayTextContent(content) {
    const pages = splitTextIntoPages(content, 4000);
    const contentContainer = document.getElementById('txt-content');
    contentContainer.innerHTML = '';

    pages.forEach((page, index) => {
        const pageDiv = document.createElement('div');
        pageDiv.classList.add('page');
        pageDiv.innerHTML = `<pre>${page}</pre>`;
        contentContainer.appendChild(pageDiv);
    });

    showPage(currentPageIndex);
}

function showPage(pageIndex) {
    if (pageIndex < 0 || pageIndex >= pages.length) return;

    const pageDivs = contentContainer.querySelectorAll('.page');
    pageDivs.forEach((pageDiv, index) => {
        pageDiv.style.display = (index === pageIndex) ? 'block' : 'none';
    });
    currentPageIndex = pageIndex;

    updatePageNumber(currentPageIndex, pages.length);
}

function updatePageNumber(currentPageIndex, totalPages) {
    const pageInput = document.getElementById('page-input');
    const totalPagesContainer = document.getElementById('total-pages');

    pageInput.value = currentPageIndex + 1;
    totalPagesContainer.textContent = totalPages;
}

// Функция для перехода на страницу по вводу номера
function goToPage() {
    const pageInput = document.getElementById('page-input');
    const pageIndex = parseInt(pageInput.value) - 1;

    if (isNaN(pageIndex) || pageIndex < 0) return;

    showPage(pageIndex);
}

function showPage(pageIndex) {
    const contentContainer = document.getElementById('txt-content');
    const pageDivs = contentContainer.querySelectorAll('.page');
    if (pageIndex < 0 || pageIndex >= pageDivs.length) return;

    pageDivs.forEach((pageDiv, index) => {
        pageDiv.style.display = (index === pageIndex) ? 'block' : 'none';
    });

    currentPageIndex = pageIndex;
    updatePageNumber(currentPageIndex, pageDivs.length);
}

// Функция для разбиения текста на страницы
function splitTextIntoPages(text, pageSize) {
    const pages = [];
    let currentPage = '';
    let currentPageSize = 0;

    const words = text.split(' ');
    words.forEach(word => {
        if (currentPageSize + word.length + 1 <= pageSize) {
            currentPage += word + ' ';
            currentPageSize += word.length + 1;
        } else {
            pages.push(currentPage);
            currentPage = word + ' ';
            currentPageSize = word.length + 1;
        }
    });

    if (currentPage) {
        pages.push(currentPage);
    }

    return pages;
}

// Функция для загрузки и отображения PDF
function loadPdfContent(pdfUrl) {
    const pdfContentContainer = document.getElementById('pdf-content');
    pdfContentContainer.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.min.js';
    script.onload = () => {
        fetch(pdfUrl)
            .then(response => response.arrayBuffer())
            .then(data => {
                const loadingTask = pdfjsLib.getDocument(data);
                loadingTask.promise.then(pdf => {
                    const totalPages = pdf.numPages;
                    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
                        pdf.getPage(pageNum).then(page => {
                            const canvas = document.createElement('canvas');
                            const context = canvas.getContext('2d');
                            const scale = 1.5;
                            const viewport = page.getViewport({ scale: scale });

                            canvas.height = viewport.height;
                            canvas.width = viewport.width;

                            page.render({ canvasContext: context, viewport: viewport }).promise.then(() => {
                                pdfContentContainer.appendChild(canvas);
                            });
                        });
                    }
                });
            })
            .catch(error => console.error('Ошибка при загрузке PDF:', error));
    };
    document.body.appendChild(script);
}
