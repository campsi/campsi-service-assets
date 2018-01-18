const path = require('path');
const LocalAssetStorage = require('../../lib/storages/local');
const host = 'http://localhost:3000';
const storageProviders = {
    local: new LocalAssetStorage({
        name: 'local',
        title: 'Serveur',
        dataPath: path.join(__dirname, '..', 'data'),
        baseUrl: host + '/assets'
    })
};

module.exports = {
    port: 3000,
    host: host,
    title: 'Test Assets',
    campsi: {
        mongo: {
            host: 'localhost',
            port: 27017,
            database: 'relationships'
        }
    },
    services: {
        assets: {
            title: 'Médias',
            kind: 'assets',
            namespace: 'test-ns',
            options: {
                roles: ['public', 'admin'],
                order: ['local'],
                fallback: 'local',
                //todo copy / backup
                getStorage: () => storageProviders.local,
                storages: storageProviders
            }
        }
    }
};
