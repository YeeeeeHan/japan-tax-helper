declare module 'heic2any' {
  interface Heic2anyOptions {
    blob: Blob;
    toType?: 'image/jpeg' | 'image/png' | 'image/gif';
    quality?: number;
    multiple?: boolean;
  }

  function heic2any(options: Heic2anyOptions): Promise<Blob | Blob[]>;

  export default heic2any;
}
