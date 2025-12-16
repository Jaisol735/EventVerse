import express from "express"
import cors from "cors"
import bodyParser from "body-parser"
import { createServer } from "http"
import { Server } from "socket.io"
import "./config/mongodb.js"
import "./config/mysql.js"

// Routes
import authRoutes from "./routes/auth.js"
import postRoutes from "./routes/post.js"
import chatRoutes from "./routes/chat.js"
import livestreamRoutes from "./routes/livestream.js"
import recommendationRoutes from "./routes/recommendation.js"
import committeeProfileRoutes from "./routes/committeeProfile.js"
import userProfileImageRoutes from "./routes/userProfileImage.js"
import notificationRoutes from "./routes/notifications.js"
import committeeRoutes from "./routes/committees.js"
import groupChatProfileImageRoutes from "./routes/groupChatProfileImage.js"
import aiRoutes from "./routes/ai.js" // Added AI routes for Python microservice proxy

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:4200", "http://localhost:3000"], // Added Angular dev server port
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
})

app.use(
  cors({
    origin: ["http://localhost:4200", "http://localhost:3000"], // Added specific CORS origins for Angular
    credentials: true,
  }),
)
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true })) // Added URL encoded body parsing

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`[v0] ${req.method} ${req.originalUrl}`)
  next()
})

// API routes
app.use("/api/auth", authRoutes)
app.use("/api/posts", postRoutes)
app.use("/api/chat", chatRoutes)
app.use("/api/livestream", livestreamRoutes)
app.use("/api/recommendation", recommendationRoutes)
app.use("/committee-profile", committeeProfileRoutes) // Fixed route path for committee profile
app.use("/api/committee-profile", committeeProfileRoutes) // Added alias for committee profile API under /api
app.use("/api/user-profile-image", userProfileImageRoutes)
app.use("/api/notifications", notificationRoutes)
app.use("/api/committees", committeeRoutes)
app.use("/api/group-chat-profile-image", groupChatProfileImageRoutes)
app.use("/api/ai", aiRoutes) // Added AI routes for Python microservice proxy

// Health check endpoint
app.get("/api/health", (req, res) => res.send("OK"))

// Health check for Python AI microservices
async function checkPythonServices() {
  const PY_SERVICE_URL = process.env.PY_SERVICE_URL || "http://127.0.0.1:8000"
  let analyzeStatus = "unknown"
  let recommendStatus = "unknown"
  try {
    // Check /analyze endpoint
    const analyzeResp = await fetch(`${PY_SERVICE_URL}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileUrl: "https://dummyimage.com/600x400/000/fff", mediaType: "image" }),
    })
    const analyzeData = await analyzeResp.json().catch(() => ({}))
    analyzeStatus = analyzeResp.ok && analyzeData.ok !== false ? "ok" : `fail: ${analyzeData.error || "unknown"}`
  } catch (e) {
    analyzeStatus = `fail: ${e.message}`
  }

  try {
    // Check /recommend endpoint
    const recommendResp = await fetch(`${PY_SERVICE_URL}/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ words: ["test"] }),
    })
    const recommendData = await recommendResp.json().catch(() => ({}))
    recommendStatus = recommendResp.ok && recommendData.ok !== false ? "ok" : `fail: ${recommendData.error || "unknown"}`
  } catch (e) {
    recommendStatus = `fail: ${e.message}`
  }

  return {
    analyze: analyzeStatus,
    recommend: recommendStatus,
    url: PY_SERVICE_URL,
    timestamp: new Date().toISOString(),
  }
}

// Expose endpoint for AI microservice health check
app.get("/api/ai/healthcheck", async (req, res) => {
  const status = await checkPythonServices()
  console.log("[v0] Python AI service healthcheck:", status)
  res.json(status)
})

