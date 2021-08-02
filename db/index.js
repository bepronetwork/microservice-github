//import db client
import { Client } from 'pg';

class DB{

    constructor(){
        this.client = new Client({});
    }

    start = async () => {
        await this.client.connect();
    }

    end = () => {
        await this.client.end()
    }
}


export default DB;
