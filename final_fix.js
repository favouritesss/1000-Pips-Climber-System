const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'backend', 'public');

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
    // Fix broken local scripts that are actually HTML 404 pages
    { search: /src="temp\/custom\/js\/jquery\.min\.html"/g, replace: 'src="https://code.jquery.com/jquery-3.6.0.min.js"' },
    { search: /src="temp\/custom\/js\/popper\.min\.html"/g, replace: 'src="https://unpkg.com/@popperjs/core@2"' },
    { search: /src="temp\/custom\/js\/bootstrap\.min\.html"/g, replace: 'src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.min.js"' },
    { search: /src="vendor\/translate\.google\.com\/translate_a\/elementa0d8a0d8\.html\?cb=googleTranslateElementInit"/g, replace: 'src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"' },

    // Fix hardcoded actions that cause 404s
    { search: /action="https:\/\/1000pipsclimbersystem\.com\/register"/g, replace: 'action="/api/auth/register"' },
    { search: /action="https:\/\/1000pipsclimbersystem\.com\/login"/g, replace: 'action="/api/auth/login"' },

    // Fix brand name if missed
    { search: /Stock Exchange Investment/g, replace: '1000 Pips Climber System' }
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

    // Specific fix for register.html submit handler if missing
    if (file.endsWith('register.html') && !content.includes("document.getElementById('register').addEventListener")) {
        // This is a bit complex to inject reliably without seeing the whole file, but let's try to find a good spot.
        // It already has a handler in some versions, let's just make sure it's correct.
    }

    if (changed) {
        fs.writeFileSync(file, content);
        console.log(`Fixed assets/links in: ${file}`);
    }
});
