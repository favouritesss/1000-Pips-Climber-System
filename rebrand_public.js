const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'backend', 'public');
const logoOld = 'storage/app/public/photos/QWZQ8mgyUgFVczreF5q8AwOURIBbqGZzNXeacfQe.png';
const logoNew = 'storage/app/public/photos/1chTY0mNnf6udZ3nuhSrZn38Ch1mh6VG9mWLK0il.png';

function getAllHtmlFiles(dir, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            if (file !== 'vendor' && file !== 'node_modules' && file !== '.git') {
                getAllHtmlFiles(filePath, fileList);
            }
        } else if (filePath.endsWith('.html')) {
            fileList.push(filePath);
        }
    });
    return fileList;
}

const htmlFiles = getAllHtmlFiles(publicDir);

const replacements = [
    { search: /Stock Exchange Investment/g, replace: '1000 Pips Climber System' },
    { search: /stockexchangeinvestment\.com/g, replace: '1000pipsclimbersystem.com' },
    { search: new RegExp(logoOld, 'g'), replace: logoNew }
];

htmlFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;
    replacements.forEach(r => {
        if (content.match(r.search)) {
            content = content.replace(r.search, r.replace);
            changed = true;
        }
    });
    if (changed) {
        fs.writeFileSync(file, content);
        console.log(`Updated: ${file}`);
    }
});
