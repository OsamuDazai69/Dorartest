import express from 'express';
import fetch from 'node-fetch';

const app = express();
const PORT = 3000;

// Middleware to enable CORS
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});

// Function to remove diacritical marks from Arabic text
const removeTashkeel = (text) => {
    return text.replace(/[\u0617-\u061A\u064B-\u0652]/g, '');
};

// Route to handle API requests
app.get('/proxy', async (req, res) => {
    const skey = req.query.skey; // Keyword to search
    const tashkeel = req.query.tashkeel || 'on'; // Default to 'on' if not provided

    // Validate the keyword
    if (!skey) {
        return res.status(400).json({ error: 'Missing "skey" query parameter' });
    }

    // Construct the Dorar API URL
    const apiUrl = `https://dorar.net/dorar_api.json?skey=${encodeURIComponent(skey)}`;
    console.log(`Fetching API URL: ${apiUrl}`);

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`Dorar API responded with status: ${response.status}`);
        }

        let data = await response.json();

        // If tashkeel is off, process the Hadith content
        if (tashkeel === 'off' && data.ahadith && data.ahadith.result) {
            const parser = new DOMParser();
            const htmlDoc = parser.parseFromString(data.ahadith.result, 'text/html');
            htmlDoc.querySelectorAll('.hadith, .hadith-info').forEach((el) => {
                el.textContent = removeTashkeel(el.textContent);
            });

            // Serialize modified HTML back to a string
            const serializer = new XMLSerializer();
            data.ahadith.result = serializer.serializeToString(htmlDoc);
        }

        res.json(data);
    } catch (error) {
        console.error(`Error fetching Dorar API: ${error.message}`);
        res.status(500).json({
            error: 'Failed to fetch data from the Dorar API',
            details: error.message,
        });
    }
});

// Start the proxy server
app.listen(PORT, () => {
    console.log(`Proxy server running on http://localhost:${PORT}`);
});
