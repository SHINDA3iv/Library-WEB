const express = require('express');
const multer = require('multer');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 5000;
require('dotenv').config();

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.SECRET_KEY || 'your_secret_key';

// Настройка подключения к базе данных
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT,
    password: process.env.DB_PASSWORD
});

// Функция для выполнения запросов к базе данных
const queryDatabase = async (text, values) => {
    try {
        const result = await pool.query(text, values);
        return result.rows;
    } catch (error) {
        throw new Error('Ошибка при работе с базой данных: ' + error.message);
    }
};

// Функция для добавления или получения сущности (автор, жанр, издатель)
const addOrGetEntity = async (table, idColumn, nameColumn, name) => {
    const query = `SELECT ${idColumn} FROM ${table} WHERE ${nameColumn} = $1`;
    const result = await queryDatabase(query, [name]);

    if (result.length > 0) {
        return result[0][idColumn];
    }

    const insertQuery = `INSERT INTO ${table} (${nameColumn}) VALUES ($1) RETURNING ${idColumn}`;
    const insertResult = await queryDatabase(insertQuery, [name]);
    return insertResult[0][idColumn];
};

// Функция для обработки ошибок
const handleError = (res, error, message = 'Ошибка сервера') => {
    console.error(error);
    res.status(500).json({ error: message, details: error.message });
};

// Настройка multer для обработки загрузки файлов
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

// Настройка multer для обработки загрузки файлов
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // Ограничение на размер файла — 10 МБ
});

// Публичные файлы
app.use(express.static('public'));
// Административные файлы
app.use('/admin', express.static(path.join(__dirname, 'admin')));
//Аутентификация
app.use('/auth', express.static(path.join(__dirname, 'auth')));
//Файлы
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(express.json());
app.use(express.urlencoded({ extended: true })); 

const logAction = async (user_id, action) => {
    let userDisplayName = "Гость"; 
    
    if (user_id && user_id !== "null") {
        const query = 'SELECT username FROM users WHERE user_id = $1';
        try {
            const result = await queryDatabase(query, [user_id]);
            if (result.length > 0) {
                userDisplayName = `${result[0].username} : ID ${user_id}`;
            }
        } catch (error) {
            console.error('Ошибка при запросе к базе данных для получения username:', error);
        }
    }

    const logEntry = {
        user: userDisplayName,
        action,
        timestamp: new Date().toLocaleString('ru-RU', {
            timeZone: 'Asia/Tomsk',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        }),
    };

    const logFilePath = path.join(__dirname, 'logs', 'user-actions.json');
    if (!fs.existsSync(path.dirname(logFilePath))) {
        fs.mkdirSync(path.dirname(logFilePath), { recursive: true });
    }

    fs.readFile(logFilePath, 'utf8', (err, data) => {
        let logs = [];
        if (!err && data) {
            logs = JSON.parse(data);
        }
        logs.push(logEntry);

        fs.writeFile(logFilePath, JSON.stringify(logs, null, 2), (writeErr) => {
            if (writeErr) {
                console.error('Ошибка записи в лог файл:', writeErr);
            }
        });
    });
};


