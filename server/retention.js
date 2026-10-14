// Keep the current recovery copy, the two most recent snapshots and at least
// six complete months. History, active state and transfers are never selected.
export function redundantSnapshots(entries,currentPath,date) {
  const d=new Date(date),before=Date.UTC(d.getUTCFullYear(),d.getUTCMonth()-6,1);
  const snapshots=entries.filter(file=>/^moagem\/snapshots\/[a-f0-9]{64}\.json$/.test(file.pathname) && Number.isFinite(Date.parse(file.uploadedAt))).sort((a,b)=>Date.parse(b.uploadedAt)-Date.parse(a.uploadedAt));
  const keep=new Set([currentPath,...snapshots.slice(0,2).map(file=>file.pathname)]);
  return snapshots.filter(file=>!keep.has(file.pathname) && Date.parse(file.uploadedAt)<before);
}
