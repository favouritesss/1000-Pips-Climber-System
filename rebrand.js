const fs = require('fs');
const path = require('path');

const frontendDir = path.join(__dirname, 'frontend');

function getAllHtmlFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            if (file !== 'vendor' && file !== 'temp') {
                getAllHtmlFiles(filePath, fileList);
            }
        } else if (filePath.endsWith('.html')) {
            fileList.push(filePath);
        }
    });
    return fileList;
}

const htmlFiles = getAllHtmlFiles(frontendDir);

const replacements = [
    { search: /Stock Exchange Investment/g, replace: '1000 Pips Climber System' },
    { search: /\.\.\/unpkg\.com\//g, replace: 'vendor/unpkg.com/' },
    { search: /\.\.\/cdn\.jsdelivr\.net\//g, replace: 'vendor/cdn.jsdelivr.net/' },
    { search: /\.\.\/cdnjs\.cloudflare\.com\//g, replace: 'vendor/cdnjs.cloudflare.com/' },
    { search: /\.\.\/code\.jquery\.com\//g, replace: 'vendor/code.jquery.com/' },
    { search: /\.\.\/s3\.tradingview\.com\//g, replace: 'vendor/s3.tradingview.com/' },
    { search: /\.\.\/translate\.google\.com\//g, replace: 'vendor/translate.google.com/' },
    { search: /\.\.\/cdn\.gtranslate\.net\//g, replace: 'vendor/cdn.gtranslate.net/' },
    // Update domain-like strings if any
    { search: /stockexchangeinvestment\.com/g, replace: '1000pipsclimbersystem.com' }
];

htmlFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    replacements.forEach(r => {
        content = content.replace(r.search, r.replace);
    });
    fs.writeFileSync(file, content);
    console.log(`Processed: ${file}`);
});
