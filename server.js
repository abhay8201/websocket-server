const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mysql = require("mysql2");

// Create Express App & HTTP Server
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
  },
});

// // MySQL Database Connection
// const db = mysql.createConnection({
//   host: "localhost",
//   user: "root",
//   password: "",
//   database: "wavify",
// });

// db.connect((err) => {
//   if (err) {
//     console.error("MySQL Connection Error:", err);
//   } else {
//     console.log("✅ Connected to MySQL Database");
//   }
// });

// Updated database credentials
const db = mysql.createConnection({
  host: "sql12.freesqldatabase.com", // Your InfinityFree MySQL hostname
  user: "sql12765609", // Your MySQL username
  password: "5lxu7qlE3W", // Replace with your actual password
  database: "sql12765609", // Your MySQL database name
  port: 3306, // Default MySQL port (optional)
});

// Attempt to connect to the database
db.connect((err) => {
  if (err) {
    console.error("❌ MySQL Connection Error:", err);
  } else {
    console.log("✅ Connected to Online MySQL Database");
  }
});

io.on("connection", (socket) => {
  console.log("🔗 New client connected:", socket.id);

  socket.on("message", (data) => {
    console.log("📩 Raw data received:", data); // Check if Java client sends data
    try {
      let parsedData = data;

      if (
        !parsedData.sender_id ||
        !parsedData.receiver_id ||
        !parsedData.message
      ) {
        console.error("❌ Invalid message format:", parsedData);
        return;
      }

      console.log(
        `📩 Message from ${parsedData.sender_id} to ${parsedData.receiver_id}: ${parsedData.message}`
      );

      const checkUserQuery = "SELECT user_id FROM users WHERE user_id = ?";
      db.query(checkUserQuery, [parsedData.sender_id], (err, results) => {
        if (err) {
          console.error("❌ Error checking sender_id:", err);
          return;
        }
        if (results.length === 0) {
          console.error("❌ Sender ID does not exist:", parsedData.sender_id);
          return;
        }

        const query =
          "INSERT INTO messages (sender_id, receiver_id, message) VALUES (?, ?, ?)";
        db.query(
          query,
          [parsedData.sender_id, parsedData.receiver_id, parsedData.message],
          (err) => {
            if (err) console.error("❌ Error saving message:", err);
          }
        );
      });

      io.emit("message", parsedData);
    } catch (error) {
      console.error("❌ JSON Parse Error:", error);
    }
  });

  socket.on("fetch_messages", (data, callback) => {
    console.log(
      "📩 Fetching messages for:",
      data.sender_id,
      "and",
      data.receiver_id
    );

    const query = `
        SELECT sender_id, receiver_id, message, timestamp 
        FROM messages 
        WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?) 
        ORDER BY timestamp ASC
    `;

    db.query(
      query,
      [data.sender_id, data.receiver_id, data.receiver_id, data.sender_id],
      (err, results) => {
        if (err) {
          console.error("❌ Error fetching messages:", err);
          callback({ success: false, error: err.message });
        } else {
          callback({ success: true, messages: results });
        }
      }
    );
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

// Start Server
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`🚀 WebSocket Server running on ws://localhost:${PORT}`);
});
