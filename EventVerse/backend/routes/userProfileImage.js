import express from "express"
import multer from "multer"
import cloudinary from "../config/cloudinary.js"
import UserProfileImage from "../models/UserProfileImage.js"
import { authenticateToken } from "../middleware/auth.js"

const router = express.Router()
const upload = multer({ dest: "uploads/" })

router.post("/upload", authenticateToken, upload.single("image"), async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      console.log("[v0] Backend: ❌ User not authenticated or userId missing:", req.user)
      return res.status(401).json({ error: "User not authenticated" })
    }

    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" })
    }

    console.log("[v0] Backend: Starting profile image upload for user:", req.user.userId)
    console.log("[v0] Backend: User object:", req.user)
    console.log("[v0] Backend: File details:", { name: req.file.originalname, size: req.file.size })

    // Upload to Cloudinary
    console.log("[v0] Backend: Uploading to Cloudinary...")
    const result = await cloudinary.v2.uploader.upload(req.file.path, {
      folder: "user-profiles",
      public_id: `user_${req.user.userId}_${Date.now()}`,
    })
    console.log("[v0] Backend: ✅ Cloudinary upload successful, URL:", result.secure_url)

    // Save to database
    console.log("[v0] Backend: Saving to MongoDB...")
    await UserProfileImage.create(req.user.userId, result.secure_url)
    console.log("[v0] Backend: ✅ MongoDB save successful")

    res.json({
      success: true,
      message: "Profile image uploaded successfully",
      image_url: result.secure_url,
      publicId: result.public_id,
    })
    console.log("[v0] Backend: ✅ Response sent to frontend")
  } catch (error) {
    console.error("[v0] Backend: ❌ Error uploading profile image:", error)
    res.status(500).json({ success: false, error: "Failed to upload profile image" })
  }
})

router.get("/", authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      console.log("[v0] Backend: ❌ User not authenticated or userId missing:", req.user)
      return res.status(401).json({ error: "User not authenticated" })
    }

    console.log("[v0] Backend: Fetching profile image for authenticated user:", req.user.userId)
    const profileImage = await UserProfileImage.getByUserId(req.user.userId)

    if (!profileImage) {
      return res.status(404).json({ error: "No profile image found" })
    }

    res.json(profileImage)
  } catch (error) {
    console.error("[v0] Error getting profile image:", error)
    res.status(500).json({ error: "Failed to get profile image" })
  }
})

router.get("/:userId", async (req, res) => {
  try {
    const profileImage = await UserProfileImage.getByUserId(req.params.userId)

    if (!profileImage) {
      return res.status(404).json({ error: "No profile image found" })
    }

    res.json(profileImage)
  } catch (error) {
    console.error("[v0] Error getting profile image:", error)
    res.status(500).json({ error: "Failed to get profile image" })
  }
})

router.delete("/", authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      console.log("[v0] Backend: ❌ User not authenticated or userId missing:", req.user)
      return res.status(401).json({ error: "User not authenticated" })
    }

    await UserProfileImage.delete(req.user.userId)
    res.json({ message: "Profile image deleted successfully" })
  } catch (error) {
    console.error("[v0] Error deleting profile image:", error)
    res.status(500).json({ error: "Failed to delete profile image" })
  }
})

export default router
