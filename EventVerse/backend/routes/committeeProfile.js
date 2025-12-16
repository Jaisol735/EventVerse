import express from "express"
import multer from "multer"
import cloudinary from "../config/cloudinary.js"
import CommitteeProfile from "../models/CommitteeProfile.js"
import { authenticateToken } from "../middleware/auth.js"
import db from "../config/mysql.js"

const router = express.Router()

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true)
    } else {
      cb(new Error("Only image files are allowed"), false)
    }
  },
})

// Upload committee profile image
router.post("/", authenticateToken, upload.single("image"), async (req, res) => {
  try {
    const { committee_id } = req.body
    const userId = req.user.userId

    console.log("[v0] Committee profile image upload request:", { committee_id, userId })

    if (!committee_id) {
      return res.status(400).json({ error: "Committee ID is required" })
    }

    if (!req.file) {
      return res.status(400).json({ error: "Image file is required" })
    }

    // Check if user is committee head
    const [committees] = await db.execute("SELECT * FROM Committees WHERE committee_id = ? AND head_id = ?", [
      committee_id,
      userId,
    ])

    if (committees.length === 0) {
      return res.status(403).json({ error: "Only committee head can upload profile image" })
    }

    console.log("[v0] User is committee head, proceeding with upload")

    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.v2.uploader
        .upload_stream(
          {
            resource_type: "image",
            folder: "committee_profiles",
            public_id: `committee_${committee_id}_${Date.now()}`,
          },
          (error, result) => {
            if (error) reject(error)
            else resolve(result)
          },
        )
        .end(req.file.buffer)
    })

    console.log("[v0] Image uploaded to Cloudinary:", uploadResult.secure_url)

    // Save or update committee profile in MongoDB
    let committeeProfile = await CommitteeProfile.findOne({ committee_id: committee_id.toString() })

    if (committeeProfile) {
      // Update existing profile
      committeeProfile.cloudinary_url = uploadResult.secure_url
      committeeProfile.updatedAt = new Date()
      await committeeProfile.save()
      console.log("[v0] Updated existing committee profile")
    } else {
      // Create new profile
      committeeProfile = new CommitteeProfile({
        committee_id: committee_id.toString(),
        cloudinary_url: uploadResult.secure_url,
        description: req.body.description || "",
        members: [],
      })
      await committeeProfile.save()
      console.log("[v0] Created new committee profile")
    }

    res.json({
      success: true,
      message: "Committee profile image uploaded successfully",
      profile: committeeProfile,
    })
  } catch (error) {
    console.error("[v0] Error uploading committee profile image:", error)
    res.status(500).json({ error: "Failed to upload committee profile image" })
  }
})

// Get committee profile
router.get("/:committeeId", authenticateToken, async (req, res) => {
  try {
    const { committeeId } = req.params

    console.log("[v0] Getting committee profile for ID:", committeeId)

    const committeeProfile = await CommitteeProfile.findOne({ committee_id: committeeId })

    if (!committeeProfile) {
      console.log("[v0] No profile found for committee:", committeeId)
      return res.json({ success: false, profile: null })
    }

    console.log("[v0] Found committee profile:", committeeProfile.cloudinary_url)

    res.json({
      success: true,
      profile: committeeProfile,
    })
  } catch (error) {
    console.error("[v0] Error getting committee profile:", error)
    res.status(500).json({ error: "Failed to get committee profile" })
  }
})

// Update committee profile description
router.put("/:committeeId", authenticateToken, async (req, res) => {
  try {
    const { committeeId } = req.params
    const { description } = req.body
    const userId = req.user.userId

    console.log("[v0] Updating committee profile description:", { committeeId, description, userId })

    // Check if user is committee head
    const [committees] = await db.execute("SELECT * FROM Committees WHERE committee_id = ? AND head_id = ?", [
      committeeId,
      userId,
    ])

    if (committees.length === 0) {
      return res.status(403).json({ error: "Only committee head can update profile" })
    }

    const committeeProfile = await CommitteeProfile.findOneAndUpdate(
      { committee_id: committeeId },
      {
        description: description,
        updatedAt: new Date(),
      },
      { new: true, upsert: true },
    )

    console.log("[v0] Updated committee profile description")

    res.json({
      success: true,
      message: "Committee profile updated successfully",
      profile: committeeProfile,
    })
  } catch (error) {
    console.error("[v0] Error updating committee profile:", error)
    res.status(500).json({ error: "Failed to update committee profile" })
  }
})

export default router
