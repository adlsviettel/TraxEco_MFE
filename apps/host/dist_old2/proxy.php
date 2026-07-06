<?php
// Simple PHP Proxy for Images
// This script takes a URL parameter, fetches the image, and returns it.
// It allows bypassing Mixed Content errors by proxying HTTP images through the HTTPS origin.

if (!isset($_GET['url'])) {
    header("HTTP/1.0 400 Bad Request");
    echo "Missing 'url' parameter.";
    exit;
}

$url = $_GET['url'];

// Basic security check: only allow URLs pointing to our known internal servers
if (strpos($url, 'http://192.168.1.248/') !== 0 && strpos($url, 'http://192.168.14.10/') !== 0) {
    header("HTTP/1.0 403 Forbidden");
    echo "URL not allowed.";
    exit;
}

// Fetch headers to get content type
$context = stream_context_create(array(
    'http' => array('ignore_errors' => true)
));

$headers = get_headers($url, 1);
$contentType = "image/jpeg"; // default
if (isset($headers['Content-Type'])) {
    if (is_array($headers['Content-Type'])) {
        $contentType = end($headers['Content-Type']);
    } else {
        $contentType = $headers['Content-Type'];
    }
}

// Output headers
header("Content-Type: " . $contentType);
header("Access-Control-Allow-Origin: *");

// Passthrough the content
$fp = fopen($url, 'rb', false, $context);
if (!$fp) {
    header("HTTP/1.0 404 Not Found");
    exit;
}
fpassthru($fp);
fclose($fp);
?>
