import express from "express"
import db from "../config/mysql.js"
import { authenticateToken } from "../middleware/auth.js"

const router = express.Router()

// Helper function to handle status changes
async function handleStatusChange(db, req, res, status) {
  try {
    const { id } = req.params
    console.log("[v0] Updating notification status via helper:", id, "to:", status, "for user:", req.user.userId)

    if (status === "accepted") {
      const notificationQuery = `
        SELECT n.*, nr.receiver_id 
        FROM Notifications n
        JOIN Notification_Receivers nr ON n.notification_id = nr.notification_id
        WHERE n.notification_id = ? AND nr.receiver_id = ?
      `
      const [notifications] = await db.execute(notificationQuery, [id, req.user.userId])

      if (notifications.length > 0) {
        const notification = notifications[0]

        if (notification.type === "committee_request") {
          // create committee and notify requester
          const senderQuery = "SELECT name FROM Users WHERE user_id = ?"
          const [senders] = await db.execute(senderQuery, [notification.sender_id])

          if (senders.length > 0) {
            const createCommitteeQuery = `
              INSERT INTO Committees (name, description, head_id, created_at)
              VALUES (?, ?, ?, NOW())
            `
            const committeeName = `Committee by ${senders[0].name}`
            const committeeDesc = "Committee approved by admin"

            const [committeeResult] = await db.execute(createCommitteeQuery, [
              committeeName,
              committeeDesc,
              notification.sender_id,
            ])

            const memberQuery = `
              INSERT INTO Committee_Members (committee_id, user_id, role)
              VALUES (?, ?, 'head')
            `
            await db.execute(memberQuery, [committeeResult.insertId, notification.sender_id])

            const successNotificationQuery = `
              INSERT INTO Notifications (sender_id, type, message, created_at)
              VALUES (?, 'committee_request', ?, NOW())
            `
            const successMessage = `Your committee "${committeeName}" has been approved and created!`
            const [successNotification] = await db.execute(successNotificationQuery, [1, successMessage])

            const successReceiverQuery = `
              INSERT INTO Notification_Receivers (notification_id, receiver_id, is_read, status)
              VALUES (?, ?, FALSE, 'completed')
            `
            await db.execute(successReceiverQuery, [successNotification.insertId, notification.sender_id])

            console.log("[v0] Committee created successfully:", committeeResult.insertId)
          }
        } else if (notification.type === "join_request") {
          // add to committee and notify requester
          if (notification.related_committee_id) {
            const addMemberQuery = `
              INSERT INTO Committee_Members (committee_id, user_id, role)
              VALUES (?, ?, 'member')
            `
            await db.execute(addMemberQuery, [notification.related_committee_id, notification.sender_id])

            const committeeQuery = "SELECT name FROM Committees WHERE committee_id = ?"
            const [committees] = await db.execute(committeeQuery, [notification.related_committee_id])

            if (committees.length > 0) {
              const successNotificationQuery = `
                INSERT INTO Notifications (sender_id, type, related_committee_id, message, created_at)
                VALUES (?, 'join_request', ?, ?, NOW())
              `
              const successMessage = `You have successfully joined "${committees[0].name}"!`
              const [successNotification] = await db.execute(successNotificationQuery, [
                req.user.userId,
                notification.related_committee_id,
                successMessage,
              ])

              const successReceiverQuery = `
                INSERT INTO Notification_Receivers (notification_id, receiver_id, is_read, status)
                VALUES (?, ?, FALSE, 'completed')
              `
              await db.execute(successReceiverQuery, [successNotification.insertId, notification.sender_id])

              console.log("[v0] User added to committee successfully")
            }
          }
        }
      }
    } else if (status === "declined") {
      const notificationQuery = `
        SELECT n.*, nr.receiver_id 
        FROM Notifications n
        JOIN Notification_Receivers nr ON n.notification_id = nr.notification_id
        WHERE n.notification_id = ? AND nr.receiver_id = ?
      `
      const [notifications] = await db.execute(notificationQuery, [id, req.user.userId])

      if (notifications.length > 0) {
        const notification = notifications[0]

        const rejectionNotificationQuery = `
          INSERT INTO Notifications (sender_id, type, message, created_at)
          VALUES (?, ?, ?, NOW())
        `
        let rejectionMessage = ""
        if (notification.type === "committee_request") {
          rejectionMessage = "Your committee creation request has been declined by admin."
        } else if (notification.type === "join_request") {
          rejectionMessage = "Your committee join request has been declined."
        }

        if (rejectionMessage) {
          const [rejectionNotification] = await db.execute(rejectionNotificationQuery, [
            req.user.userId,
            notification.type,
            rejectionMessage,
          ])

          const rejectionReceiverQuery = `
            INSERT INTO Notification_Receivers (notification_id, receiver_id, is_read, status)
            VALUES (?, ?, FALSE, 'completed')
          `
          await db.execute(rejectionReceiverQuery, [rejectionNotification.insertId, notification.sender_id])

          console.log("[v0] Rejection notification sent")
        }
      }
    }

    const updateQuery = `
      UPDATE Notification_Receivers 
      SET status = ?, action_timestamp = NOW() 
      WHERE notification_id = ? AND receiver_id = ?
    `
    await db.execute(updateQuery, [status, id, req.user.userId])

    res.json({ message: "Notification status updated successfully" })
  } catch (error) {
    console.error("[v0] Error in handleStatusChange:", error)
    res.status(500).json({ error: "Failed to update notification status" })
  }
}

