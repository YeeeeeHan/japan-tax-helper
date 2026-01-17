declare module 'heic-convert' {
  interface HeicConvertOptions {
    buffer: Buffer;
    format: 'JPEG' | 'PNG';
    quality?: number;
  }

  function heicConvert(options: HeicConvertOptions): Promise<Uint8Array>;

  export default heicConvert;
}
