import { Database } from "./src/infrastructure/database.ts";
const db = new Database("groseries.db");
db.initializeSchema();
const lists = db.query(
  "SELECT id, name, month, completed FROM grocery_lists ORDER BY id",
);
console.log("Listas:", JSON.stringify(lists, null, 2));
db.close();
