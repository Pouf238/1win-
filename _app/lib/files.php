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
        if (!in_array($mime, self::MIMES[$ext], true)) { audit('upload_rejected', $ext, ['why' => 'mime ' . $mime], 'warn'); throw new RuntimeException("Le contenu du fichier ne correspond pas à son format (.$ext)."); }
        try { self::inspect($f['tmp_name'], $ext); } catch (RuntimeException $e) { audit('upload_rejected', $ext, ['why' => $e->getMessage()], 'warn'); throw $e; }
        $w = $h = 0; $warn = '';   // dimensions des images : alerte de faible résolution (information, ne bloque pas l'envoi)
        if (in_array($ext, ['jpg', 'jpeg', 'png', 'tif', 'tiff'], true) && ($gi = @getimagesize($f['tmp_name']))) { $w = (int) $gi[0]; $h = (int) $gi[1]; if ($w * $h > 200000000) throw new RuntimeException('Image aux dimensions excessives : réduisez-la ou exportez-la en PDF.'); if (min($w, $h) < 1000) $warn = "Faible résolution ($w × $h px) : l'impression peut manquer de netteté. Envoyez un fichier plus grand si possible."; }
        $stored = bin2hex(random_bytes(16)) . '.dat'; $dir = self::dir();
        if (!move_uploaded_file($f['tmp_name'], "$dir/$stored")) { if (!@rename($f['tmp_name'], "$dir/$stored")) throw new RuntimeException("Enregistrement impossible."); }
        @chmod("$dir/$stored", 0640);
        $id = DB::ins('files', ['owner_token' => $ownerToken, 'user_id' => user()['id'] ?? 0, 'kind' => $kind, 'orig_name' => $orig, 'stored_name' => date('Y/m') . '/' . $stored, 'mime' => $mime, 'size' => (int) $f['size'], 'status' => 'received', 'width' => $w, 'height' => $h, 'warn' => $warn] + $extra);
        return DB::find('files', $id);
    }
    // ---------------------------------------------------------------- inspection du contenu (analyse statique, sans exécuter ni décompresser)
    const EXEC_EXT = '/\.(php\d?|phtml|phar|pht|inc|pl|py|rb|cgi|asp|aspx|jsp|exe|dll|so|bat|cmd|com|scr|msi|vbs|vbe|wsf|ps1|sh|jar|js|mjs|html?|xhtml|htaccess|htpasswd|lnk|hta|reg|apk|app)$/i';
    const MAGIC = ['pdf' => '%PDF-', 'png' => "\x89PNG", 'jpg' => "\xFF\xD8\xFF", 'jpeg' => "\xFF\xD8\xFF", 'psd' => '8BPS', 'zip' => "PK\x03\x04"];
    static function inspect(string $path, string $ext): void {
        $bad = new RuntimeException('Ce fichier ne peut pas être accepté (contenu actif ou non conforme). Exportez-le à nouveau en PDF/PNG/JPG standard.'); $h = fopen($path, 'rb'); if (!$h) throw new RuntimeException('Fichier illisible.');
        $head = (string) fread($h, 1024); $ok = true;
        if (isset(self::MAGIC[$ext])) $ok = str_starts_with($head, self::MAGIC[$ext]) || ($ext === 'pdf' && str_contains(substr($head, 0, 1024), '%PDF-'));
        elseif (in_array($ext, ['tif', 'tiff'], true)) $ok = str_starts_with($head, "II*\x00") || str_starts_with($head, "MM\x00*");
        elseif ($ext === 'eps') $ok = str_starts_with($head, '%!PS') || str_starts_with($head, "\xC5\xD0\xD3\xC6");
        elseif ($ext === 'ai') $ok = str_starts_with($head, '%PDF-') || str_starts_with($head, '%!PS');
        elseif ($ext === 'cdr') $ok = str_starts_with($head, 'RIFF') || str_starts_with($head, "PK\x03\x04");
        elseif ($ext === 'svg') $ok = (bool) preg_match('/<svg[\s>]/i', $head) || (bool) preg_match('/^\s*(<\?xml|<!--|<svg)/i', $head);
        if (!$ok) { fclose($h); throw new RuntimeException("Le contenu du fichier ne correspond pas à son format (.$ext)."); }
        // balayage par blocs (mémoire constante) : balises PHP, et selon le format, éléments actifs
        rewind($h); $tail = ''; $svg = $ext === 'svg'; $pdf = in_array($ext, ['pdf', 'ai'], true);
        while (!feof($h)) {
            $chunk = $tail . (string) fread($h, 1048576); $tail = substr($chunk, -96);
            if (!$svg && stripos($chunk, '<?php') !== false) { fclose($h); throw $bad; }
            if ($pdf) { $n = preg_replace_callback('/#([0-9A-Fa-f]{2})/', fn($m) => chr(hexdec($m[1])), $chunk); if (preg_match('#/(JavaScript|Launch|RichMedia|GoToE|GoToR|ImportData|SubmitForm)\b#', $n)) { fclose($h); throw $bad; } }
            if ($svg && preg_match('/<script|<foreignObject|<iframe|<embed|<object|<!ENTITY|javascript:|data:text\/html|\son[a-z]+\s*=|<\?php|<set\b[^>]*attributeName\s*=\s*["\']?(href|on)|<animate\b[^>]*attributeName\s*=\s*["\']?(href|on)/i', $chunk)) { fclose($h); throw $bad; }
        }
        fclose($h);
        if ($ext === 'zip' || ($ext === 'cdr' && str_starts_with($head, 'PK'))) self::inspect_zip($path);
    }
    /** Lit le répertoire central du ZIP sans extraire : refuse traversées, scripts/exécutables, ZIP64, bombes (ratio, taille, nombre). */
    static function inspect_zip(string $path): void {
        $bad = fn($m) => new RuntimeException('Archive refusée : ' . $m); $size = filesize($path); $h = fopen($path, 'rb'); $read = (int) min($size, 65557); fseek($h, -$read, SEEK_END); $buf = (string) fread($h, $read);
        $p = strrpos($buf, "PK\x05\x06"); if ($p === false || strlen($buf) - $p < 22) { fclose($h); throw $bad('structure invalide.'); }
        $e = unpack('vdisk/vcd/vn1/vn/Vcdsize/Vcdoff', substr($buf, $p + 4, 18)); $n = $e['n']; if ($e['n1'] !== $n || $n === 0xFFFF || $e['cdoff'] === 0xFFFFFFFF) { fclose($h); throw $bad('format non pris en charge.'); }
        if ($n > 1000 || $e['cdsize'] > 4 * 1048576 || $e['cdoff'] + $e['cdsize'] > $size) { fclose($h); throw $bad('trop volumineuse ou invalide.'); }
        fseek($h, $e['cdoff']); $cd = (string) fread($h, $e['cdsize']); fclose($h); $o = 0; $tot = 0; $comp = 0;
        for ($i = 0; $i < $n; $i++) {
            if (strlen($cd) < $o + 46 || substr($cd, $o, 4) !== "PK\x01\x02") throw $bad('structure invalide.');
            $f = unpack('vmade/vneed/vflags/vmethod/vtime/vdate/Vcrc/Vcsize/Vusize/vnl/vel/vcl', substr($cd, $o + 4, 42)); $name = substr($cd, $o + 46, $f['nl']); $o += 46 + $f['nl'] + $f['el'] + $f['cl'];
            if ($f['csize'] === 0xFFFFFFFF || $f['usize'] === 0xFFFFFFFF) throw $bad('format non pris en charge.');
            $norm = str_replace('\\', '/', $name);
            if ($name === '' || str_contains($name, "\0") || str_starts_with($norm, '/') || preg_match('#(^|/)\.\.(/|$)#', $norm) || preg_match('#^[A-Za-z]:#', $norm)) throw $bad('chemin dangereux.');
            if (preg_match(self::EXEC_EXT, $norm)) throw $bad('contient un script ou un exécutable (' . basename($norm) . ').');
            if ($f['usize'] > 0 && $f['csize'] > 0 && $f['usize'] / $f['csize'] > 100 && $f['usize'] > 1048576) throw $bad('taux de compression anormal.');
            $tot += $f['usize']; $comp += $f['csize'];
        }
        if ($tot > 500 * 1048576) throw $bad('contenu décompressé trop volumineux.'); if ($comp > 0 && $tot / $comp > 100 && $tot > 1048576) throw $bad('taux de compression anormal.');
    }
    /** Chemin disque d'un fichier : le nom stocké est toujours généré par le serveur ; tout autre format est refusé (défense en profondeur contre une valeur altérée en base). */
    static function path(array $row): string { if (!preg_match('#^\d{4}/\d{2}/[a-f0-9]{32}\.dat$#', (string) $row['stored_name'])) throw new RuntimeException('Chemin de fichier invalide.'); return APP . '/storage/uploads/' . $row['stored_name']; }
    /** Envoie le fichier en téléchargement (jamais affiché inline). */
    static function send(array $row): void {
        $p = self::path($row); if (!is_file($p)) abort(404, 'Fichier introuvable.');
        $fn = str_replace(['"', '\\', "\r", "\n", '/'], '_', (string) $row['orig_name']);
        header('Content-Type: application/octet-stream'); header('X-Content-Type-Options: nosniff'); header('Content-Length: ' . filesize($p)); header('Cache-Control: private, no-store'); header("Content-Security-Policy: default-src 'none'; sandbox");
        header('Content-Disposition: attachment; filename="' . $fn . '"; filename*=UTF-8\'\'' . rawurlencode($fn)); readfile($p); exit;
    }
    static function human(int $b): string { return $b >= 1048576 ? number_format($b / 1048576, 1, ',', '') . ' Mo' : max(1, (int) round($b / 1024)) . ' Ko'; }
    const STATUS = ['received' => ['Reçu', 'info'], 'checking' => ['En vérification', 'warn'], 'ok' => ['Validé', 'ok'], 'rejected' => ['À corriger', 'bad']];
}
