//During the test the env variable is set to private
process.env.NODE_CONFIG_DIR = './test/config';
process.env.NODE_ENV = 'test';

//Require the dev-dependencies
const debug = require('debug')('campsi:test');
const chai = require('chai');
const chaiHttp = require('chai-http');
const CampsiServer = require('campsi');
const config = require('config');
const {MongoClient} = require('mongodb');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const rimraf = require('rimraf');

let campsi;

chai.use(chaiHttp);
chai.should();

const services = {
    Assets: require('../lib'),
};

// Helpers
function createAsset(source) {
    return new Promise(function (resolve, reject) {

        const localStorage = campsi.services.get('assets').config.options.storages.local;
        const filename = path.basename(source);
        const stats = fs.statSync(source);

        let file = {
            fieldName: 'file',
            originalName: filename,
            clientReportedMimeType : mime.lookup(source),
            clientReportedFileExtension: path.extname(source),
            path: '',
            size: stats.size,
            detectedMimeType: mime.lookup(source),
            detectedFileExtension: path.extname(source),
            createdAt: new Date().getTime(),
            createdFrom: {
                origin: null,
                referer: null,
                ua: 'local'
            },
            storage: 'local',
            destination: {
                rel: '',
                abs: ''
            },
            url: ''
        };

        localStorage.destination().then((destination) => {
            file.destination = destination;
            file.path = path.join(file.destination.abs, filename);
            file.url = localStorage.options.baseUrl + '/local/' + file.destination.rel + '/' + filename;

            fs.writeFileSync(file.path, fs.readFileSync(source));

            campsi.db.collection('__assets__').insertOne(file)
                .then((result) => {
                    resolve({
                        id: result.insertedId.toString(),
                        path: '/local/' + file.destination.rel + '/' + filename
                    });
                }).catch((err) => reject(err));
        });
    });
}

describe('Assets API', () => {
    beforeEach((done) => {

        // Empty the database
        MongoClient.connect(config.campsi.mongoURI).then((db) => {
            db.dropDatabase(() => {
                db.close();
                campsi = new CampsiServer(config.campsi);
                campsi.mount('assets', new services.Assets(config.services.assets));

                campsi.on('ready', () => {
                    done();
                });

                // Empty the data folder
                const localStorage = campsi.services.get('assets').config.options.storages.local;
                rimraf.sync(localStorage.dataPath + '/*');

                campsi.start()
                    .catch((err) => {
                        debug('Error: %s', err);
                    });
            });
        });
    });
    /*
     * Test the /GET / route
     */
    describe('/GET /', () => {
        it('it should return a list of assets', (done) => {
            chai.request(campsi.app)
                .get('/assets')
                .end((err, res) => {
                    res.should.have.status(200);
                    res.should.be.json;
                    res.body.should.be.an('object');
                    res.body.should.have.property('count');
                    res.body.count.should.be.eq(0);
                    res.body.should.have.property('hasNext');
                    res.body.hasNext.should.be.eq(false);
                    res.body.should.have.property('assets');
                    res.body.assets.should.be.an('array');
                    res.body.assets.length.should.be.eq(0);
                    done();
                });
        });
    });
    /*
     * Test the /POST / route
     */
    describe('/POST /', () => {
        it('it should return ids of uploaded files', (done) => {
            chai.request(campsi.app)
                .post('/assets')
                .attach('file', fs.readFileSync('./test/rsrc/logo_agilitation.png'), 'logo_agilitation.png')
                .end((err, res) => {
                    res.should.have.status(200);
                    res.should.be.json;
                    done();
                });
        });
    });
    /*
     * Test the /GET /local route
     */
    describe('/GET /local', () => {
        it('it should return local asset', (done) => {
            createAsset('./test/rsrc/logo_agilitation.png')
                .then((asset) => {
                    chai.request(campsi.app)
                        .get('/assets' + asset.path)
                        .end((err, res) => {
                            res.should.have.status(200);
                            res.should.have.header('content-type', 'image/png');
                            res.should.have.header ('content-length', 78695);
                            res.body.length.should.be.eq(78695);
                            done();
                        });
                });
        });
    });
    /*
     * Test the /GET /:asset/metadata route
     */
    describe('/GET /:asset/metadata', () => {
        it('it should return the asset metadata', (done) => {
            createAsset('./test/rsrc/logo_agilitation.png')
                .then((asset) => {
                    chai.request(campsi.app)
                        .get('/assets/' + asset.id + '/metadata')
                        .end((err, res) => {
                            res.should.have.status(200);
                            res.should.be.json;
                            // TODO test metadata
                            done();
                        });
                });
        });
    });
    /*
     * Test the /DELETE /:asset route
     */
    describe('/DELETE /:asset', () => {
        it('it should return the asset metadata', (done) => {
            createAsset('./test/rsrc/logo_agilitation.png')
                .then((asset) => {
                    chai.request(campsi.app)
                        .delete('/assets/' + asset.id)
                        .end((err, res) => {
                            res.should.have.status(200);
                            res.should.be.json;
                            // TODO test deletion and return
                            done();
                        });
                });
        });
    });
});
