import express from "express"
import db from "../config/mysql.js"
import { authenticateToken } from "../middleware/auth.js"

const router = express.Router()

router.get("/search", authenticateToken, async (req, res) => {
  try {
    const { q } = req.query

    if (!q || q.trim().length < 2) {
      return res.json([])
    }

    const query = `
      SELECT c.*, u.name as head_name 
      FROM Committees c
      LEFT JOIN Users u ON c.head_id = u.user_id
      WHERE c.name LIKE ? OR c.description LIKE ?
      ORDER BY c.name ASC
      LIMIT 10
    `

    const searchTerm = `%${q.trim()}%`
    const [committees] = await db.execute(query, [searchTerm, searchTerm])

    res.json(committees)
  } catch (error) {
    console.error("Error searching committees:", error)
    res.status(500).json({ error: "Failed to search committees" })
  }
})

router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    // Add member_count to the committee details
    const query = `
      SELECT c.*, u.name as head_name, u.email as head_email,
        (SELECT COUNT(*) FROM Committee_Members cm WHERE cm.committee_id = c.committee_id) as member_count
      FROM Committees c
      LEFT JOIN Users u ON c.head_id = u.user_id
      WHERE c.committee_id = ?
    `

    const [committees] = await db.execute(query, [id])

    if (committees.length === 0) {
      return res.status(404).json({ error: "Committee not found" })
    }

    res.json(committees[0])
  } catch (error) {
    console.error("Error fetching committee:", error)
    res.status(500).json({ error: "Failed to fetch committee" })
  }
})

router.get("/", authenticateToken, async (req, res) => {
  try {
    console.log("[v0] Fetching all committees")

    const query = `
      SELECT c.*, u.name as head_name,
             (SELECT COUNT(*) FROM Committee_Members cm WHERE cm.committee_id = c.committee_id) as member_count
      FROM Committees c
      LEFT JOIN Users u ON c.head_id = u.user_id
      ORDER BY c.name ASC
    `

    const [committees] = await db.execute(query)
    console.log("[v0] Found committees:", committees.length)
    res.json(committees)
  } catch (error) {
    console.error("[v0] Error fetching committees:", error)
    res.status(500).json({ error: "Failed to fetch committees" })
  }
})

router.post("/create-request", authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body
    const userId = req.user.userId

    console.log("[v0] Creating committee request:", { name, description, userId })

    if (!name || !description) {
      return res.status(400).json({ error: "Name and description are required" })
    }

    // Create notification for admin
    const notificationQuery = `
      INSERT INTO Notifications (sender_id, type, message, created_at)
      VALUES (?, 'committee_request', ?, NOW())
    `

    const message = `${req.user.name} has requested to create a committee: "${name}"`
    const [notificationResult] = await db.execute(notificationQuery, [userId, message])

    console.log("[v0] Created notification:", notificationResult.insertId)

    // Add notification receiver for admin
    const adminQuery = "SELECT user_id FROM Users WHERE role = 'admin'"
    const [admins] = await db.execute(adminQuery)

    console.log("[v0] Found admins:", admins.length)

    for (const admin of admins) {
      const receiverQuery = `
        INSERT INTO Notification_Receivers (notification_id, receiver_id, is_read, status)
        VALUES (?, ?, FALSE, 'pending')
      `
      await db.execute(receiverQuery, [notificationResult.insertId, admin.user_id])
      console.log("[v0] Added notification receiver for admin:", admin.user_id)
    }

    res.json({
      success: true,
      message: "Committee creation request sent to admin for approval",
      notification_id: notificationResult.insertId,
    })
  } catch (error) {
    console.error("[v0] Error creating committee request:", error)
    res.status(500).json({ error: "Failed to create committee request" })
  }
})

