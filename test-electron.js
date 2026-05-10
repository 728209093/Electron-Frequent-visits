const { app } = require('electron');
console.log('app:', typeof app);
console.log('process.type:', process.type);
console.log('ELECTRON_RUN_AS_NODE exists:', 'ELECTRON_RUN_AS_NODE' in process.env);
