// Minimal PDF assembler: one A4 page, two embedded TrueType fonts (WinAnsi), two indexed images.
// Works in node and in the browser. Usage: makePdf(A, kind, gender, name, email, title) -> Uint8Array
function makePdf(A, kind, gender, name, email, title) {
  const b64 = s => (typeof atob === 'function' ? Uint8Array.from(atob(s), c => c.charCodeAt(0)) : new Uint8Array(Buffer.from(s, 'base64')));
  const lat = s => { const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); u[i] = c < 256 ? c : 63; } return u; };
  const esc = s => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const content = A.tpl[kind][gender].replace('@@NAME@@', esc(name)).replace('@@EMAIL@@', esc(email || ''));
  const parts = []; const offs = []; let pos = 0;
  const push = u => { parts.push(u); pos += u.length; };
  const obj = (n, dict, stream) => {
    offs[n] = pos;
    if (stream) { push(lat(`${n} 0 obj\n${dict.replace('>>', `/Length ${stream.length}>>`)}\nstream\n`)); push(stream); push(lat('\nendstream\nendobj\n')); }
    else push(lat(`${n} 0 obj\n${dict}\nendobj\n`));
  };
  push(lat('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n'));
  const F = A.fonts, I = A.imgs;
  obj(1, '<</Type/Catalog/Pages 2 0 R>>');
  obj(2, '<</Type/Pages/Kids[3 0 R]/Count 1>>');
  obj(3, '<</Type/Page/Parent 2 0 R/MediaBox[0 0 595.2756 841.8898]/Resources<</Font<</R 5 0 R/B 8 0 R>>/XObject<</Icamp 11 0 R/Isocios 12 0 R>>>>/Contents 4 0 R>>');
  obj(4, '<<>>', lat(content));
  const font = (n, f, tag) => {
    const d = f.desc;
    obj(n, `<</Type/Font/Subtype/TrueType/BaseFont/${tag}/FirstChar 32/LastChar 255/Widths[${f.widths.join(' ')}]/Encoding/WinAnsiEncoding/FontDescriptor ${n + 1} 0 R>>`);
    obj(n + 1, `<</Type/FontDescriptor/FontName/${tag}/Flags 32/FontBBox[${d.bbox.join(' ')}]/ItalicAngle 0/Ascent ${d.ascent}/Descent ${d.descent}/CapHeight ${d.cap}/StemV 80/FontFile2 ${n + 2} 0 R>>`);
    const bytes = b64(f.b64);
    obj(n + 2, `<</Length1 ${bytes.length}>>`, bytes);
  };
  font(5, F.R, 'AAAAAA+Poppins-Regular');
  font(8, F.B, 'BBBBBB+Poppins-Bold');
  const img = (n, im) => obj(n, `<</Type/XObject/Subtype/Image/Width ${im.w}/Height ${im.h}/ColorSpace[/Indexed/DeviceRGB ${im.pal.length / 6 - 1}<${im.pal}>]/BitsPerComponent 8/Filter/FlateDecode>>`, b64(im.b64));
  img(11, I.camp); img(12, I.socios);
  const ti = (s) => { let h = 'FEFF'; for (const ch of s) h += ch.charCodeAt(0).toString(16).padStart(4, '0'); return `<${h}>`; };
  obj(13, `<</Title${ti(title)}/Author${ti('Tinta Digital')}>>`);
  const xref = pos; const N = 14;
  let x = `xref\n0 ${N}\n0000000000 65535 f \n`;
  for (let i = 1; i < N; i++) x += String(offs[i]).padStart(10, '0') + ' 00000 n \n';
  push(lat(x + `trailer\n<</Size ${N}/Root 1 0 R/Info 13 0 R>>\nstartxref\n${xref}\n%%EOF\n`));
  const out = new Uint8Array(pos); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
if (typeof module !== 'undefined') module.exports = makePdf;
