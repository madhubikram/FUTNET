// @ts-nocheck
/* eslint-disable */
const fs = require('fs');
const path = require('path');

// Create the public directory if it doesn't exist
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}

// Copy Leaflet marker icons
const leafletPath = path.join(__dirname, '..', 'node_modules', 'leaflet', 'dist', 'images');
const files = [
  'marker-icon.png',
  'marker-icon-2x.png',
  'marker-shadow.png'
];

files.forEach(file => {
  fs.copyFileSync(
    path.join(leafletPath, file),
    path.join(publicDir, file)
  );
});

// Scripts to copy essential assets from node_modules to public folder
const sources = [
  {
    src: path.resolve(__dirname, '../node_modules/jquery-bracket/dist/jquery.bracket.min.js'),
    dest: path.resolve(__dirname, '../public/assets/jquery.bracket.min.js')
  },
  {
    src: path.resolve(__dirname, '../node_modules/jquery-bracket/dist/jquery.bracket.min.css'),
    dest: path.resolve(__dirname, '../public/assets/jquery.bracket.min.css')
  }
];

// Ensure directory exists
const assetsDir = path.resolve(__dirname, '../public/assets');
if (!fs.existsSync(assetsDir)) {
  console.log('Creating assets directory...');
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Copy each file
sources.forEach(({ src, dest }) => {
  try {
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log(`✓ Copied ${path.basename(src)} to public/assets/`);
    } else {
      console.error(`✗ Source file not found: ${src}`);
    }
  } catch (error) {
    console.error(`✗ Error copying ${src}:`, error.message);
  }
});

console.log('Assets copied successfully!');