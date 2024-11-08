import { MongoClient } from "mongodb";

const connectionString = "mongodb+srv://soodala78:1972And78@mongopractice.g7ss4.mongodb.net/";
const client = new MongoClient(connectionString);

let conn;
try {
    conn = await client.connect();
} catch (e) {
    console.error(e);
}

let db = conn.db("sample_training");

export default db;
