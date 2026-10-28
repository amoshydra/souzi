import { registerPlugin } from "@capacitor/core";

export type NativeDownloadStatus =
  | "pending"
  | "waiting"
  | "running"
  | "paused"
  | "successful"
  | "failed"
  | "unknown";

export interface NativeDownloadProgress {
  id: number;
  status: NativeDownloadStatus;
  bytesDownloaded: number;
  totalBytes: number;
  reason: number;
  localUri: string;
}

export interface NativeDownloadedFile {
  data: string;
  fileName: string;
  size: number;
}

export interface NativeDictionaryDownloaderPlugin {
  enqueue(options: {
    url: string;
    fileName: string;
    wifiOnly: boolean;
  }): Promise<{ id: number }>;
  status(options: { id: number }): Promise<NativeDownloadProgress>;
  pause(options: { id: number }): Promise<void>;
  resume(options: { id: number }): Promise<void>;
  setWifiOnly(options: { id: number; wifiOnly: boolean }): Promise<void>;
  cancel(options: { id: number }): Promise<void>;
  readFile(options: { id: number }): Promise<NativeDownloadedFile>;
}

/**
 * Native Android DownloadManager bridge. Only call this on Capacitor native
 * platforms; the web build uses the browser file picker instead.
 */
export const NativeDictionaryDownloader =
  registerPlugin<NativeDictionaryDownloaderPlugin>("DictionaryDownloader");
