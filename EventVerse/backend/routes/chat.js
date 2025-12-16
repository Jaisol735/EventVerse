import express from "express"
import { authenticateToken } from "../middleware/auth.js"
import Chat from "../models/Chat.js"
import db from "../config/mysql.js"

const router = express.Router()

router.get("/", authenticateToken, async (req, res) => {
  try {
    console.log("[v0] Fetching chats for user:", req.user.userId)

    const chats = await Chat.find({
      "participants.user_id": req.user.userId,
    }).sort({ updated_at: -1 })

    console.log("[v0] Found chats:", chats.length)
    res.json(chats)
  } catch (error) {
    console.error("[v0] Error fetching chats:", error)
    res.status(500).json({ error: "Failed to fetch chats" })
  }
})

router.get("/search-users/:query", authenticateToken, async (req, res) => {
  try {
    const { query } = req.params
    console.log("[v0] Searching users with query:", query)

    const searchQuery = `
      SELECT user_id, name, email, role 
      FROM Users 
      WHERE (name LIKE ? OR email LIKE ?) 
      AND user_id != ? 
      LIMIT 10
    `

    const [users] = await db.execute(searchQuery, [`%${query}%`, `%${query}%`, req.user.userId])

    console.log("[v0] Found users:", users.length)
    res.json(users)
  } catch (error) {
    console.error("[v0] Error searching users:", error)
    res.status(500).json({ error: "Failed to search users" })
  }
})

router.post("/personal/:userId", authenticateToken, async (req, res) => {
  try {
    const otherUserId = Number.parseInt(req.params.userId)
    console.log("[v0] Creating/getting personal chat between:", req.user.userId, "and", otherUserId)

    // Get other user info from MySQL
    const [otherUsers] = await db.execute("SELECT user_id, name FROM Users WHERE user_id = ?", [otherUserId])

    if (otherUsers.length === 0) {
      return res.status(404).json({ error: "User not found" })
    }

    const otherUser = otherUsers[0]

    // Check if personal chat already exists
    let chat = await Chat.findOne({
      chat_type: "personal",
      $and: [{ "participants.user_id": req.user.userId }, { "participants.user_id": otherUserId }],
    })

    if (!chat) {
      // Create new personal chat
      chat = new Chat({
        chat_type: "personal",
        participants: [
          { user_id: req.user.userId, name: req.user.name },
          { user_id: otherUserId, name: otherUser.name },
        ],
        messages: [],
      })

      await chat.save()
      console.log("[v0] Created new personal chat:", chat._id)
    } else {
      console.log("[v0] Found existing personal chat:", chat._id)
    }

    res.json(chat)
  } catch (error) {
    console.error("[v0] Error creating/getting personal chat:", error)
    res.status(500).json({ error: "Failed to create/get personal chat" })
  }
})

router.post("/group/create", authenticateToken, async (req, res) => {
  try {
    const { group_name, selected_users } = req.body // selected_users is array of user_ids
    console.log("[v0] Creating group chat:", group_name, "with users:", selected_users)

    if (!group_name || !selected_users || selected_users.length === 0) {
      return res.status(400).json({ error: "Group name and users are required" })
    }

    // Get user details from MySQL
    const userIds = [req.user.userId, ...selected_users]
    const placeholders = userIds.map(() => "?").join(",")
    const [users] = await db.execute(`SELECT user_id, name FROM Users WHERE user_id IN (${placeholders})`, userIds)

    if (users.length !== userIds.length) {
      return res.status(400).json({ error: "Some users not found" })
    }

    // Create group chat
    const participants = users.map((user) => ({
      user_id: user.user_id,
      name: user.name,
      joined_at: new Date(),
    }))

    const groupChat = new Chat({
      chat_type: "group",
      group_name,
      group_admin: req.user.userId,
      participants,
      messages: [
        {
          sender_id: req.user.userId,
          sender_name: req.user.name,
          content: `${req.user.name} created the group "${group_name}"`,
          message_type: "text",
          timestamp: new Date(),
        },
      ],
      last_message: {
        content: `Group "${group_name}" created`,
        sender_name: req.user.name,
        timestamp: new Date(),
      },
    })

    await groupChat.save()

    // Send notifications to selected users
    for (const userId of selected_users) {
      const notificationQuery = `
        INSERT INTO Notifications (sender_id, type, message, created_at)
        VALUES (?, 'group_chat_invite', ?, NOW())
      `
      const [notificationResult] = await db.execute(notificationQuery, [
        req.user.userId,
        `${req.user.name} added you to group chat "${group_name}"`,
      ])

      // Add to notification receivers
      await db.execute(
        `INSERT INTO Notification_Receivers (notification_id, receiver_id, status) VALUES (?, ?, 'pending')`,
        [notificationResult.insertId, userId],
      )
    }

    console.log("[v0] Group chat created successfully:", groupChat._id)
    res.json(groupChat)
  } catch (error) {
    console.error("[v0] Error creating group chat:", error)
    res.status(500).json({ error: "Failed to create group chat" })
  }
})

