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

// Function to format Hadith metadata into structured HTML
const formatHadith = (hadithText, metadata) => {
    return `
        <div class="hadith-card">
            <div class="hadith-text">${hadithText}</div>
            <div class="hadith-info">
                <span class="label">الراوي:</span>
                <span class="narrator">${metadata.narrator || ''}</span>
                <span class="separator">|</span>
                <span class="label">المحدث:</span>
                <span class="source">${metadata.source || ''}</span>
                <span class="separator">|</span>
                <span class="label">المصدر:</span>
                <span class="source">${metadata.book || ''}</span>
                <span class="separator">|</span>
                <span class="label">خلاصة حكم الحديث:</span>
                <span class="verdict">${metadata.verdict || ''}</span>
                <span class="separator">|</span>
                <span class="label">الصفحة أو الرقم:</span>
                <span>${metadata.page || ''}</span>
            </div>
            <div class="hadith-info related-links">
                <button class="related-hadith-button" data-keyword="${metadata.narrator || ''}">أحاديث مشابهة</button>
            </div>
        </div>
    `;
};

// Route to handle Hadith search
app.get('/proxy', async (req, res) => {
    const skey = req.query.skey;
    const tashkeel = req.query.tashkeel || 'on';

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
        console.log('API Response:', data);

        if (data.ahadith && data.ahadith.result) {
            const $ = cheerio.load(data.ahadith.result);
            let formattedResults = '';

            $('.hadith').each((index, el) => {
                const hadithText = $(el).text().trim();
                const metadata = {};

                const infoElement = $(el).next('.hadith-info');
                if (infoElement.length > 0) {
                    infoElement.find('span').each((_, span) => {
                        const text = $(span).text().trim();
                        if (text.includes('الراوي:')) {
                            metadata.narrator = text.replace('الراوي:', '').trim();
                        } else if (text.includes('المحدث:')) {
                            metadata.source = text.replace('المحدث:', '').trim();
                        } else if (text.includes('المصدر:')) {
                            metadata.book = text.replace('المصدر:', '').trim();
                        } else if (text.includes('خلاصة حكم الحديث:')) {
                            metadata.verdict = text.replace('خلاصة حكم الحديث:', '').trim();
                        } else if (text.includes('الصفحة أو الرقم:')) {
                            metadata.page = text.replace('الصفحة أو الرقم:', '').trim();
                        }
                    });
                }

                // Handle tashkeel removal
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

// Route to handle fetching similar Ahadith
app.get('/related', async (req, res) => {
    const keyword = req.query.keyword;
    if (!keyword) {
        return res.status(400).json({ error: 'Missing "keyword" query parameter' });
    }

    const apiUrl = `https://dorar.net/dorar_api.json?skey=${encodeURIComponent(keyword)}`;
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`Dorar API responded with status: ${response.status}`);
        }

        const data = await response.json();
        if (data.ahadith && data.ahadith.result) {
            const $ = cheerio.load(data.ahadith.result);
            let relatedResults = '';

            $('.hadith').each((index, el) => {
                const hadithText = $(el).text().trim();
                relatedResults += `<p>${hadithText}</p>`;
            });

            res.json({ relatedHtml: relatedResults });
        } else {
            res.json({ error: 'لم يتم العثور على نتائج.' });
        }
    } catch (error) {
        console.error(`Error fetching related Ahadith: ${error.message}`);
        res.status(500).json({ error: 'Failed to fetch related Ahadith from the Dorar API', details: error.message });
    }
});

// Start the proxy server
app.listen(PORT, () => {
    console.log(`Proxy server running on http://localhost:${PORT}`);
});
