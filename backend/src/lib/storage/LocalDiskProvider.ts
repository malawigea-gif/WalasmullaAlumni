import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { env } from "../../config/env";
import { StorageProvider, UploadedFile } from "./StorageProvider";

export class LocalDiskProvider implements StorageProvider {
  async save(file: UploadedFile): Promise<string> {
    const dir = path.join(process.cwd(), env.uploadDir);
    await fs.mkdir(dir, { recursive: true });
    const filename = `${uuidv4()}${path.extname(file.originalName)}`;
    await fs.writeFile(path.join(dir, filename), file.buffer);
    return `/uploads/${filename}`;
  }
}
