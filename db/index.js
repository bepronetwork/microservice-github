//import db client
import { Client } from 'pg';

class DB {

    constructor(){
        this.client = new Client({});
    }

    start = async () => {
        await this.client.connect();
    }

    end = async () => {
        await this.client.end()
    }
}


export default DB;
