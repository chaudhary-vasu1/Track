const fs = require('fs');
const file = 'sockets/index.js';
let code = fs.readFileSync(file, 'utf8');
const helpers = `
const getDeviceRoom = (id) => (id && id.startsWith('device_')) ? id : \`device_\${id}\`;
const getParentRoom = (id) => (id && id.startsWith('parent_')) ? id : \`parent_\${id}\`;
`;
// Insert helpers after requires
code = code.replace(/const \{ generateAlertByDevice \} = require\('\.\.\/services\/alert\.service'\);/, "const { generateAlertByDevice } = require('../services/alert.service');\n" + helpers);
code = code.replace(/`device_\$\{([^}]+)\}`/g, 'getDeviceRoom($1)');
code = code.replace(/`parent_\$\{([^}]+)\}`/g, 'getParentRoom($1)');
fs.writeFileSync(file, code);
console.log('Fixed room names');
