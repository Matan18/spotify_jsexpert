import fs from 'fs'
import fsPromises from "fs/promises";
import { randomUUID } from 'crypto';
import path, { join, extname } from 'path';
import { PassThrough, Writable } from 'stream'
import config from './config.js';
import Throttle from "throttle";
import { once } from 'events';
import childProcess from 'child_process';
import { logger } from './util.js';
import streamsPromises from 'stream/promises';

const {
  dir: {
    publicDirectory,
    fxDirectory,
  },
  contants: {
    fallbackBitRate,
    englishConversation,
    bitRateDivisor,
    audioMediaType,
    songVolume,
    fxVolume
  }
} = config
export class Service {
  constructor() {
    this.clientStreams = new Map();
    this.currentSong = englishConversation;
    this.currentBitRate = 0;
    this.throttleTransform = {};
    this.currentReadable = {};
  }

  createClientStream() {
    const id = randomUUID();
    const clientStreams = new PassThrough();
    this.clientStreams.set(id, clientStreams);
    return {
      id,
      clientStreams
    }
  }

  removeClientStream(id) {
    this.clientStreams.delete(id);
  }

  _executeSoxCommand(args) {
    return childProcess.spawn('sox', args)
  }

  async getBitRate(song) {
    try {
      const args = [
        '--i',
        '-B',
        song
      ];
      const {
        stderr,
        stdout,
        // stdin
      } = this._executeSoxCommand(args);

      await Promise.all([
        once(stdout, 'readable'),
        once(stderr, 'readable')
      ])

      const [success, error] = [stdout, stderr].map(stream => stream.read());
      if (error) return await Promise.reject(error);
      return success.toString().trim().replace(/k/, '000');
    } catch (error) {
      logger.error(`deu ruim no bitrate: ${error}`)
      return fallbackBitRate;
    }
  }

  broadCast() {
    return new Writable({
      write: (chunk, enc, cb) => {
        for (const [id, stream] of this.clientStreams) {
          if (stream.writableEnded) {
            this.clientStreams.delete(id);
            continue;
          }

          stream.write(chunk);
        }

        cb();
      }
    })
  }

  async startStream() {
    logger.info(`starting with ${this.currentSong}`);
    const bitRate = this.currentBitRate = (await this.getBitRate(this.currentSong) / bitRateDivisor);
    const throttleTransform = this.throttleTransform = new Throttle(bitRate);
    const songReadable = this.currentReadable = this.createFileStream(this.currentSong)
    streamsPromises.pipeline(
      songReadable,
      throttleTransform,
      this.broadCast()
    )
  }

  stopStream() {
    this.throttleTransform?.end?.();
  }

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

  async readFxByName(fxName) {
    const songs = await fsPromises.readdir(fxDirectory);
    const chosenSong = songs
      .find(filename => filename.toLowerCase().includes(fxName));
    if (!chosenSong)
      return Promise.reject(`the song ${fxName} wasn't found`)
    return join(fxDirectory, chosenSong);
  }


  appendFxStream(fx) {
    const throttleTransformable = new Throttle(this.currentBitRate);
    streamsPromises.pipeline(
      throttleTransformable,
      this.broadCast()
    )

    const unpipe = () => {
      const transformStream = this.mergeAudioStreams(fx, this.currentReadable);
      this.throttleTransform = throttleTransformable;
      this.currentReadable = transformStream;

      this.currentReadable.removeListener('unpip', unpipe);

      streamsPromises.pipeline(
        transformStream,
        throttleTransformable
      )
    }

    this.throttleTransform.on('unpipe', unpipe);

    this.throttleTransform.pause();

    this.currentReadable.unpipe(this.throttleTransform);
  }

  mergeAudioStreams(song, readable) {
    const transformStream = PassThrough();
    const args = [
      '-t', audioMediaType,
      '-v', songVolume,
      '-m', '-',
      '-t', audioMediaType,
      '-v', fxVolume,
      song,
      '-t', audioMediaType,
      '-'
    ]

    const {
      stdin,
      stdout
    } = this._executeSoxCommand(args);

    streamsPromises.pipeline(
      readable,
      stdin
    )
    // .catch(error => logger.error(`error on sending stream to sox: ${error}`));

    streamsPromises.pipeline(
      stdout,
      transformStream
    )
    // .catch(error => logger.error(`error on receiving stream to sox: ${error}`));

    return transformStream;
  }
}