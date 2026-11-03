<?php
// Dépôt de fichiers d'impression : validation extension + type MIME réel, stockage hors du web, téléchargement contrôlé.
class Files {
    const MIMES = [
        'pdf' => ['application/pdf'], 'jpg' => ['image/jpeg'], 'jpeg' => ['image/jpeg'], 'png' => ['image/png'], 'tif' => ['image/tiff'], 'tiff' => ['image/tiff'],
        'eps' => ['application/postscript', 'application/pdf', 'application/octet-stream', 'image/x-eps'], 'ai' => ['application/pdf', 'application/postscript', 'application/illustrator', 'application/vnd.adobe.illustrator', 'application/octet-stream'],
        'psd' => ['image/vnd.adobe.photoshop', 'application/octet-stream', 'image/x-photoshop'], 'svg' => ['image/svg+xml', 'text/xml', 'text/plain', 'application/xml'], 'zip' => ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'],
        'cdr' => ['application/octet-stream', 'application/x-coreldraw', 'application/zip'],
    ];
    static function allowed(): array { return array_values(array_intersect(array_map('trim', explode(',', strtolower(Settings::get('upload_ext', 'pdf,jpg,jpeg,png,tif,tiff,eps,ai,psd,svg,zip,cdr')))), array_keys(self::MIMES))); }
    static function max_bytes(): int { return (int) Settings::get('upload_max_mb', 50) * 1048576; }
    static function dir(): string { $d = APP . '/storage/uploads/' . date('Y/m'); if (!is_dir($d)) mkdir($d, 0775, true); return $d; }
    /** Enregistre un fichier envoyé ; retourne la ligne `files` ou lance une exception avec un message clair. */
    static function save(array $f, string $ownerToken, string $kind = 'client', array $extra = []): array {
        if (($f['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) throw new RuntimeException(($f['error'] ?? 0) === UPLOAD_ERR_INI_SIZE || ($f['error'] ?? 0) === UPLOAD_ERR_FORM_SIZE ? 'Fichier trop volumineux.' : "Le fichier n'a pas pu être envoyé.");
        $orig = mb_substr(preg_replace('/[^\p{L}\p{N}._ ()-]+/u', '_', basename($f['name'])), 0, 200); $ext = strtolower(pathinfo($orig, PATHINFO_EXTENSION));
        if (!in_array($ext, self::allowed(), true)) throw new RuntimeException('Format non accepté. Formats acceptés : ' . strtoupper(implode(', ', self::allowed())) . '.');
        if ($f['size'] > self::max_bytes()) throw new RuntimeException('Fichier trop volumineux (maximum ' . (int) Settings::get('upload_max_mb', 50) . ' Mo).');
        if ($f['size'] < 10) throw new RuntimeException('Fichier vide.');
        $mime = (new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']) ?: 'application/octet-stream';
        if (!in_array($mime, self::MIMES[$ext], true)) throw new RuntimeException("Le contenu du fichier ne correspond pas à son format (.$ext).");
        $stored = bin2hex(random_bytes(16)) . '.dat'; $dir = self::dir();
        if (!move_uploaded_file($f['tmp_name'], "$dir/$stored")) { if (!@rename($f['tmp_name'], "$dir/$stored")) throw new RuntimeException("Enregistrement impossible."); }
        $id = DB::ins('files', ['owner_token' => $ownerToken, 'user_id' => user()['id'] ?? 0, 'kind' => $kind, 'orig_name' => $orig, 'stored_name' => date('Y/m') . '/' . $stored, 'mime' => $mime, 'size' => (int) $f['size'], 'status' => 'received'] + $extra);
        return DB::find('files', $id);
    }
    static function path(array $row): string { return APP . '/storage/uploads/' . $row['stored_name']; }
    /** Envoie le fichier en téléchargement (jamais affiché inline). */
    static function send(array $row): void {
        $p = self::path($row); if (!is_file($p)) abort(404, 'Fichier introuvable.');
        header('Content-Type: application/octet-stream'); header('X-Content-Type-Options: nosniff'); header('Content-Length: ' . filesize($p));
        header('Content-Disposition: attachment; filename="' . str_replace('"', '', $row['orig_name']) . '"'); readfile($p); exit;
    }
    static function human(int $b): string { return $b >= 1048576 ? number_format($b / 1048576, 1, ',', '') . ' Mo' : max(1, (int) round($b / 1024)) . ' Ko'; }
    const STATUS = ['received' => ['Reçu', 'info'], 'checking' => ['En vérification', 'warn'], 'ok' => ['Validé', 'ok'], 'rejected' => ['À corriger', 'bad']];
}
