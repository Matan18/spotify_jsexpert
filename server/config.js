import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const currentDir = dirname(fileURLToPath(import.meta.url))
const root = join(currentDir, '../')
const audioDirectory = join(root, 'audio')
const publicDirectory = join(root, 'public')
const songsDirectory = join(audioDirectory, 'songs')
const fxDirectory = join(audioDirectory, 'fx')

export default {
  port: process.env.PORT || 3000,
  dir: {
    root,
    fxDirectory,
    audioDirectory,
    songsDirectory,
    publicDirectory,
  },
  pages: {
    homeHTML: 'home/index.html',
    controllerHTML: 'controller/index.html',
  },
  location: {
    home: '/home'
  },
  contants: {
    CONTENT_TYPE: {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'text/javascript',
    },
    audioMediaType: 'mp3',
    songVolume: '0.99',
    fallbackBitRate: '128000',
    englishConversation: join(songsDirectory, 'conversation.mp3'),
    bitRateDivisor: 8,
    fxVolume: '0.1'
  }
}
