import { promises as fs } from "fs";
import path from "path";

const CACHE_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), "cache");

export const initCache = async (): Promise<void> => {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch (error) {
    console.error("Failed to initialize cache directory:", error);
  }
};

const getCacheFilePath = (key: string): string => {
  return path.join(CACHE_DIR, `${key}.json`);
};

export const getCachedData = async (key: string): Promise<any | null> => {
  const filePath = getCacheFilePath(key);
  try {
    const data = await fs.readFile(filePath, "utf-8");
    console.log("Cache hit for key:", key); // Log cache hit
    return JSON.parse(data);
  } catch {
    return null;
  }
};

export const saveToCache = async (key: string, data: any): Promise<void> => {
  const filePath = getCacheFilePath(key);
  try {
    await fs.writeFile(filePath, JSON.stringify(data), "utf-8");
  } catch (error) {
    console.error("Failed to save data to cache:", error);
  }
};
