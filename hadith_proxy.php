<?php
header('Content-Type: application/json; charset=utf-8');

// Allow CORS for cross-origin requests
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Function to remove diacritical marks (Tashkeel) from Arabic text
function removeTashkeel($text) {
    return preg_replace('/[\x{0617}-\x{061A}\x{064B}-\x{0652}]/u', '', $text);
}

// Function to format the Hadith into structured HTML
function formatHadith($hadithContent, $metadata) {
    $formatted = "<div class='hadith-card'>";
    $formatted .= "<div class='hadith-text'>{$hadithContent}</div>";

    if (!empty($metadata)) {
        $formatted .= "<div class='hadith-info'>";
        foreach ($metadata as $key => $value) {
            $formatted .= "<span><strong>{$key}:</strong> {$value}</span>";
        }
        $formatted .= "</div>";
    }

    $formatted .= "</div>";
    return $formatted;
}

// Check if the request method is GET
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Get query parameters
    $skey = $_GET['skey'] ?? '';
    $includeTashkeel = $_GET['tashkeel'] ?? 'on'; // Default to including Tashkeel

    // Validate the search key
    if (empty($skey)) {
        echo json_encode(['error' => 'Missing search key']);
        exit;
    }

    // Dorar API URL
    $apiUrl = "https://dorar.net/dorar_api.json?skey=" . urlencode($skey);
    
    // Fetch data from the Dorar API
    $apiResponse = @file_get_contents($apiUrl);
    if (!$apiResponse) {
        echo json_encode(['error' => 'Failed to fetch data from API']);
        exit;
    }

    $data = json_decode($apiResponse, true);

    // Check if results exist
    if ($data && isset($data['ahadith']['result'])) {
        $results = $data['ahadith']['result'];
        $doc = new DOMDocument();
        @$doc->loadHTML($results);

        $hadithElements = $doc->getElementsByTagName('div');
        $finalOutput = '';

        foreach ($hadithElements as $element) {
            if ($element->getAttribute('class') === 'hadith') {
                $hadithText = $element->textContent;

                // Remove Tashkeel if requested
                if ($includeTashkeel === 'off') {
                    $hadithText = removeTashkeel($hadithText);
                }

                // Extract metadata from the next sibling
                $metadata = [];
                $nextSibling = $element->nextSibling;
                while ($nextSibling && $nextSibling->nodeType !== XML_ELEMENT_NODE) {
                    $nextSibling = $nextSibling->nextSibling;
                }
                if ($nextSibling && $nextSibling->getAttribute('class') === 'hadith-info') {
                    foreach ($nextSibling->childNodes as $child) {
                        if ($child->nodeType === XML_ELEMENT_NODE) {
                            $keyValue = explode(':', $child->textContent, 2);
                            if (count($keyValue) === 2) {
                                $metadata[trim($keyValue[0])] = trim($keyValue[1]);
                            }
                        }
                    }
                }

                // Format the Hadith and add it to the output
                $finalOutput .= formatHadith($hadithText, $metadata);
            }
        }

        echo json_encode(['html' => $finalOutput]);
    } else {
        echo json_encode(['error' => 'No results found']);
    }
} else {
    echo json_encode(['error' => 'Invalid request method']);
}
?>