router.post("/join-request", authenticateToken, async (req, res) => {
  try {
    const { committee_id, skills_description } = req.body
    const userId = req.user.userId

    console.log("[v0] Creating join request:", { committee_id, skills_description, userId })

    if (!committee_id || !skills_description) {
      return res.status(400).json({ error: "Committee ID and skills description are required" })
    }

    // Get committee info
    const committeeQuery = "SELECT * FROM Committees WHERE committee_id = ?"
    const [committees] = await db.execute(committeeQuery, [committee_id])

    if (committees.length === 0) {
      return res.status(404).json({ error: "Committee not found" })
    }

    const committee = committees[0]
    console.log("[v0] Found committee:", committee.name)

    // Create notification for committee head
    const notificationQuery = `
      INSERT INTO Notifications (sender_id, type, related_committee_id, message, created_at)
      VALUES (?, 'join_request', ?, ?, NOW())
    `

    const message = `${req.user.name} wants to join "${committee.name}". Skills: ${skills_description}`
    const [notificationResult] = await db.execute(notificationQuery, [userId, committee_id, message])

    console.log("[v0] Created join notification:", notificationResult.insertId)

    // Add notification receiver for committee head
    const receiverQuery = `
      INSERT INTO Notification_Receivers (notification_id, receiver_id, is_read, status)
      VALUES (?, ?, FALSE, 'pending')
    `
    await db.execute(receiverQuery, [notificationResult.insertId, committee.head_id])
    console.log("[v0] Added notification receiver for head:", committee.head_id)

    res.json({
      success: true,
      message: "Join request sent to committee head for approval",
      notification_id: notificationResult.insertId,
    })
  } catch (error) {
    console.error("[v0] Error creating join request:", error)
    res.status(500).json({ error: "Failed to create join request" })
  }
})

router.get("/:id/members", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const queryText = (req.query.query || "").toString().trim()

    if (!id) return res.status(400).json({ error: "Committee ID is required" })
    if (!queryText || queryText.length < 2) return res.json([])

    const sql = `
      SELECT u.user_id, u.name, u.email, cm.role
      FROM Committee_Members cm
      JOIN Users u ON cm.user_id = u.user_id
      WHERE cm.committee_id = ? AND u.name LIKE ?
      ORDER BY u.name ASC
      LIMIT 10
    `
    const [rows] = await db.execute(sql, [id, `%${queryText}%`])
    return res.json(rows)
  } catch (error) {
    console.error("[v0] Error searching committee members:", error)
    return res.status(500).json({ error: "Failed to search committee members" })
  }
})

// Endpoint to get all members of a committee (for member count/details)
router.get("/:id/members/all", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    if (!id) return res.status(400).json({ error: "Committee ID is required" })

    const sql = `
      SELECT u.user_id, u.name, u.email, cm.role
      FROM Committee_Members cm
      JOIN Users u ON cm.user_id = u.user_id
      WHERE cm.committee_id = ?
      ORDER BY u.name ASC
    `
    const [rows] = await db.execute(sql, [id])
    return res.json(rows)
  } catch (error) {
    console.error("[v0] Error fetching all committee members:", error)
    return res.status(500).json({ error: "Failed to fetch committee members" })
  }
})

router.get("/user/:userId", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params

    console.log("[v0] 🔍 Fetching committees for user_id:", userId)
    console.log("[v0] 🔍 Request user from auth:", req.user)

    const query = `
      SELECT 
        c.committee_id,
        c.name as committee_name,
        c.description,
        cm.role as member_role,
        u.name as head_name
      FROM Committee_Members cm
      JOIN Committees c ON cm.committee_id = c.committee_id
      LEFT JOIN Users u ON c.head_id = u.user_id
      WHERE cm.user_id = ?
      ORDER BY c.name ASC
    `

    console.log("[v0] 🔍 Executing query:", query)
    console.log("[v0] 🔍 Query parameters:", [userId])

    const [committees] = await db.execute(query, [userId])

    console.log("[v0] ✅ Query executed successfully")
    console.log("[v0] ✅ Found committees:", committees.length)
    console.log("[v0] ✅ Committee data:", JSON.stringify(committees, null, 2))

    if (committees.length > 0) {
      console.log("[v0] 🎉 USER HAS COMMITTEES! Returning data...")
    } else {
      console.log("[v0] ⚠️ No committees found for user_id:", userId)

      const checkUserQuery = "SELECT * FROM Committee_Members WHERE user_id = ?"
      const [userCheck] = await db.execute(checkUserQuery, [userId])
      console.log("[v0] 🔍 Committee_Members entries for user:", userCheck)

      const allMembersQuery = "SELECT * FROM Committee_Members LIMIT 10"
      const [allMembers] = await db.execute(allMembersQuery)
      console.log("[v0] 🔍 Sample Committee_Members entries:", allMembers)
    }

    res.json({
      success: true,
      committees: committees,
    })
  } catch (error) {
    console.error("[v0] ❌ Error fetching user committees:", error)
    res.status(500).json({
      success: false,
      error: "Failed to fetch user committees",
    })
  }
})

