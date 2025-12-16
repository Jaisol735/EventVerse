import express from "express"
import jwt from "jsonwebtoken"
import db from "../config/mysql.js"

const router = express.Router()

// Register user
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role = "student" } = req.body

    // Check if user already exists
    const [existingUsers] = await db.execute("SELECT * FROM Users WHERE email = ?", [email])
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: "User already exists" })
    }

    const [result] = await db.execute(
      "INSERT INTO Users (name, email, password_hash, role) VALUES (?, ?, SHA2(?, 256), ?)",
      [name, email, password, role],
    )

    // Get the created user
    const [users] = await db.execute("SELECT user_id, name, email, role FROM Users WHERE user_id = ?", [
      result.insertId,
    ])
    const user = users[0]

    // Generate JWT token
    const token = jwt.sign({ userId: user.user_id }, process.env.JWT_SECRET || "fallback_secret", {
      expiresIn: "7d",
    })

    res.status(201).json({ user, token })
  } catch (error) {
    console.error("Registration error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Login user
router.post("/login", async (req, res) => {
  try {
    console.log("[v0] Login attempt:", { name: req.body.name, hasPassword: !!req.body.password })
    const { name, password } = req.body

    console.log("[v0] Searching for user with name/email:", name)
    const [users] = await db.execute(
      "SELECT * FROM Users WHERE (name = ? OR email = ?) AND password_hash = SHA2(?, 256)",
      [name, name, password],
    )
    console.log("[v0] Found users:", users.length)

    if (users.length === 0) {
      console.log("[v0] No user found with matching credentials")
      return res.status(401).json({ error: "Invalid credentials" })
    }

    const user = users[0]
    console.log("[v0] User found:", { id: user.user_id, name: user.name, email: user.email })

    // Generate JWT token
    const token = jwt.sign({ userId: user.user_id }, process.env.JWT_SECRET || "fallback_secret", {
      expiresIn: "7d",
    })

    const { password_hash: _, ...userWithoutPassword } = user
    console.log("[v0] Login successful for user:", user.name)
    res.json({ user: userWithoutPassword, token })
  } catch (error) {
    console.error("[v0] Login error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

export default router
