import { get, put, list, del, head } from '@vercel/blob';
import { redundantSnapshots } from './retention.js';

export function blobFiles() {
  const options={access:'private',addRandomSuffix:false,contentType:'application/json',cacheControlMaxAge:60};
  async function read(path) {
    const result=await get(path,{access:'private',useCache:false});
    // The delivery response can prefix the Blob revision with W/ when HTTP
    // compression is used. The storage API uses the same revision without
    // that delivery marker for conditional writes (verified against head()).
    return result?.statusCode===200?{text:await new Response(result.stream).text(),etag:result.blob.etag.replace(/^W\//,'')}:null;
  }
  return {
    read,
    async immutable(path,text) {
      if(await read(path)) return;
      try { await put(path,text,options); }
      catch(error) {if(!(await read(path)))throw error;}
    },
    async compareAndSet(path,text,etag) {
      return put(path,text,{...options,...(etag?{ifMatch:etag,allowOverwrite:true}:{allowOverwrite:false})});
    },
    async pruneSnapshots(currentPath,date) {
      const entries=[];let cursor;
      do {const result=await list({prefix:'moagem/snapshots/',cursor});entries.push(...result.blobs);cursor=result.hasMore?result.cursor:null;}while(cursor);
      let removed=0;
      for(const file of redundantSnapshots(entries,currentPath,date)) {
        const metadata=await head(file.pathname);
        await del(file.pathname,{ifMatch:metadata.etag});removed++;
      }
      return removed;
    },
  };
}
