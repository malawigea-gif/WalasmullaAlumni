export interface UploadedFile {
  buffer: Buffer;
  originalName: string;
  mimetype: string;
}

export interface StorageProvider {
  save(file: UploadedFile): Promise<string>;
}
