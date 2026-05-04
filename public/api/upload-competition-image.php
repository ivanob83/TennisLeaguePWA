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

$competitionId = $body['competitionId'] ?? '';
$images        = $body['images'] ?? [];

if (!$competitionId || !preg_match('/^[a-zA-Z0-9_\-]+$/', $competitionId)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid competitionId']);
    exit;
}

$dir = __DIR__ . '/../media/competitions/' . $competitionId;
if (!is_dir($dir)) {
    mkdir($dir, 0755, true);
}

$urls = [];
foreach ($images as $width => $dataUrl) {
    if (!preg_match('/^data:image\/(webp|jpeg|png);base64,/', $dataUrl)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid image data']);
        exit;
    }
    $base64 = preg_replace('/^data:image\/\w+;base64,/', '', $dataUrl);
    $data   = base64_decode($base64);
    if ($data === false) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid base64']);
        exit;
    }
    $file = $dir . '/' . $width . '.webp';
    file_put_contents($file, $data);
    $urls[$width] = '/media/competitions/' . $competitionId . '/' . $width . '.webp';
}

echo json_encode(['urls' => $urls]);
