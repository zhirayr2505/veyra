import archiver from 'archiver';

// Excel XML forbids these control characters in user-supplied text.
// eslint-disable-next-line no-control-regex
const xml=value=>String(value??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
function column(n){let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;}
// Inline string cells cannot become spreadsheet formulas, including leading '=' values.
export async function writeXLSX(rows,res){
 const archive=archiver('zip',{zlib:{level:6}});archive.on('error',e=>res.destroy(e));res.on('close',()=>archive.abort());archive.pipe(res);
 const append=(name,content)=>archive.append(content,{name});
 append('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>');
 append('_rels/.rels','<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
 append('xl/workbook.xml','<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="VEYRA" sheetId="1" r:id="rId1"/></sheets></workbook>');
 append('xl/_rels/workbook.xml.rels','<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>');
 const headers=Object.keys(rows[0]||{result:''}),values=[headers,...rows.map(row=>headers.map(k=>row[k]))];
 const body=values.map((row,i)=>`<row r="${i+1}">${row.map((v,j)=>`<c r="${column(j)}${i+1}" t="inlineStr"><is><t xml:space="preserve">${xml(v instanceof Date?v.toISOString():typeof v==='object'&&v!==null?JSON.stringify(v):v)}</t></is></c>`).join('')}</row>`).join('');
 append('xl/worksheets/sheet1.xml',`<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" state="frozen"/></sheetView></sheetViews><sheetData>${body}</sheetData></worksheet>`);
 await archive.finalize();
}