app.get('/admin/logs/export', async (req, res) => {
    const { start, end, format } = req.query;

    if (!start || !end || !format) {
        return res.status(400).json({ error: 'Укажите начальную и конечную дату, а также формат файла.' });
    }

    const logFilePath = path.join(__dirname, 'logs', 'user-actions.json');

    fs.readFile(logFilePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Ошибка чтения логов.' });
        }

        let logs = [];
        if (data) {
            logs = JSON.parse(data);
        }

        const parseDate = (dateString) => {
            const [date, time] = dateString.split(', ');
            const [day, month, year] = date.split('.');
            return new Date(`${year}-${month}-${day}T${time}.000Z`);
        };

        const filteredLogs = logs.filter(log => {
            const logDate = parseDate(log.timestamp);
            const startDate = new Date(start);
            const endDate = new Date(end);
            return logDate >= startDate && logDate <= endDate;
        });

        let content;
        let mimeType;

        switch (format.toLowerCase()) {
            case 'json':
                content = JSON.stringify(filteredLogs, null, 2);
                mimeType = 'application/json';
                break;
            case 'xml':
                content = `<?xml version="1.0" encoding="UTF-8"?>\n<logs>\n` +
                    filteredLogs.map(log =>
                        `  <log>\n    <timestamp>${log.timestamp}</timestamp>\n    <action>${log.action}</action>\n    <user>${log.user}</user>\n  </log>` 
                    ).join('\n') +
                    `\n</logs>`;
                mimeType = 'application/xml';
                break;
            case 'txt':
                content = filteredLogs.map(log => `[${log.timestamp}] ${log.action} - User: ${log.user}`).join('\n');
                mimeType = 'text/plain';
                break;
            default:
                return res.status(400).json({ error: 'Неподдерживаемый формат файла.' });
        }

        // Отправка файла клиенту
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="logs_${start}_${end}.${format}"`);
        res.send(content);
    });
});

app.get('/admin/logs', async (req, res) => {
    const logFilePath = path.join(__dirname, 'logs', 'user-actions.json');
    
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10; 

    fs.readFile(logFilePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Ошибка при получении логов' });
        }

        let logs = [];
        if (data) {
            logs = JSON.parse(data);
        }

        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;

        const paginatedLogs = logs.slice(startIndex, endIndex);

        const totalPages = Math.ceil(logs.length / limit);

        res.json({
            page,
            totalPages,
            totalLogs: logs.length,
            logs: paginatedLogs,
        });
    });
});

// Пагинация и фильтрация файлов
app.get('/books', async (req, res) => {
    const { page = 1, limit = 5, title = '', author = '', theme = '', year = '' } = req.query;
    const offset = (page - 1) * limit;

    const query = `
        SELECT b.*, a.name AS author_name, g.genre_name
        FROM books b
        JOIN authors a ON b.author_id = a.author_id
        JOIN genres g ON g.genre_id = b.genre_id
        WHERE ($1 = '' OR b.title ILIKE $2)
        AND ($3 = '' OR a.name ILIKE $4)
        AND ($5 = '' OR g.genre_name ILIKE $6)
        AND ($7 = '' OR b.publication_year::text ILIKE $8)
        ORDER BY b.title
        LIMIT $9 OFFSET $10
    `;
    const values = [`%${title}%`, `%${title}%`, `%${author}%`, `%${author}%`, `%${theme}%`, `%${theme}%`, `%${year}%`, `%${year}%`, limit, offset];

    const totalCountQuery = `
        SELECT COUNT(*)
        FROM books b
        JOIN authors a ON b.author_id = a.author_id
        JOIN genres g ON g.genre_id = b.genre_id
        WHERE ($1 = '' OR b.title ILIKE $2)
        AND ($3 = '' OR a.name ILIKE $4)
        AND ($5 = '' OR g.genre_name ILIKE $6)
        AND ($7 = '' OR b.publication_year::text ILIKE $8)
    `;
    const totalCountValues = [`%${title}%`, `%${title}%`, `%${author}%`, `%${author}%`, `%${theme}%`, `%${theme}%`, `%${year}%`, `%${year}%`];

    try {
        const books = await queryDatabase(query, values);
        const totalCountResult = await queryDatabase(totalCountQuery, totalCountValues);

        const totalCount = totalCountResult[0].count;
        const totalPages = Math.ceil(totalCount / limit);

        res.json({
            files: books,
            page: parseInt(page),
            totalPages,
        });
    } catch (error) {
        handleError(res, error, 'Ошибка при получении книг');
    }
});

// Маршрут для получения информации о книге по ID
app.get('/book/:id', async (req, res) => {
    const bookId = req.params.id;
    const userId = req.get('User-Id'); 

    const query = `
        SELECT b.*, a.name AS author_name, g.genre_name, p.publisher_name
        FROM books b
        JOIN authors a ON b.author_id = a.author_id
        JOIN genres g ON b.genre_id = g.genre_id
        JOIN publishers p ON b.publisher_id = p.publisher_id
        WHERE b.book_id = $1
    `;
    const values = [bookId];

    try {
        const result = await queryDatabase(query, values);

        if (result.length === 0) {
            return res.status(404).json({ error: 'Книга не найдена' });
        }

        const bookTitle = result[0].title;

        logAction(userId, `Получена информация о книге ${bookTitle}: ID ${bookId}`);
        res.json(result[0]);
    } catch (error) {
        handleError(res, error, 'Ошибка при получении книги');
    }
});

// Маршрут для скачивания файла
app.get('/download/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(__dirname, 'uploads', filename);
    const userId = req.query.userId;

    try {
        fs.access(filePath, fs.constants.F_OK, async (err) => {
            if (err) {
                return res.status(404).json({ error: 'Файл не найден' });
            }
            
            const result = await queryDatabase(`
                SELECT * FROM file_ratings WHERE book_id = (SELECT book_id FROM books WHERE file_path = $1)
            `, [filename]);
            
            if (result.length === 0) {
                await queryDatabase(`
                    INSERT INTO file_ratings (book_id, download_count)
                    VALUES ((SELECT book_id FROM books WHERE file_path = $1), 1)
                `, [filename]);
            } else {
                await queryDatabase(`
                    UPDATE file_ratings
                    SET download_count = download_count + 1
                    WHERE book_id = (SELECT book_id FROM books WHERE file_path = $1)
                `, [filename]);
            }

            logAction(userId, `Скачан файл: ${filename}`);
            res.download(filePath, err => {
                if (err) {
                    return res.status(500).json({ error: 'Ошибка при скачивании файла' });
                }
            });
        });
    } catch (error) {
        handleError(res, error, 'Ошибка при скачивании файла');
    }
});

// Маршрут для загрузки файлов
app.post('/admin/upload', upload.fields([{ name: 'book_file' }, { name: 'image_file' }]), async (req, res) => {
    try {
        if (!req.files || !req.files['book_file']) {
            return res.status(400).json({ error: 'Файл книги обязателен для загрузки' });
        }

        const bookFile = req.files['book_file'][0];
        const imageFile = req.files['image_file'] ? req.files['image_file'][0] : null;
        const { title, author, genre, publisher, publication_year, uploaded_by } = req.body;

        const authorId = await addOrGetEntity('authors', 'author_id', 'name', author);
        const genreId = await addOrGetEntity('genres', 'genre_id', 'genre_name', genre);
        const publisherId = await addOrGetEntity('publishers', 'publisher_id', 'publisher_name', publisher);

        const insertBookQuery = `
            INSERT INTO books (file_path, image_path, title, author_id, genre_id, publisher_id, publication_year, uploaded_by, uploaded_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING book_id
        `;
        const values = [
            bookFile.filename,
            imageFile ? imageFile.filename : null,
            title,
            authorId,
            genreId,
            publisherId,
            publication_year,
            uploaded_by,
        ];

        const result = await queryDatabase(insertBookQuery, values);
        const bookId = result[0].book_id;

        logAction(uploaded_by, `Загружен файл книги: ${bookFile.filename}, ID книги: ${bookId}`);
        res.status(201).json({ message: 'Файл загружен успешно', book_id: bookId });
    } catch (error) {
        handleError(res, error, 'Ошибка при загрузке файла');
    } 
});

// Административный маршрут для удаления файла и записей скачиваний
app.delete('/admin/files/:filename', async (req, res) => {
    const filename = req.params.filename;
    const userId = req.body.userId;

    try {
        const queryGetBookInfo = {
            text: 'SELECT book_id, image_path, title FROM books WHERE file_path = $1',
            values: [filename],
        };

        const result = await pool.query(queryGetBookInfo);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Книга не найдена' });
        }

        const bookId = result.rows[0].book_id;
        const imagePath = result.rows[0].image_path;
        const title = result.rows[0].title;

        await queryDatabase('DELETE FROM file_ratings WHERE book_id = $1', [bookId]);
        await queryDatabase('DELETE FROM books WHERE file_path = $1', [filename]);

        const filePath = path.join(__dirname, 'uploads', filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        if (imagePath) {
            const imageFilePath = path.join(__dirname, 'uploads', imagePath);
            if (fs.existsSync(imageFilePath)) {
                fs.unlinkSync(imageFilePath);
            }
        }

        logAction(userId, `Удалена книга: ${title}, ID книги: ${bookId}`);
        res.status(204).send();
    } catch (error) {
        handleError(res, error, 'Ошибка при удалении файла');
    }
});

// Маршрут для получения информации о книге по ID
app.get('/admin/book/:filename', async (req, res) => {
    const filePath = req.params.filename;
    const userId = req.query.userId;

    try {
        const query = {
            text: `
                SELECT b.*, a.name AS author_name, g.genre_name, p.publisher_name
                FROM books b
                JOIN authors a ON b.author_id = a.author_id
                JOIN genres g ON b.genre_id = g.genre_id
                JOIN publishers p ON b.publisher_id = p.publisher_id
                WHERE b.file_path = $1
            `,
            values: [filePath],
        };

        const result = await pool.query(query);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Книга не найдена' });
        }
        
        const bookTitle = result[0].title;
        const bookId = result[0].book_id;

        logAction(userId, `Получена информация о книге ${bookTitle}: ID ${bookId}`);
        res.json(result.rows[0]);
    } catch (error) {
        handleError(res, error, 'Ошибка при получении информации о книге');
    }
});

// Административный маршрут для просмотра каталога файлов
app.get('/admin/files', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const offset = (page - 1) * limit;
    try {
        const query = {
            text:`
                SELECT * FROM books
                LIMIT $1 OFFSET $2
            `,
            values: [limit, offset],
        };
        const result = await pool.query(query);
        
        const totalCountQuery = `SELECT COUNT(*) FROM books`;
        const totalCountResult = await pool.query(totalCountQuery);
        const totalCount = totalCountResult.rows[0].count;
        const totalPages = Math.ceil(totalCount / limit);

        res.json({
            files: result.rows,
            page,
            totalPages,
        });
    } catch (error) {
        handleError(res, error, 'Ошибка при получении файлов');
    }
});

// Административный маршрут для получения рейтинга скачиваний
app.get('/admin/downloads', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    try {
        const rankingQuery = {
            text: `
                SELECT b.title, COALESCE(SUM(fr.download_count), 0) AS download_count
                FROM books b
                LEFT JOIN file_ratings fr ON b.book_id = fr.book_id
                GROUP BY b.book_id
                ORDER BY b.book_id
                LIMIT $1 OFFSET $2
            `,
            values: [limit, offset]
        };
        
        const rankingResult = await pool.query(rankingQuery);

        const totalCountResult = await pool.query('SELECT COUNT(*) FROM books');
        const totalCount = parseInt(totalCountResult.rows[0].count, 10);
        const totalPages = Math.ceil(totalCount / limit);

        res.json({
            ranking: rankingResult.rows,
            page,
            totalPages,
        });
    } catch (error) {
        handleError(res, error, 'Ошибка при получении рейтинга скачиваний');
    }
});

// Маршрут для регистрации
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Имя пользователя и пароль обязательны' });
    }

    try {
        const existingUser = await queryDatabase('SELECT * FROM users WHERE username = $1', [username]);
        if (existingUser.length > 0) {
            return res.status(409).json({ error: 'Пользователь с таким именем уже существует' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const insertUserQuery = 'INSERT INTO users (username, password_hash, role, created_at) VALUES ($1, $2, $3, NOW()) RETURNING user_id';
        
        const result = await queryDatabase(insertUserQuery, [username, hashedPassword, 'user']);

        logAction(result[0].user_id, `Регистрация нового пользователя ${username} : ID ${result[0].user_id}`);

        res.status(201).json({ message: 'Пользователь зарегистрирован', user_id: result[0].user_id });
    } catch (error) {
        handleError(res, error, 'Ошибка при регистрации пользователя');
    }
});

// Маршрут для авторизации
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Имя пользователя и пароль обязательны' });
    }

    try {
        const user = await queryDatabase('SELECT * FROM users WHERE username = $1', [username]);
        if (user.length === 0) {
            return res.status(401).json({ error: 'Неправильное имя пользователя или пароль' });
        }

        const validPassword = await bcrypt.compare(password, user[0].password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Неправильное имя пользователя или пароль' });
        }
        
        const token = jwt.sign(
            { userId: user[0].user_id, role: user[0].role, username: user[0].username },
            SECRET_KEY,
            { expiresIn: '1h' }
        );        
        
        logAction(user[0].user_id, `Авторизация пользователя ${username} : ID ${user[0].user_id}`);

        res.json({ token });
    } catch (error) {
        handleError(res, error, 'Ошибка при входе');
    }
});

// Middleware для проверки JWT
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Неверный токен' });
        }
        req.user = user;
        next();
    });
};

// Middleware для проверки роли администратора
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Доступ запрещен' });
    }
    next();
};

// Пример защищенного маршрута
app.get('/protected', authenticateToken, (req, res) => {
    res.json({ message: 'Это защищенный маршрут', user: req.user });
    
});

// Пример маршрута для админа
app.get('/admin/protected', authenticateToken, requireAdmin, (req, res) => {
    res.json({ message: 'Это защищенный маршрут для администратора', user: req.user });
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на порте ${PORT}`);
});
