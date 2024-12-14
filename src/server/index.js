const Hapi = require('@hapi/hapi');
require('dotenv').config();
const routes = require('./routes');
// const loadModel = require('../services/loadModel');
const init = async () => {
    const server = Hapi.server({
        port: 3000,
        host: 'localhost',
        routes: {
            cors: {
              origin: ['*'],
            },
        },
    });
    // const model = await loadModel()
    // server.app.model = model;
    await server.start();
    server.route(routes); 
    console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {
    console.error(err);
    process.exit(1);
});

init();