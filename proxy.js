import express from 'express';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

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

// Function to format metadata into the required HTML structure
const formatHadith = (hadithText, metadata) => {
    return `
        <div class="hadith-card">
            <div class="hadith-text">${hadithText}</div>
            <div class="hadith-info">
                <span class="label">الراوي:</span>
                <span class="narrator">${metadata.narrator || 'غير معروف'}</span>
                <span class="separator">|</span>
                <span class="label">المحدث:</span>
                <span class="source">${metadata.source || 'غير معروف'}</span>
                <span class="separator">|</span>
                <span class="label">المصدر:</span>
                <span class="source">${metadata.book || 'غير معروف'}</span>
                <span class="separator">|</span>
                <span class="label">خلاصة حكم الحديث:</span>
                <span class="verdict">${metadata.verdict || 'غير معروف'}</span>
                <span class="separator">|</span>
                <span class="label">الصفحة أو الرقم:</span>
                <span>${metadata.page || 'غير معروف'}</span>
            </div>
            <div class="hadith-info related-links">
                <a href="#">شرح حديث مشابه</a>
                <span class="separator">|</span>
                <a href="#">أحاديث مشابهة</a>
            </div>
        </div>
    `;
};

// Route to handle API requests
app.get('/proxy', async (req, res) => {
    const skey = req.query.skey; // Keyword to search
    const tashkeel = req.query.tashkeel || 'on'; // Default to 'on'

    if (!skey) {
        return res.status(400).json({ error: 'Missing "skey" query parameter' });
    }

    const apiUrl = `https://dorar.net/dorar_api.json?skey=${encodeURIComponent(skey)}`;
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`Dorar API responded with status: ${response.status}`);
        }

        const data = await response.json();
        if (data.ahadith && data.ahadith.result) {
            const $ = cheerio.load(data.ahadith.result);
            let formattedResults = '';

            $('.hadith').each((index, el) => {
                const hadithText = $(el).text().trim();
                const metadata = {
                    narrator: $(el).next('.hadith-info').find('span:contains("الراوي")').text().split(':')[1]?.trim(),
                    source: $(el).next('.hadith-info').find('span:contains("المحدث")').text().split(':')[1]?.trim(),
                    book: $(el).next('.hadith-info').find('span:contains("المصدر")').text().split(':')[1]?.trim(),
                    verdict: $(el).next('.hadith-info').find('span:contains("خلاصة حكم الحديث")').text().split(':')[1]?.trim(),
                    page: $(el).next('.hadith-info').find('span:contains("الصفحة أو الرقم")').text().split(':')[1]?.trim(),
                };

                if (tashkeel === 'off') {
                    metadata.narrator = removeTashkeel(metadata.narrator || '');
                    metadata.source = removeTashkeel(metadata.source || '');
                    metadata.book = removeTashkeel(metadata.book || '');
                    metadata.verdict = removeTashkeel(metadata.verdict || '');
                    metadata.page = removeTashkeel(metadata.page || '');
                }

                formattedResults += formatHadith(hadithText, metadata);
            });

            res.json({ html: formattedResults });
        } else {
            res.json({ error: 'لم يتم العثور على نتائج.' });
        }
    } catch (error) {
        console.error(`Error fetching Dorar API: ${error.message}`);
        res.status(500).json({ error: 'Failed to fetch data from the Dorar API', details: error.message });
    }
});

// Start the proxy server
app.listen(PORT, () => {
    console.log(`Proxy server running on http://localhost:${PORT}`);
});
