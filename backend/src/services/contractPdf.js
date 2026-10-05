function pdfDate(value) {
  if (value instanceof Date) {
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${value.getFullYear()}-${month}-${day}`;
  }
  return String(value ?? '').slice(0, 10);
}
function esc(value) {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

// one-page rider stamp. ascii only so the length math stays honest
function buildRiderPdf(contract) {
  const dollars = (cents) => `$${(Number(cents) / 100).toFixed(2)}`;
  const lines = [
    'SynthPass Digital Replica Rider',
    'California AB 2602 / SAG-AFTRA Commercials Contract',
    'This tool is not legal advice.',
    `Contract: ${contract.id}`,
    `Shoot: ${contract.shoot_id}`,
    `Performer: ${contract.performer_name} <${contract.performer_email}>`,
    `Agent: ${contract.agent_email || 'none'}`,
    `Union: ${contract.union_status}   Replica: ${contract.replica_type}`,
    `Media: ${(contract.permitted_media || []).join(', ')}`,
    `Territory: ${(contract.geographic_territory || []).join(', ')}`,
    `Use: ${contract.intended_use_description}`,
    `Excluded: ${(contract.exclusionary_clauses || []).join(', ')}`,
    `Term: ${pdfDate(contract.starts_at)} to ${pdfDate(contract.expires_at)}`,
    `Notice sent: ${contract.advance_notice_given_at || 'n/a'}`,
    `Base scale: ${dollars(contract.base_scale_rate_cents)}`,
    `Replica multiplier: ${contract.replica_multiplier}x`,
    `Session fee: ${dollars(contract.total_session_fee_cents)}`,
    `Pension and health (21%): ${dollars(contract.pension_health_cents)}`,
    `Signed by: ${contract.typed_name}`,
    `Signed at: ${contract.signed_at}`,
    `Signature hash: ${contract.performer_signature_hash}`,
    `Signer IP: ${contract.signer_ip || ''}`,
  ];
  const content = lines
    .map((line, i) => `BT /F1 11 Tf 48 ${760 - i * 22} Td (${esc(line.slice(0, 110))}) Tj ET`)
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

module.exports = { buildRiderPdf };
