import express from "express"
import multer from "multer"
import { v2 as cloudinary } from "cloudinary"
import { authenticateToken } from "../middleware/auth.js"
import Chat from "../models/Chat.js"
import GroupChatProfileImage from "../models/GroupChatProfileImage.js"

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage() })

router.post("/:chatId/upload", authenticateToken, upload.single("image"), async (req, res) => {
  try {
    const { chatId } = req.params
    console.log("[v0] Uploading group chat profile image for chat:", chatId)

    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" })
    }

    // Verify user is in the group chat
    const chat = await Chat.findById(chatId)
    if (!chat || chat.chat_type !== "group") {
      return res.status(404).json({ error: "Group chat not found" })
    }

    const isParticipant = chat.participants.some((p) => p.user_id === req.user.userId)
    if (!isParticipant) {
      return res.status(403).json({ error: "Not authorized to upload image for this group" })
    }

    console.log("[v0] User authorized, uploading to Cloudinary...")

    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            resource_type: "image",
            folder: "group_chat_profiles",
            transformation: [{ width: 200, height: 200, crop: "fill" }, { quality: "auto" }],
          },
          (error, result) => {
            if (error) reject(error)
            else resolve(result)
          },
        )
        .end(req.file.buffer)
    })

    console.log("[v0] Image uploaded to Cloudinary:", uploadResult.secure_url)

    // Delete old profile image if exists
    const oldImage = await GroupChatProfileImage.findOne({ chat_id: chatId })
    if (oldImage) {
      await cloudinary.uploader.destroy(oldImage.cloudinary_public_id)
      await GroupChatProfileImage.deleteOne({ chat_id: chatId })
      console.log("[v0] Deleted old profile image")
    }

    // Save new profile image
    const profileImage = new GroupChatProfileImage({
      chat_id: chatId,
      image_url: uploadResult.secure_url,
      uploaded_by: req.user.userId,
      cloudinary_public_id: uploadResult.public_id,
    })

    await profileImage.save()
    console.log("[v0] Group chat profile image saved to MongoDB")

    // Add message to group chat
    chat.messages.push({
      sender_id: req.user.userId,
      sender_name: req.user.name,
      content: `${req.user.name} updated the group photo`,
      message_type: "text",
      timestamp: new Date(),
    })
    chat.updated_at = new Date()
    await chat.save()

    res.json({
      message: "Group chat profile image uploaded successfully",
      image_url: uploadResult.secure_url,
    })
  } catch (error) {
    console.error("[v0] Error uploading group chat profile image:", error)
    res.status(500).json({ error: "Failed to upload group chat profile image" })
  }
})

router.get("/:chatId", async (req, res) => {
  try {
    const { chatId } = req.params
    console.log("[v0] Fetching group chat profile image for chat:", chatId)

    const profileImage = await GroupChatProfileImage.findOne({ chat_id: chatId })

    if (!profileImage) {
      return res.status(404).json({ error: "No profile image found" })
    }

    console.log("[v0] Group chat profile image found")
    res.json(profileImage)
  } catch (error) {
    console.error("[v0] Error fetching group chat profile image:", error)
    res.status(500).json({ error: "Failed to fetch group chat profile image" })
  }
})

export default router
