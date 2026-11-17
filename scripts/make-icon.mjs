import sharp from 'sharp';
import fs from 'fs';
import { symbol } from '../src/logo.js';

fs.mkdirSync('assets', { recursive: true });
const wrap = (inner, bg) => Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${bg}${inner}</svg>`);
const grad = '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#17857a"/><stop offset="1" stop-color="#052a27"/></linearGradient></defs><rect width="1024" height="1024" fill="url(#g)"/>';
const small = `<g transform="translate(512 512) scale(.72) translate(-512 -512)">${symbol}</g>`;

await sharp(wrap(symbol, grad)).png().toFile('assets/icon-only.png');
await sharp(wrap(small, '')).png().toFile('assets/icon-foreground.png');
await sharp(wrap('', '<rect width="1024" height="1024" fill="#0b4a45"/>')).png().toFile('assets/icon-background.png');
console.log('icons ready');