router.post("/:id/change-head", authenticateToken, async (req, res) => {
  const conn = await db.getConnection()
  try {
    const { id } = req.params
    const { new_head_id } = req.body
    const actingUserId = req.user.userId

    if (!id || !new_head_id) {
      return res.status(400).json({ error: "Committee ID and new_head_id are required" })
    }

    // 1) Validate committee exists and acting user is current head
    const [committeeRows] = await conn.execute(
      "SELECT committee_id, name, head_id FROM Committees WHERE committee_id = ?",
      [id],
    )
    if (committeeRows.length === 0) {
      return res.status(404).json({ error: "Committee not found" })
    }

    const committee = committeeRows[0]
    if (committee.head_id !== actingUserId) {
      return res.status(403).json({ error: "Only the current head can transfer head role" })
    }

    if (Number(new_head_id) === Number(committee.head_id)) {
      return res.status(400).json({ error: "Selected user is already the head" })
    }

    // 2) Ensure new head is a member of this committee
    const [candidateRows] = await conn.execute(
      "SELECT member_id, role FROM Committee_Members WHERE committee_id = ? AND user_id = ?",
      [id, new_head_id],
    )
    if (candidateRows.length === 0) {
      return res.status(400).json({ error: "Selected user is not a member of this committee" })
    }

    await conn.beginTransaction()

    // 3) Insert audit log
    await conn.execute(`INSERT INTO Head_Transfers (old_head_id, new_head_id, committee_id) VALUES (?, ?, ?)`, [
      committee.head_id,
      new_head_id,
      id,
    ])

    // 4) Update the committee head_id
    await conn.execute(`UPDATE Committees SET head_id = ? WHERE committee_id = ?`, [new_head_id, id])

    // 5) Demote old head to member (upsert to ensure membership entry exists)
    const [oldMemberRows] = await conn.execute(
      "SELECT member_id FROM Committee_Members WHERE committee_id = ? AND user_id = ?",
      [id, committee.head_id],
    )
    if (oldMemberRows.length > 0) {
      await conn.execute("UPDATE Committee_Members SET role = 'member' WHERE committee_id = ? AND user_id = ?", [
        id,
        committee.head_id,
      ])
    } else {
      await conn.execute("INSERT INTO Committee_Members (committee_id, user_id, role) VALUES (?, ?, 'member')", [
        id,
        committee.head_id,
      ])
    }

    // 6) Promote new head to role 'head'
    await conn.execute("UPDATE Committee_Members SET role = 'head' WHERE committee_id = ? AND user_id = ?", [
      id,
      new_head_id,
    ])

    await conn.commit()

    // 7) Return updated committee with new head details
    const [updatedRows] = await db.execute(
      `
      SELECT c.*, u.name as head_name, u.email as head_email
      FROM Committees c
      LEFT JOIN Users u ON c.head_id = u.user_id
      WHERE c.committee_id = ?
    `,
      [id],
    )

    return res.json({
      success: true,
      message: "Committee head updated successfully",
      committee: updatedRows[0],
    })
  } catch (error) {
    try {
      await conn.rollback()
    } catch (e) {
      console.error("[v0] rollback failed:", e)
    }
    console.error("[v0] Error changing committee head:", error)
    return res.status(500).json({ error: "Failed to change committee head" })
  } finally {
    if (conn) conn.release()
  }
})

export default router
