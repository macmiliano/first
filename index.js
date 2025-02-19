import express from 'express';
import bodyParser from 'body-parser';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import session from 'express-session';

// const __dirname = dirname(fileURLToPath(import.meta.url));
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "Real",
    password: "Miliano",
    port: 5432,
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true
}));
// __dirname + '/views'
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

db.connect();

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        return next();
    } else {
        res.redirect('/login');
    }
};

// Routes
app.get('/', isAuthenticated, async (req, res) => {
    const result = await db.query('SELECT * FROM posts WHERE user_id = $1 ORDER BY created_at DESC', [req.session.userId]);
    res.render('dashboard', { posts: result.rows });
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length > 0) {
        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password);
        if (validPassword) {
            req.session.userId = user.id;
            res.redirect('/');
        } else {
            res.redirect('/login');
        }
    } else {
        res.redirect('/login');
    }
});

app.get('/signup', (req, res) => {
    res.render('signup');
});

app.post('/signup', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query('INSERT INTO users (username, password) VALUES ($1, $2)', [username, hashedPassword]);
    res.redirect('/login');
});

app.post('/posts', isAuthenticated, async (req, res) => {
    const { title, content } = req.body;
    await db.query('INSERT INTO posts (user_id, title, content) VALUES ($1, $2, $3)', [req.session.userId, title, content]);
    res.redirect('/');
});

// Delete Post Route
app.post('/posts/delete/:id', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    await db.query('DELETE FROM posts WHERE id = $1 AND user_id = $2', [id, req.session.userId]);
    res.redirect('/');
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});