router.get("/:chatId", authenticateToken, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId)

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" })
    }

    // Check if user is participant
    const isParticipant = chat.participants.some((p) => p.user_id === req.user.userId)
    if (!isParticipant) {
      return res.status(403).json({ error: "Not authorized to view this chat" })
    }

    res.json(chat)
  } catch (error) {
    console.error("[v0] Error fetching chat:", error)
    res.status(500).json({ error: "Failed to fetch chat" })
  }
})

router.post("/committee/:committeeId", authenticateToken, async (req, res) => {
  try {
    const { committeeId } = req.params
    const committee_id = Number.parseInt(committeeId)

    // Fetch all committee members from MySQL
    const [members] = await db.execute(
      `SELECT u.user_id, u.name FROM Committee_Members cm JOIN Users u ON cm.user_id = u.user_id WHERE cm.committee_id = ?`,
      [committee_id]
    )

    if (!members || members.length === 0) {
      return res.status(404).json({ error: "No members found for this committee" })
    }

    // Check if requesting user is a member
    const isMember = members.some(m => m.user_id === req.user.userId)
    if (!isMember) {
      return res.status(403).json({ error: "You are not a member of this committee" })
    }

    // Check if committee chat already exists
    let chat = await Chat.findOne({
      chat_type: "committee",
      committee_id: committee_id,
    })

    if (!chat) {
      // Create new committee chat with all members as participants
      chat = new Chat({
        chat_type: "committee",
        committee_id: committee_id,
        participants: members.map(m => ({
          user_id: m.user_id,
          name: m.name,
          joined_at: new Date(),
        })),
        messages: [],
      })
      await chat.save()
    } else {
      // Ensure all current committee members are in participants
      const existingIds = chat.participants.map(p => p.user_id)
      let updated = false
      for (const m of members) {
        if (!existingIds.includes(m.user_id)) {
          chat.participants.push({
            user_id: m.user_id,
            name: m.name,
            joined_at: new Date(),
          })
          updated = true
        }
      }
      // Optionally, remove participants who are no longer members
      const memberIds = members.map(m => m.user_id)
      if (chat.participants.length !== members.length) {
        chat.participants = chat.participants.filter(p => memberIds.includes(p.user_id))
        updated = true
      }
      if (updated) await chat.save()
    }

    res.json(chat)
  } catch (error) {
    console.error("Error creating/getting committee chat:", error)
    res.status(500).json({ error: "Failed to create/get committee chat" })
  }
})

// Fetch committee messages by committeeId (aggregated across committee chats)
router.get("/committee/:committeeId/messages", authenticateToken, async (req, res) => {
  try {
    const committeeId = Number.parseInt(req.params.committeeId)
    if (Number.isNaN(committeeId)) {
      return res.status(400).json({ error: "Invalid committee id" })
    }

    const chats = await Chat.find({
      chat_type: "committee",
      committee_id: committeeId,
    }).select("messages committee_id")

    // Flatten messages and tag with committee_id
    const messages = []
    for (const chat of chats) {
      for (const m of chat.messages) {
        const base = typeof m.toObject === "function" ? m.toObject() : m
        messages.push({
          ...base,
          committee_id: committeeId,
        })
      }
    }

    messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    return res.json(messages)
  } catch (error) {
    console.error("[v0] Error fetching committee messages:", error)
    return res.status(500).json({ error: "Failed to fetch committee messages" })
  }
})