// Socket.io for chat and livestream
io.on("connection", (socket) => {
  console.log("[v0] User connected:", socket.id)

  socket.on("authenticate", (data) => {
    const { userId, userName } = data
    socket.userId = userId
    socket.userName = userName
    socket.join(`user-${userId}`)
    console.log(`[v0] User ${userName} (${userId}) authenticated and joined personal room`)
  })

  socket.on("join-chat", (chatId) => {
    socket.join(`chat-${chatId}`)
    console.log(`[v0] User ${socket.userId} joined chat room: chat-${chatId}`)

    // Notify other users in the chat that someone joined
    socket.to(`chat-${chatId}`).emit("user-joined-chat", {
      userId: socket.userId,
      userName: socket.userName,
      chatId,
    })
  })

  socket.on("leave-chat", (chatId) => {
    socket.leave(`chat-${chatId}`)
    console.log(`[v0] User ${socket.userId} left chat room: chat-${chatId}`)

    // Notify other users that someone left
    socket.to(`chat-${chatId}`).emit("user-left-chat", {
      userId: socket.userId,
      userName: socket.userName,
      chatId,
    })
  })

  socket.on("send-message", (messageData) => {
    const { chatId, message } = messageData
    console.log(`[v0] Broadcasting message to chat-${chatId}:`, message.content)

    io.to(`chat-${chatId}`).emit("new-message", {
      chatId,
      message: {
        ...message,
        sender_id: socket.userId,
        sender_name: socket.userName,
        timestamp: new Date(),
      },
    })
  })

  socket.on("typing-start", (data) => {
    const { chatId } = data
    socket.to(`chat-${chatId}`).emit("user-typing", {
      userId: socket.userId,
      userName: socket.userName,
      chatId,
      isTyping: true,
    })
  })

  socket.on("typing-stop", (data) => {
    const { chatId } = data
    socket.to(`chat-${chatId}`).emit("user-typing", {
      userId: socket.userId,
      userName: socket.userName,
      chatId,
      isTyping: false,
    })
  })

  socket.on("user-online", () => {
    socket.broadcast.emit("user-status-change", {
      userId: socket.userId,
      userName: socket.userName,
      status: "online",
    })
  })

  // Back-compat events kept: join-committee-chat / committeeMessage
  socket.on("join-committee-chat", (committeeId) => {
    socket.join(`committee-${committeeId}`)
    console.log(`[v0] User ${socket.userId} joined committee chat ${committeeId} (legacy event)`)
  })

  socket.on("committeeMessage", (msg) => {
    console.log(`[v0] Broadcasting committee message (legacy) to committee-${msg.committeeId}`)
    io.to(`committee-${msg.committeeId}`).emit("new-committee-message", {
      committeeId: msg.committeeId,
      message: {
        ...msg,
        sender_id: socket.userId,
        sender_name: socket.userName,
        committee_id: msg.committeeId,
        timestamp: new Date(),
      },
    })
  })

  // New events per requirement
  socket.on("join_committee_room", ({ committeeId }) => {
    socket.join(`committee-${committeeId}`)
    console.log(`[v0] User ${socket.userId} joined committee room committee-${committeeId}`)
  })

  socket.on("committee_message", ({ committeeId, message }) => {
    const payload = {
      committeeId,
      message: {
        ...(message || {}),
        sender_id: socket.userId,
        sender_name: socket.userName,
        committee_id: committeeId,
        timestamp: new Date(),
      },
    }

    // Emit with new name
    io.to(`committee-${committeeId}`).emit("committee_message", payload)
    // Also emit legacy name for back-compat
    io.to(`committee-${committeeId}`).emit("new-committee-message", payload)

    // Ack back to sender
    socket.emit("committee_message_ack", { ok: true, committeeId, messageId: null })
  })

  socket.on("join-livestream", (streamId) => {
    socket.join(streamId)
    console.log(`[v0] User ${socket.userId} joined livestream ${streamId}`)
  })

  socket.on("disconnect", () => {
    console.log(`[v0] User ${socket.userId} disconnected:`, socket.id)

    // Broadcast offline status to all users
    if (socket.userId) {
      socket.broadcast.emit("user-status-change", {
        userId: socket.userId,
        userName: socket.userName,
        status: "offline",
      })
    }
  })
})

const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
  console.log(`[v0] Server running on http://localhost:${PORT}`)
  console.log("[v0] Available endpoints:")
  console.log("- POST /api/auth/login")
  console.log("- POST /api/auth/register")
  console.log("- GET /api/notifications")
  console.log("- POST /api/notifications/create-committee")
  console.log("- POST /api/notifications/join-committee")
  console.log("- GET /api/committees/search")
  console.log("- GET /api/committees")
  console.log("- GET /api/committees/user/:userId")
  console.log("- GET /api/committees/:id")
  console.log("- POST /api/chat")
  console.log("- GET /api/chat")
  console.log("- POST /api/chat/personal/:userId")
  console.log("- POST /api/chat/group/create")
  console.log("- POST /api/chat/:chatId/messages")
  console.log("- GET /api/posts")
  console.log("- GET /api/posts/committee/:committeeId")
  console.log("- POST /api/posts")
  console.log("- GET /api/posts/feed")
  console.log("- GET /api/posts/feed/:userId")
  console.log("- POST /committee-profile")
  console.log("- GET /committee-profile/:committeeId")
  console.log("- PUT /committee-profile/:committeeId")
  console.log("- POST /api/user-profile-image/upload")
  console.log("- GET /api/user-profile-image")
  console.log("- GET /api/health")
  console.log("- POST /api/ai") // Added AI routes for Python microservice proxy
  console.log("[v0] Socket.io events: authenticate, join-chat, leave-chat, send-message, typing-start, typing-stop")
  console.log("[v0] Committee events: join-committee-chat, leave-committee-chat, committeeMessage")
  console.log("[v0] Database connections: MySQL (users, committees) + MongoDB (chats, posts, profiles)")
})

// Global error handler for debugging
app.use((err, req, res, next) => {
  console.error("[v0] Uncaught error:", err)
  res.status(500).json({ error: err.message || "Internal server error" })
})
