<?php
// Génération de PDF (devis, factures, bons de commande) avec FPDF.
require_once APP . '/vendor/fpdf.php';
function pt(string $s): string { $s = str_replace(["\u{202F}", "\u{00A0}", '’', '–', '—', '€'], [' ', ' ', "'", '-', '-', ''], $s); return iconv('UTF-8', 'windows-1252//TRANSLIT//IGNORE', $s) ?: $s; }
function pmoney($n): string { return number_format((int) $n, 0, ',', ' ') . ' ' . Settings::get('currency_symbol', 'FCFA'); }

class SymoPdf extends FPDF {
    public string $docTitle = '';
    function Header(): void {
        $logo = ROOT . '/assets/img/brand/logo.png'; if (is_file($logo)) $this->Image($logo, 14, 12, 48);
        $this->SetFont('Helvetica', 'B', 20); $this->SetTextColor(31, 122, 140); $this->SetXY(110, 12); $this->Cell(86, 9, pt($this->docTitle), 0, 1, 'R');
        $this->SetTextColor(0); $this->Ln(2);
    }
    function Footer(): void {
        $this->SetY(-18); $this->SetDrawColor(244, 166, 42); $this->SetLineWidth(0.6); $this->Line(14, $this->GetY(), 196, $this->GetY());
        $this->SetFont('Helvetica', '', 8); $this->SetTextColor(90, 107, 112);
        $this->Cell(0, 5, pt(shop('invoice_footer') . '  |  ' . shop('shop_name') . ' - ' . shop('address') . ', ' . shop('city') . ' - ' . shop('phone2')), 0, 1, 'C');
        $this->Cell(0, 4, pt('RCCM : ' . (shop('rccm') ?: '-') . '   NCC : ' . (shop('ncc') ?: '-') . '   Page ' . $this->PageNo()), 0, 0, 'C');
    }
}

/**
 * $doc = ['title','ref','date','valid_until'?,'customer'=>[name,email,phone,address],'items'=>[[desc,sub,qty,unit,total]],
 *         'subtotal','discount','shipping','tax','total','notes','status'?]
 */