// Create/send a committee message (ensures it is stored on a committee chat, not personal)
router.post("/committee/:committeeId/messages", authenticateToken, async (req, res) => {
  try {
    const committeeId = Number.parseInt(req.params.committeeId)
    const { sender_id, message } = req.body || {}

    if (Number.isNaN(committeeId) || !sender_id || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Invalid payload" })
    }

    // Prevent sender spoofing
    if (sender_id !== req.user.userId) {
      return res.status(403).json({ error: "Sender mismatch" })
    }

    // Fetch all committee members from MySQL
    const [members] = await db.execute(
      `SELECT u.user_id, u.name FROM Committee_Members cm JOIN Users u ON cm.user_id = u.user_id WHERE cm.committee_id = ?`,
      [committeeId]
    )

    if (!members || members.length === 0) {
      return res.status(404).json({ error: "No members found for this committee" })
    }

    // Check if sender is a member
    const isMember = members.some(m => m.user_id === req.user.userId)
    if (!isMember) {
      return res.status(403).json({ error: "You are not a member of this committee" })
    }

    // Find (or create) the committee chat
    let chat = await Chat.findOne({
      chat_type: "committee",
      committee_id: committeeId,
    })

    if (!chat) {
      chat = new Chat({
        chat_type: "committee",
        committee_id: committeeId,
        participants: members.map(m => ({
          user_id: m.user_id,
          name: m.name,
          joined_at: new Date(),
        })),
        messages: [],
      })
    } else {
      // Ensure all current committee members are in participants
      const existingIds = chat.participants.map(p => p.user_id)
      let updated = false
      for (const m of members) {
        if (!existingIds.includes(m.user_id)) {
          chat.participants.push({
            user_id: m.user_id,
            name: m.name,
            joined_at: new Date(),
          })
          updated = true
        }
      }
      // Optionally, remove participants who are no longer members
      const memberIds = members.map(m => m.user_id)
      if (chat.participants.length !== members.length) {
        chat.participants = chat.participants.filter(p => memberIds.includes(p.user_id))
        updated = true
      }
      if (updated) await chat.save()
    }

    const newMessage = {
      sender_id: req.user.userId,
      sender_name: req.user.name,
      content: message.trim(),
      message_type: "text",
      timestamp: new Date(),
    }

    chat.messages.push(newMessage)
    chat.last_message = {
      content: newMessage.content,
      sender_name: newMessage.sender_name,
      timestamp: newMessage.timestamp,
    }
    chat.updated_at = new Date()

    await chat.save()

    // Respond with the created message (client handles socket broadcasting)
    return res.json({
      ...newMessage,
      committee_id: committeeId,
    })
  } catch (error) {
    console.error("[v0] Error posting committee message:", error)
    return res.status(500).json({ error: "Failed to send committee message" })
  }
})

// Optional: mark a message as read (stub for future expansion)
router.put("/messages/:messageId/read", authenticateToken, async (req, res) => {
  try {
    // Implementation depends on per-message identifiers; schema does not store message _id per default subdocs
    // Endpoint provided as a placeholder to match requirements.
    return res.status(501).json({ error: "Not implemented" })
  } catch (error) {
    return res.status(500).json({ error: "Failed to mark as read" })
  }
})

router.post("/group/:chatId/join", authenticateToken, async (req, res) => {
  try {
    const { chatId } = req.params
    console.log("[v0] User joining group chat:", chatId, "user:", req.user.userId)

    const chat = await Chat.findById(chatId)
    if (!chat || chat.chat_type !== "group") {
      return res.status(404).json({ error: "Group chat not found" })
    }

    // Check if user is already a participant
    const isParticipant = chat.participants.some((p) => p.user_id === req.user.userId)
    if (isParticipant) {
      return res.status(400).json({ error: "User already in group" })
    }

    // Add user to group
    chat.participants.push({
      user_id: req.user.userId,
      name: req.user.name,
      joined_at: new Date(),
    })

    // Add join message
    chat.messages.push({
      sender_id: req.user.userId,
      sender_name: req.user.name,
      content: `${req.user.name} joined the group`,
      message_type: "text",
      timestamp: new Date(),
    })

    chat.updated_at = new Date()
    await chat.save()

    console.log("[v0] User joined group chat successfully")
    res.json(chat)
  } catch (error) {
    console.error("[v0] Error joining group chat:", error)
    res.status(500).json({ error: "Failed to join group chat" })
  }
})

router.post("/group/:chatId/leave", authenticateToken, async (req, res) => {
  try {
    const { chatId } = req.params
    console.log("[v0] User leaving group chat:", chatId, "user:", req.user.userId)

    const chat = await Chat.findById(chatId)
    if (!chat || chat.chat_type !== "group") {
      return res.status(404).json({ error: "Group chat not found" })
    }

    // Remove user from participants
    chat.participants = chat.participants.filter((p) => p.user_id !== req.user.userId)

    // Add leave message
    chat.messages.push({
      sender_id: req.user.userId,
      sender_name: req.user.name,
      content: `${req.user.name} left the group`,
      message_type: "text",
      timestamp: new Date(),
    })

    // If admin left, assign new admin
    if (chat.group_admin === req.user.userId && chat.participants.length > 0) {
      chat.group_admin = chat.participants[0].user_id
      chat.messages.push({
        sender_id: chat.participants[0].user_id,
        sender_name: chat.participants[0].name,
        content: `${chat.participants[0].name} is now the group admin`,
        message_type: "text",
        timestamp: new Date(),
      })
    }

    chat.updated_at = new Date()
    await chat.save()

    console.log("[v0] User left group chat successfully")
    res.json({ message: "Left group chat successfully" })
  } catch (error) {
    console.error("[v0] Error leaving group chat:", error)
    res.status(500).json({ error: "Failed to leave group chat" })
  }
})

