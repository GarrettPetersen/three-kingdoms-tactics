const fs = require('fs');
const code = fs.readFileSync('src/scenes/TacticsScene.js', 'utf8');
let balance = 0;
let inString = false;
let quoteChar = '';
let inComment = false;
let inMultiComment = false;

const lines = code.split('\n');
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    inComment = false;
    for (let j = 0; j < line.length; j++) {
        const char = line[j];
        const nextChar = line[j+1];

        if (inMultiComment) {
            if (char === '*' && nextChar === '/') {
                inMultiComment = false;
                j++;
            }
            continue;
        }
        if (inComment) continue;
        if (inString) {
            if (char === '\\') { j++; continue; }
            if (char === quoteChar) inString = false;
            continue;
        }

        if (char === '/' && nextChar === '/') { inComment = true; continue; }
        if (char === '/' && nextChar === '*') { inMultiComment = true; j++; continue; }
        if (char === '"' || char === "'" || char === '`') { inString = true; quoteChar = char; continue; }

        if (char === '{') {
            balance++;
        } else if (char === '}') {
            balance--;
            if (balance === 0) {
                console.log(`Balance hit 0 at line ${i+1}: ${line.trim()}`);
            }
            if (balance < 0) {
                console.log(`EXTRA CLOSING BRACE at line ${i+1}: ${line.trim()}`);
                process.exit(1);
            }
        }
    }
    // console.log(`Line ${i+1} balance ${balance}`);
}
console.log(`Final balance: ${balance}`);
if (balance > 0) {
    console.log(`MISSING ${balance} CLOSING BRACES`);
}

