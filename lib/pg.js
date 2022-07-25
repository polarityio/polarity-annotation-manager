const { Client } = require('pg');

class PGClient{
    constructor(configPath){
        const config = require(configPath);
        this.client = new Client({
            user: config.polarity.postgres.user,
            host: config.polarity.postgres.host,
            database: config.polarity.postgres.database,
            password: config.polarity.postgres.password,
            port: config.polarity.postgres.port
        });
    }

    async getAnnotationsToDelete(channelId){
        const query = `SELECT id, doi_end, channel_id FROM polarity.tag_entity WHERE doi_end < NOW() AND channel_id=$1`;
        return await this.client.query(query, [channelId]);
    }

    async connect(){
        await this.client.connect();
    }

    async disconnect(){
        await this.client.end();
    }
}

module.exports = PGClient;