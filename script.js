let includeTashkeel = true; // Default to including Tashkeel

document.getElementById("search-btn").addEventListener("click", fetchHadith);
document.getElementById("toggle-tashkeel").addEventListener("click", toggleTashkeel);

async function fetchHadith() {
    const searchKey = document.getElementById('skey').value.trim();

    if (!searchKey) {
        document.getElementById('result').innerHTML = '<p>الرجاء إدخال كلمة البحث.</p>';
        return;
    }

    const apiUrl = `http://localhost:3000/proxy?skey=${encodeURIComponent(searchKey)}&tashkeel=${includeTashkeel ? 'on' : 'off'}`;

    try {
        console.log(`Fetching data from: ${apiUrl}`); // Debugging

        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        console.log('Received data:', data); // Debugging

        if (data.html) {
            document.getElementById('result').innerHTML = data.html;
        } else if (data.error) {
            document.getElementById('result').innerHTML = `<p>${data.error}</p>`;
        } else {
            document.getElementById('result').innerHTML = '<p>لم يتم العثور على نتائج.</p>';
        }
    } catch (error) {
        console.error('Error fetching data:', error.message); // Debugging
        document.getElementById('result').innerHTML = `<p>خطأ: ${error.message}</p>`;
    }
}

function toggleTashkeel() {
    includeTashkeel = !includeTashkeel; // Toggle the state
    const toggleButton = document.getElementById('toggle-tashkeel');
    toggleButton.textContent = includeTashkeel ? 'بدون تشكيل' : 'مع تشكيل'; // Update button text
}
