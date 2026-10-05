function esc(value) {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildClearanceCertificate({ workspaceName, report }) {
  const lines = [
    'SynthPass Broadcast Clearance Certificate',
    workspaceName || 'Workspace',
    `Issued: ${new Date().toISOString().slice(0, 10)}`,
    `Status: ${report.green ? 'CLEARED' : 'NOT CLEARED'}`,
    `Red ${report.counts.red}   Amber ${report.counts.amber}   Yellow ${report.counts.yellow}`,
    '--- Red ---',
    ...(report.red.length ? report.red.map((r) => `${r.title}: ${r.reason}`) : ['None']),
    '--- Amber ---',
    ...(report.amber.length ? report.amber.map((r) => r.reason) : ['None']),
    '--- Yellow ---',
    ...(report.yellow.length ? report.yellow.map((r) => `${r.title}: ${r.reason}`) : ['None']),
    'This certificate is generated from live workspace clearance rules.',
    'It is not legal advice.',
  ];
  const content = lines
    .map((line, i) => `BT /F1 11 Tf 48 ${760 - i * 20} Td (${esc(String(line).slice(0, 110))}) Tj ET`)
    .join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((off) => { pdf += `${String(off).padStart(10, '0')} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, 'utf8');
}

module.exports = { buildClearanceCertificate };
