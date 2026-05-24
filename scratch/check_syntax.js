const fs = require('fs');
const filePath = '/Users/admin/01_Projects/Microservice/report/project_report.html';
const html = fs.readFileSync(filePath, 'utf8');

const regex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
let match;
let count = 0;
while ((match = regex.exec(html)) !== null) {
    const scriptContent = match[1];
    const scriptType = match[0].match(/type="([^"]+)"/);
    if (scriptType && scriptType[1] === 'text/markdown') {
        continue;
    }
    count++;
    try {
        const vm = require('vm');
        new vm.Script(scriptContent);
        console.log(`Script block ${count} is syntactically correct.`);
    } catch (e) {
        console.error(`Error in script block ${count}:`, e);
    }
}
