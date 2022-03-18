import fs from 'fs'
import fsPromises from "fs/promises";
import { join, extname } from 'path';
import config from './config.js';


const {
  dir: {
    publicDirectory
  }
} = config
export class Service {
  createFileStream(filename) {
    return fs.createReadStream(filename);
  }

  async getFileInfo(file) {
    const fullFilePath = join(publicDirectory, file);
    await fsPromises.access(fullFilePath)
    const fileType = extname(fullFilePath)

    return {
      type: fileType,
      name: fullFilePath
    };
  }

  async getFileStream(filename) {
    const {
      name,
      type
    } = await this.getFileInfo(filename);
    return {
      stream: this.createFileStream(name),
      type
    }
  }
}