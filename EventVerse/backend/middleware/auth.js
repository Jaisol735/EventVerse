import jwt from "jsonwebtoken"
import db from "../config/mysql.js"

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) {
    return res.status(401).json({ error: "Access token required" })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret")
    console.log("[v0] Auth: Decoded token:", decoded)

    const [users] = await db.execute("SELECT user_id, name, email, role FROM Users WHERE user_id = ?", [decoded.userId])

    if (users.length === 0) {
      console.log("[v0] Auth: ❌ No user found for userId:", decoded.userId)
      return res.status(401).json({ error: "Invalid token" })
    }

    req.user = {
      ...users[0],
      userId: users[0].user_id, // Add userId property for consistency
    }

    console.log("[v0] Auth: ✅ User authenticated:", req.user)
    next()
  } catch (error) {
    console.log("[v0] Auth: ❌ Token verification failed:", error.message)
    return res.status(403).json({ error: "Invalid token" })
  }
}
