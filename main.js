// Display in descending alphabetical order
// limit 30
// 2 pages, in results page it should display all information: name, rating, img, summary. Link to official site should be clickable. Back button to go back to results

// libraries
const express = require('express');
const handlebars = require('express-handlebars');
const mysql = require('mysql2/promise');

// Environment configuration
const PORT = parseInt(process.argv[2] || process.env.PORT) || 3000;

// Connection pool config
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || '3306',
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME || 'leisureasy',
    connectionLimit: 4,
    timezone: '+08:00'
})

// SQL Queries
const SQL_GET_TV = 'select tvid, name from tv_shows order by name asc limit 30';
const SQL_FIND_BY_TV_ID = 'select * from tv_shows where tvid = ?';

// Query creator function
const mkQuery = (sqlStmt, pool) => {
    const f = async (params) => {
        // Get connection from pool
        const conn = await pool.getConnection();

        try {
            // Execute query with the parameter
            const results = await pool.query(sqlStmt, params)
            return results[0];
        } catch (e) {
            return Promise.reject(e);
        } finally {
            conn.release();
        }
    }
    return f;
}

// Query functions
const getTVList = mkQuery(SQL_GET_TV, pool);
const getShowByID = mkQuery(SQL_FIND_BY_TV_ID, pool);

// Express config
const app = express();

// Handlebars config
app.engine('hbs', handlebars({
    defaultLayout: 'default.hbs'
}));
app.set('view engine', 'hbs');

// Application
// Homepage
app.get('/', async (req, res) => {
    // Getting initial list of tv shows

    try {
        // const results = await conn.query(SQL_GET_TV);
        const results = await getTVList();

        res.status(200);
        res.type('text/html');
        res.render('index', {
            shows: results
        });

    } catch (e) {
        res.status(500);
        res.type('text/html');
        res.send(JSON.stringify(e));
    }
});

// TV Show Detail Page
app.get('/tvshow/:tvid', async (req, res) => {

    const tvid = req.params.tvid;

    try {

        const results = await getShowByID([tvid]);
        const recs = results[0];

        console.log(recs);

        if (recs.length <= 0) {
            res.status(404);
            res.type('text/html');
            res.send(`${tvid} not found`);
            return
        }

        res.status(200);
        res.type('text/html');
        res.render('showdetails', {
            shows: recs,
            hasSite: !!recs.official_site
        });

    } catch (e) {
        console.info(e)
        res.status(500);
        res.type('text/html');
        res.send(JSON.stringify(e));
    }
});

// Start connection pool and server
const startApp = async (app, pool) => {
    try {
        const conn = await pool.getConnection();
        console.log('Pinging Database');
        await conn.ping();

        conn.release();

        app.listen(PORT, () => {
            console.log(`Server Started on ${PORT} at ${new Date}`);
        });
    } catch (e) {
        console.error(`Cannot ping database: `, e);
    }
}

startApp(app, pool);