router.post("/:chatId/messages", authenticateToken, async (req, res) => {
  try {
    const { content, message_type = "text" } = req.body
    const { chatId } = req.params

    console.log("[v0] Sending message to chat:", chatId, "from user:", req.user.userId)

    const chat = await Chat.findById(chatId)

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" })
    }

    // Check if user is participant
    const isParticipant = chat.participants.some((p) => p.user_id === req.user.userId)
    if (!isParticipant) {
      return res.status(403).json({ error: "Not authorized to send messages to this chat" })
    }

    const newMessage = {
      sender_id: req.user.userId,
      sender_name: req.user.name,
      content,
      message_type,
      timestamp: new Date(),
    }

    chat.messages.push(newMessage)
    chat.last_message = {
      content,
      sender_name: req.user.name,
      timestamp: new Date(),
    }
    chat.updated_at = new Date()

    await chat.save()

    console.log("[v0] Message sent successfully")
    res.json(newMessage)
  } catch (error) {
    console.error("[v0] Error sending message:", error)
    res.status(500).json({ error: "Failed to send message" })
  }
})

// Get or create the committee group chat (not the head chat)
router.get("/committee/:committeeId/group", authenticateToken, async (req, res) => {
  try {
    const committeeId = Number.parseInt(req.params.committeeId)
    if (Number.isNaN(committeeId)) {
      return res.status(400).json({ error: "Invalid committee id" })
    }

    // Fetch all committee members from MySQL (including head)
    const [members] = await db.execute(
      `SELECT u.user_id, u.name FROM Committee_Members cm JOIN Users u ON cm.user_id = u.user_id WHERE cm.committee_id = ?`,
      [committeeId]
    )
    // Also get the committee head
    const [committeeRows] = await db.execute(
      `SELECT head_id FROM Committees WHERE committee_id = ?`,
      [committeeId]
    )
    if (!committeeRows || committeeRows.length === 0) {
      return res.status(404).json({ error: "Committee not found" })
    }
    const headId = committeeRows[0].head_id
    // Add head to members if not already present
    if (!members.some(m => m.user_id === headId)) {
      const [headRows] = await db.execute(
        `SELECT user_id, name FROM Users WHERE user_id = ?`,
        [headId]
      )
      if (headRows.length > 0) {
        members.push(headRows[0])
      }
    }

    // Check if requesting user is a member or head
    const isMember = members.some(m => m.user_id === req.user.userId)
    if (!isMember) {
      return res.status(403).json({ error: "You are not a member of this committee" })
    }

    // Find group chat for this committee
    let chat = await Chat.findOne({
      chat_type: "group",
      committee_id: committeeId,
    })

    if (!chat) {
      // Create a new group chat for this committee
      chat = new Chat({
        chat_type: "group",
        committee_id: committeeId,
        group_name: `Committee Group ${committeeId}`,
        group_admin: headId,
        participants: members.map(m => ({
          user_id: m.user_id,
          name: m.name,
          joined_at: new Date(),
        })),
        messages: [
          {
            sender_id: headId,
            sender_name: members.find(m => m.user_id === headId)?.name || "Head",
            content: "Group chat created for committee members.",
            message_type: "text",
            timestamp: new Date(),
          },
        ],
        last_message: {
          content: "Group chat created for committee members.",
          sender_name: members.find(m => m.user_id === headId)?.name || "Head",
          timestamp: new Date(),
        },
      })
      await chat.save()
    } else {
      // Ensure all current committee members and head are in participants
      const existingIds = chat.participants.map(p => p.user_id)
      let updated = false
      for (const m of members) {
        if (!existingIds.includes(m.user_id)) {
          chat.participants.push({
            user_id: m.user_id,
            name: m.name,
            joined_at: new Date(),
          })
          updated = true
        }
      }
      // Remove participants who are no longer members
      const memberIds = members.map(m => m.user_id)
      if (chat.participants.length !== members.length) {
        chat.participants = chat.participants.filter(p => memberIds.includes(p.user_id))
        updated = true
      }
      if (updated) await chat.save()
    }

    res.json(chat)
  } catch (error) {
    console.error("[v0] Error fetching committee group chat:", error)
    res.status(500).json({ error: "Failed to fetch committee group chat" })
  }
})

export default router
