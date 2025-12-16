import mysql from "mysql2"

const db = mysql
  .createPool({
    host: "localhost",
    user: "root",
    password: "Jaisol@735",
    database: "EVENTVERSE",
  })
  .promise()

db.getConnection((err, conn) => {
  if (err) console.error("MySQL connection failed:", err)
  else console.log("MySQL connected.")
  if (conn) conn.release()
})

export default db
