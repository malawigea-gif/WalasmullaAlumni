import { env } from "../../config/env";
import { LocalDiskProvider } from "./LocalDiskProvider";
import { StorageProvider } from "./StorageProvider";

function createStorageProvider(): StorageProvider {
  switch (env.storageDriver) {
    case "local":
      return new LocalDiskProvider();
    default:
      throw new Error(`Unsupported STORAGE_DRIVER: ${env.storageDriver}`);
  }
}

export const storageProvider = createStorageProvider();
export type { StorageProvider, UploadedFile } from "./StorageProvider";