function build_pdf(array $doc): string {
    $pdf = new SymoPdf('P', 'mm', 'A4'); $pdf->docTitle = $doc['title']; $pdf->SetMargins(14, 14, 14); $pdf->SetAutoPageBreak(true, 24); $pdf->AddPage();
    $pdf->SetFont('Helvetica', '', 9); $pdf->SetTextColor(60);
    $y = 36; $pdf->SetXY(14, $y); $pdf->SetFont('Helvetica', 'B', 9); $pdf->Cell(90, 5, pt(shop('shop_name')), 0, 1);
    $pdf->SetFont('Helvetica', '', 9);
    foreach (array_filter([shop('address') . ', ' . shop('city') . ', ' . shop('country'), 'Tel : ' . shop('phone') . ' / WhatsApp : ' . shop('phone2'), shop('email') ? 'E-mail : ' . shop('email') : '', shop('rccm') ? 'RCCM : ' . shop('rccm') : '', shop('ncc') ? 'NCC : ' . shop('ncc') : '']) as $l) { $pdf->SetX(14); $pdf->Cell(90, 4.6, pt($l), 0, 1); }
    $pdf->SetXY(120, $y); $pdf->SetFont('Helvetica', 'B', 10); $pdf->SetTextColor(31, 122, 140); $pdf->Cell(76, 5, pt('N° ' . $doc['ref']), 0, 1, 'R'); $pdf->SetFont('Helvetica', '', 9); $pdf->SetTextColor(60);
    $pdf->SetX(120); $pdf->Cell(76, 4.6, pt('Date : ' . $doc['date']), 0, 1, 'R'); if (!empty($doc['valid_until'])) { $pdf->SetX(120); $pdf->Cell(76, 4.6, pt('Valable jusqu\'au : ' . $doc['valid_until']), 0, 1, 'R'); }
    if (!empty($doc['status'])) { $pdf->SetX(120); $pdf->Cell(76, 4.6, pt('Statut : ' . $doc['status']), 0, 1, 'R'); }
    $pdf->SetY(max($pdf->GetY(), $y + 30) + 2); $pdf->SetFillColor(245, 245, 245); $pdf->SetFont('Helvetica', 'B', 9); $pdf->Cell(182, 6, pt('  Client'), 0, 1, 'L', true);
    $pdf->SetFont('Helvetica', '', 9); $c = $doc['customer'];
    foreach (array_filter([$c['name'] ?? '', $c['company'] ?? '', $c['phone'] ?? '', $c['email'] ?? '', $c['address'] ?? '']) as $l) { $pdf->Cell(182, 4.8, pt('  ' . $l), 0, 1); }
    $pdf->Ln(5);
    $pdf->SetFillColor(31, 122, 140); $pdf->SetTextColor(255); $pdf->SetFont('Helvetica', 'B', 9);
    $pdf->Cell(98, 7, pt('  Désignation'), 0, 0, 'L', true); $pdf->Cell(16, 7, pt('Qté'), 0, 0, 'C', true); $pdf->Cell(34, 7, pt('Prix unitaire'), 0, 0, 'R', true); $pdf->Cell(34, 7, pt('Total  '), 0, 1, 'R', true);
    $pdf->SetTextColor(40); $fill = false;
    foreach ($doc['items'] as [$desc, $sub, $qty, $unit, $tot]) {
        $pdf->SetFillColor(248, 248, 248); $x = 14; $y0 = $pdf->GetY();
        if ($y0 > 245) { $pdf->AddPage(); $y0 = $pdf->GetY(); }
        $pdf->SetFont('Helvetica', 'B', 9); $pdf->SetXY($x, $y0); $pdf->MultiCell(98, 5, pt('  ' . $desc), 0, 'L', $fill);
        if ($sub) { $pdf->SetFont('Helvetica', '', 8); $pdf->SetTextColor(100); $pdf->SetX($x); $pdf->MultiCell(98, 4, pt('  ' . $sub), 0, 'L', $fill); $pdf->SetTextColor(40); }
        $h = $pdf->GetY() - $y0; $pdf->SetFont('Helvetica', '', 9); $pdf->SetXY($x + 98, $y0);
        $pdf->Cell(16, $h, (string) $qty, 0, 0, 'C', $fill); $pdf->Cell(34, $h, pt(pmoney($unit)), 0, 0, 'R', $fill); $pdf->Cell(34, $h, pt(pmoney($tot) . '  '), 0, 1, 'R', $fill);
        $pdf->SetDrawColor(230, 230, 230); $pdf->Line(14, $pdf->GetY(), 196, $pdf->GetY()); $fill = !$fill;
    }
    $pdf->Ln(4); $row = function (string $l, string $v, bool $bold = false) use ($pdf) { $pdf->SetX(120); $pdf->SetFont('Helvetica', $bold ? 'B' : '', $bold ? 11 : 9); $pdf->Cell(40, $bold ? 8 : 5.5, pt($l), 0, 0, 'L'); $pdf->Cell(36, $bold ? 8 : 5.5, pt($v), 0, 1, 'R'); };
    $row('Sous-total', pmoney($doc['subtotal'])); if (!empty($doc['discount'])) $row('Remise', '- ' . pmoney($doc['discount'])); if (isset($doc['shipping']) && $doc['shipping'] !== null) $row('Livraison', $doc['shipping'] ? pmoney($doc['shipping']) : 'Gratuite');
    if (!empty($doc['tax'])) $row(($doc['tax_included'] ?? true ? 'dont ' : '') . shop('tax_label', 'TVA'), pmoney($doc['tax']));
    $pdf->SetDrawColor(244, 166, 42); $pdf->SetLineWidth(0.5); $pdf->Line(120, $pdf->GetY() + 1, 196, $pdf->GetY() + 1); $pdf->Ln(2); $pdf->SetTextColor(31, 122, 140); $row('TOTAL', pmoney($doc['total']), true); $pdf->SetTextColor(60);
    if (!empty($doc['notes'])) { $pdf->Ln(6); $pdf->SetFont('Helvetica', 'B', 9); $pdf->Cell(0, 5, pt('Notes et conditions'), 0, 1); $pdf->SetFont('Helvetica', '', 8.5); $pdf->MultiCell(182, 4.6, pt($doc['notes'])); }
    return $pdf->Output('S');
}
