import { renderToString } from 'react-dom/server';
import App from './App.tsx';
import fs from 'fs';
import path from 'path';

export function render() {
  const appHtml = renderToString(<App />);

  const template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');

  const html = template.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);

  return html;
}
