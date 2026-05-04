<?php
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);
if (!$body) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
}

$playerId = $body['playerId'] ?? '';
$images   = $body['images'] ?? [];

if (!$playerId || !preg_match('/^[a-zA-Z0-9_\-]+$/', $playerId)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid playerId']);
    exit;
}

$dir = __DIR__ . '/../media/avatars/' . $playerId;
if (!is_dir($dir)) {
    if (!mkdir($dir, 0755, true)) {
        http_response_code(500);
        echo json_encode(['error' => 'Cannot create directory: ' . $dir, 'cwd' => __DIR__]);
        exit;
    }
}

if (!is_writable($dir)) {
    http_response_code(500);
    echo json_encode(['error' => 'Directory not writable: ' . $dir]);
    exit;
}

$urls = [];
foreach ($images as $size => $dataUrl) {
    if (!preg_match('/^data:image\/(webp|jpeg|png);base64,/', $dataUrl)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid image data for size ' . $size]);
        exit;
    }
    $base64 = preg_replace('/^data:image\/\w+;base64,/', '', $dataUrl);
    $data   = base64_decode($base64);
    if ($data === false) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid base64 for size ' . $size]);
        exit;
    }
    $file = $dir . '/' . $size . '.webp';
    if (file_put_contents($file, $data) === false) {
        http_response_code(500);
        echo json_encode(['error' => 'Cannot write file: ' . $file]);
        exit;
    }
    $urls[$size] = '/media/avatars/' . $playerId . '/' . $size . '.webp';
}

echo json_encode(['urls' => $urls]);
