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

let campsi;

chai.use(chaiHttp);
chai.should();

const services = {
    Assets: require('../lib'),
};

describe('Assets API', () => {
    beforeEach((done) => {
        //Before each test we empty the database
        MongoClient.connect(config.campsi.mongoURI).then((db) => {
            db.dropDatabase(() => {
                db.close();
                campsi = new CampsiServer(config.campsi);
                campsi.mount('assets', new services.Assets(config.services.assets));

                campsi.on('ready', () => {
                    done();
                });

                campsi.start()
                    .catch((err) => {
                        debug('Error: %s', err);
                    });
            });
        });
    });
    /*
     * Test the /GET providers route
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
});
