const fs = require('fs');
const path = require('path');

const inputPath = process.argv[2] || path.join(__dirname, '../data/product-categories(in).csv');
const outputPath = process.argv[3] || path.join(__dirname, '../data/categories.csv');

const raw = fs.readFileSync(inputPath, 'utf-8');
const lines = raw.split(/\r?\n/).filter((line) => line.trim() !== '');

const [headerLine, ...dataLines] = lines;
const cleanHeader = headerLine.replace(/;+$/, '');

const cleanLines = dataLines.map((line) => {
  let cleaned = line.replace(/\r?\n$/, '').replace(/;+$/, '');
  cleaned = cleaned.replace(/^"/, '').replace(/"$/, '');
  cleaned = cleaned.replace(/\s*"?\s*;\s*"?\s*/g, ', ');
  cleaned = cleaned.split('""').join('"');
  return cleaned;
});

fs.writeFileSync(outputPath, [cleanHeader, ...cleanLines].join('\n'), 'utf-8');
console.log(`Wrote ${cleanLines.length} data rows to ${outputPath}`);