router.get("/", authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT n.*, nr.status, nr.is_read, nr.action_timestamp,
             u.name as sender_name, c.name as committee_name 
      FROM Notifications n
      JOIN Notification_Receivers nr ON n.notification_id = nr.notification_id
      LEFT JOIN Users u ON n.sender_id = u.user_id
      LEFT JOIN Committees c ON n.related_committee_id = c.committee_id
      WHERE nr.receiver_id = ? 
      ORDER BY n.created_at DESC
    `

    const [notifications] = await db.execute(query, [req.user.userId])
    console.log("[v0] Fetched notifications for user:", req.user.userId, "count:", notifications.length)
    res.json(notifications)
  } catch (error) {
    console.error("[v0] Error fetching notifications:", error)
    res.status(500).json({ error: "Failed to fetch notifications" })
  }
})

// Get unread notifications count for current user
router.get("/unread-count", authenticateToken, async (req, res) => {
  try {
    // Example: count unread notifications for user
    const [result] = await db.execute(
      'SELECT COUNT(*) as count FROM Notification_Receivers WHERE receiver_id = ? AND status = "pending"',
      [req.user.userId],
    )
    res.json({ count: result[0].count })
  } catch (error) {
    console.error("[v0] Error fetching unread notification count:", error)
    res.status(500).json({ error: "Failed to fetch unread notification count" })
  }
})

// Reuse helper in existing status route
router.put("/:id/status", authenticateToken, async (req, res) => {
  const { status } = req.body
  await handleStatusChange(db, req, res, status)
})

// Committee-specific list endpoint for pending join requests
router.get("/committee/:committeeId", authenticateToken, async (req, res) => {
  try {
    const { committeeId } = req.params
    const query = `
      SELECT n.*, nr.status, nr.is_read, nr.action_timestamp,
             u.name as sender_name, c.name as committee_name
      FROM Notifications n
      JOIN Notification_Receivers nr ON n.notification_id = nr.notification_id
      LEFT JOIN Users u ON n.sender_id = u.user_id
      LEFT JOIN Committees c ON n.related_committee_id = c.committee_id
      WHERE n.type = 'join_request'
        AND n.related_committee_id = ?
        AND nr.receiver_id = ?
        AND nr.status = 'pending'
      ORDER BY n.created_at DESC
    `
    const [rows] = await db.execute(query, [committeeId, req.user.userId])
    res.json(rows)
  } catch (error) {
    console.error("[v0] Error fetching committee notifications:", error)
    res.status(500).json({ error: "Failed to fetch committee notifications" })
  }
})

// Add accept/reject endpoints to align with spec and call the same logic
router.post("/:id/accept", authenticateToken, async (req, res) => {
  await handleStatusChange(db, req, res, "accepted")
})

router.post("/:id/reject", authenticateToken, async (req, res) => {
  await handleStatusChange(db, req, res, "declined")
})

router.put("/:id/read", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    console.log("[v0] Marking notification as read:", id, "for user:", req.user.userId)

    const query = `
      UPDATE Notification_Receivers 
      SET is_read = TRUE 
      WHERE notification_id = ? AND receiver_id = ?
    `
    await db.execute(query, [id, req.user.userId])

    res.json({ message: "Notification marked as read" })
  } catch (error) {
    console.error("[v0] Error marking notification as read:", error)
    res.status(500).json({ error: "Failed to mark notification as read" })
  }
})

export default router
