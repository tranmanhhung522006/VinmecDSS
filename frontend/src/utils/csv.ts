/** Escape spreadsheet cells defensively to prevent CSV formula execution. */
export function csvCell(input:unknown):string {
  const value=String(input??'');
  const safe=/^[\s]*[=+@-]/.test(value)?"'"+value:value;
  return '"'+safe.replace(/"/g,'""')+'"';
}
export function downloadCsv(filename:string,rows:unknown[][]):void {
  const content='\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';
  const blob=new Blob([content],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
