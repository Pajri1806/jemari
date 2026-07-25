import { readdirSync, writeFileSync } from 'fs';

const assetsDir = 'dist/client/assets';
const files = readdirSync(assetsDir);

const cssFile = files.find(f => f.startsWith('styles-') && f.endsWith('.css'));
const jsFiles = files.filter(f => f.endsWith('.js') && !f.startsWith('start-') && !f.startsWith('empty-'));

// Cari main entry (biasanya index-<hash>.js, yang paling besar)
const mainJs = jsFiles.reduce((a, b) => {
  // Prefer "index-" yang paling besar
  const aIsIndex = a.startsWith('index-');
  const bIsIndex = b.startsWith('index-');
  if (aIsIndex && !bIsIndex) return a;
  if (!aIsIndex && bIsIndex) return b;
  return a;
}, jsFiles[0]);

console.log('CSS:', cssFile);
console.log('Main JS:', mainJs);
console.log('All JS:', jsFiles);

const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Jemari — Hand Gesture Recognition</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="stylesheet" href="/assets/${cssFile}" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/assets/${mainJs}"></script>
  </body>
</html>
`;

writeFileSync('dist/client/index.html', html);
console.log('✅ dist/client/index.html generated');
