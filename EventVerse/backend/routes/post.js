import express from "express"
import multer from "multer"
import cloudinary from "../config/cloudinary.js"
import Post from "../models/Post.js"
import HashtagHistory from "../models/HashtagHistory.js"
import UserLike from "../models/UserLike.js"
import { authenticateToken } from "../middleware/auth.js"
import db from "../config/mysql.js"
import mongoose from "mongoose"

const router = express.Router()
const upload = multer({ dest: "uploads/" })
const PY_SERVICE_URL = process.env.PY_SERVICE_URL || "http://127.0.0.1:8000"

// Utility function to check if UserLike or HashtagHistory exists for a user
async function userHasHistory(userId) {
  const userLikeCount = await UserLike.countDocuments({ user_id: userId })
  const hashtagHistoryCount = await HashtagHistory.countDocuments({ user_id: userId })
  console.log(`[v0] UserLike count for user ${userId}:`, userLikeCount)
  console.log(`[v0] HashtagHistory count for user ${userId}:`, hashtagHistoryCount)
  return userLikeCount > 0 || hashtagHistoryCount > 0
}

// Get posts by committee
router.get("/committee/:committeeId", authenticateToken, async (req, res) => {
  try {
    const { committeeId } = req.params
    console.log("[v0] Fetching posts for committee:", committeeId)

    // Verify committee exists
    const [committees] = await db.execute("SELECT * FROM Committees WHERE committee_id = ?", [committeeId])

    if (committees.length === 0) {
      console.log("[v0] Committee not found:", committeeId)
      return res.status(404).json({ error: "Committee not found" })
    }

    // Get posts for this committee
    const posts = await Post.find({ committee_id: Number.parseInt(committeeId) }).sort({ created_at: -1 })
    console.log("[v0] Found committee posts:", posts.length)

    res.json(posts)
  } catch (error) {
    console.error("[v0] Error fetching committee posts:", error)
    res.status(500).json({ error: "Failed to fetch committee posts" })
  }
})

// Get posts by user
router.get("/user/:userId", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params
    console.log("[v0] Fetching posts for user:", userId)

    const posts = await Post.find({ author_id: Number.parseInt(userId) }).sort({ created_at: -1 })
    console.log("[v0] Found user posts:", posts.length)

    res.json(posts)
  } catch (error) {
    console.error("[v0] Error fetching user posts:", error)
    res.status(500).json({ error: "Failed to fetch user posts" })
  }
})

// Get recommended and latest posts for feed
router.get("/feed", authenticateToken, async (req, res) => {
  try {
    console.log("[v0] /feed route called (fixed order + enhanced)")
    const PY_SERVICE_URL = process.env.PY_SERVICE_URL || "http://127.0.0.1:8000"
    const userId = req.user.userId

    // 1) quick exits
    const totalPosts = await Post.countDocuments()
    if (totalPosts === 0) {
      return res.json({ recommended: [], latest: [], meta: { userId, message: "No posts found" } })
    }

    const userLikeCount = await UserLike.countDocuments({ user_id: userId })
    if (userLikeCount === 0) {
      const posts = await Post.find().sort({ created_at: -1 })
      return res.json({
        recommended: [],
        latest: posts,
        meta: { userId, message: "No user like history, showing all posts" },
      })
    }

    // 2) last 3 distinct hashtags user liked (recency)
    const recentHashtagsAgg = await UserLike.aggregate([
      { $match: { user_id: userId } },
      { $sort: { created_at: -1 } },
      { $group: { _id: "$hashtag", mostRecent: { $first: "$created_at" } } },
      { $sort: { mostRecent: -1 } },
      { $limit: 3 },
    ])
    const last3 = recentHashtagsAgg.map((d) => String(d._id))
    console.log("[v0] last3 hashtags:", last3)

    // 3) collect the universe of hashtags from HashtagHistory to search exact/semantic matches
    let allHashtags = await HashtagHistory.distinct("hashtags")
    // normalize to strings without '#'
    allHashtags = (allHashtags || []).map((h) => String(h).replace(/^#/, "").trim()).filter(Boolean)

    // 4) call Python recommendation service with the universe list so it can search "exact and almost similar" in HashtagHistory
    let recommendedTags = []
    if (last3.length > 0) {
      try {
        const resp = await fetch(`${PY_SERVICE_URL}/recommend`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ words: last3, hashtags: allHashtags }),
        })
        const data = await resp.json().catch(() => ({}))
        if (resp.ok && data?.results && typeof data.results === "object") {
          recommendedTags = [
            ...new Set(
              Object.values(data.results)
                .flat()
                .map((tag) => String(tag).replace(/^#/, "").trim())
                .filter(Boolean),
            ),
          ]
        } else {
          console.warn("[v0] Python recommend returned invalid shape, fallback to last3")
          recommendedTags = last3
        }
      } catch (e) {
        console.warn("[v0] Python recommend failed, fallback to last3:", e.message)
        recommendedTags = last3
      }
    }

    // 5) fetch recommended posts and rest(latest) without duplicates
    const recommended = recommendedTags.length
      ? await Post.find({ hashtags_ai: { $in: recommendedTags } }).sort({ created_at: -1 })
      : []

    const recommendedIds = new Set(recommended.map((p) => String(p._id)))
    const latest = await Post.find({ _id: { $nin: Array.from(recommendedIds) } }).sort({ created_at: -1 })

    return res.json({
      recommended,
      latest,
      meta: {
        userId,
        seedHashtags: last3,
        recommendedTags,
      },
    })
  } catch (error) {
    console.error("[v0] Error fetching feed (enhanced):", error)
    res.status(500).json({ error: "Failed to fetch feed" })
  }
})

router.get("/feed/:userId", authenticateToken, async (req, res) => {
  try {
    console.log("[v0] /feed/:userId route called (fixed order + enhanced)")
    const PY_SERVICE_URL = process.env.PY_SERVICE_URL || "http://127.0.0.1:8000"
    const userIdRaw = req.params.userId
    const userId = userIdRaw ? Number.parseInt(userIdRaw) : req.user.userId

    const recentHashtagsAgg = await UserLike.aggregate([
      { $match: { user_id: userId } },
      { $sort: { created_at: -1 } },
      { $group: { _id: "$hashtag", mostRecent: { $first: "$created_at" } } },
      { $sort: { mostRecent: -1 } },
      { $limit: 3 },
    ])
    const last3 = recentHashtagsAgg.map((d) => String(d._id))

    let allHashtags = await HashtagHistory.distinct("hashtags")
    allHashtags = (allHashtags || []).map((h) => String(h).replace(/^#/, "").trim()).filter(Boolean)

    let recommendedTags = []
    if (last3.length > 0) {
      try {
        const resp = await fetch(`${PY_SERVICE_URL}/recommend`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ words: last3, hashtags: allHashtags }),
        })
        const data = await resp.json().catch(() => ({}))
        if (resp.ok && data?.results && typeof data.results === "object") {
          recommendedTags = [
            ...new Set(
              Object.values(data.results)
                .flat()
                .map((tag) => String(tag).replace(/^#/, "").trim())
                .filter(Boolean),
            ),
          ]
        } else {
          recommendedTags = last3
        }
      } catch (e) {
        console.warn("[v0] Python recommend failed, fallback to last3:", e.message)
        recommendedTags = last3
      }
    }

    const recommended = recommendedTags.length
      ? await Post.find({ hashtags_ai: { $in: recommendedTags } }).sort({ created_at: -1 })
      : []
    const recommendedIds = new Set(recommended.map((p) => String(p._id)))
    const latest = await Post.find({ _id: { $nin: Array.from(recommendedIds) } }).sort({ created_at: -1 })

    return res.json({
      recommended,
      latest,
      meta: { userId, seedHashtags: last3, recommendedTags },
    })
  } catch (error) {
    console.error("[v0] Error fetching feed/:userId (enhanced):", error)
    res.status(500).json({ error: "Failed to fetch feed" })
  }
})

// Get all posts
router.get("/", authenticateToken, async (req, res) => {
  try {
    const posts = await Post.find().sort({ created_at: -1 })
    res.json(posts)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get a single post by id
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    // Validate ObjectId before querying
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid post id" })
    }
    const post = await Post.findById(req.params.id)
    if (!post) {
      return res.status(404).json({ error: "Post not found" })
    }
    return res.json(post)
  } catch (error) {
    console.error("[v0] Error fetching post by id:", error)
    return res.status(500).json({ error: "Failed to fetch post" })
  }
})

// Create Post
router.post("/", authenticateToken, upload.single("media"), async (req, res) => {
  try {
    console.log("[v0] Creating new post:", req.body)

    if (!req.file) {
      console.error("[v0] No file uploaded")
      return res.status(400).json({ error: "No file uploaded" })
    }
    console.log("[v0] File received:", {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    })

    // Required log: sending to cloud
    console.log("[v0] send to cloud")

    const result = await cloudinary.v2.uploader.upload(req.file.path, {
      resource_type: req.body.type === "video" ? "video" : "image",
    })

    // Required log: url received
    console.log("[v0] url recieved:", result.secure_url)

    // Prefer AI generation if client did not provide fields
    let descriptionAI = req.body.description_ai
    let hashtagsAI = req.body.hashtags_ai ? req.body.hashtags_ai.split(",") : null

    if (!descriptionAI || !hashtagsAI || hashtagsAI.length === 0) {
      try {
        console.log("[v0] Sending url to app.py for analyze...")
        const resp = await fetch(`${PY_SERVICE_URL}/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileUrl: result.secure_url,
            mediaType: req.body.type,
          }),
        })
        const data = await resp.json()
        console.log("[v0] AI analyze response:", data)
        if (resp.ok && data?.ok !== false) {
          descriptionAI = data.description || descriptionAI
          hashtagsAI = (data.hashtags_clean || data.hashtags || []).map((h) => String(h).replace(/^#/, ""))
          console.log("[v0] AI analyze result parsed:", { descriptionAI, hashtagsAI })
        } else {
          console.warn("[v0] AI analyze failed:", data?.error || "unknown error")
        }
      } catch (err) {
        console.warn("[v0] Error calling Python analyze:", err.message)
      }
    }

    const post = new Post({
      author_id: req.user.userId,
      committee_id: req.body.committee_id ? Number.parseInt(req.body.committee_id) : null,
      type: req.body.type,
      cloudinary_url: result.secure_url,
      description_ai: descriptionAI || null,
      description_user: req.body.description_user || null,
      hashtags_ai: Array.isArray(hashtagsAI) ? hashtagsAI : [],
      created_at: new Date(),
    })

    await post.save()
    console.log("[v0] Post created successfully:", post._id)

    // Save hashtag history: create one document per hashtag (each with single-element array)
    if (Array.isArray(hashtagsAI) && hashtagsAI.length > 0) {
      try {
        const docs = hashtagsAI.map((tag) => ({
          user_id: req.user.userId,
          post_id: post._id,
          hashtags: [String(tag)],
          source: "ai",
        }))
        const inserted = await HashtagHistory.insertMany(docs)
        console.log("[v0] HashtagHistory saved entries:", inserted.length)
      } catch (e) {
        console.warn("[v0] Failed to save HashtagHistory:", e.message)
      }
    }

    res.json(post)
  } catch (err) {
    console.error("[v0] Error creating post:", err)
    res.status(500).json({ error: err.message })
  }
})

// Like/Unlike post
router.post("/:id/like", authenticateToken, async (req, res) => {
  try {
    console.log("[v0] Toggling like for post:", req.params.id)

    const post = await Post.findById(req.params.id)
    if (!post) {
      return res.status(404).json({ error: "Post not found" })
    }

    const userId = req.user.userId
    const existingLike = post.likes.find((like) => like.user_id === userId)

    if (existingLike) {
      // Unlike
      post.likes = post.likes.filter((like) => like.user_id !== userId)
      console.log("[v0] Post unliked")
    } else {
      // Like + record user hashtag preferences
      post.likes.push({ user_id: userId, timestamp: new Date() })
      console.log("[v0] Post liked")

      // Record one document per hashtag for preference history
      const tags = Array.isArray(post.hashtags_ai) ? post.hashtags_ai : []
      if (tags.length > 0) {
        try {
          await UserLike.insertMany(
            tags.map((tag) => ({
              user_id: userId,
              hashtag: String(tag),
              created_at: new Date(),
            })),
          )
        } catch (e) {
          console.warn("[v0] Failed to record UserLike history:", e.message)
        }
      }
    }

    await post.save()
    res.json(post)
  } catch (error) {
    console.error("[v0] Error toggling like:", error)
    res.status(500).json({ error: error.message })
  }
})

// Add comment
router.post("/:id/comments", authenticateToken, async (req, res) => {
  try {
    console.log("[v0] Adding comment to post:", req.params.id)

    const post = await Post.findById(req.params.id)
    if (!post) {
      return res.status(404).json({ error: "Post not found" })
    }

    const comment = {
      comment_id: new Date().getTime().toString(),
      user_id: req.user.userId,
      text: req.body.text,
      timestamp: new Date(),
    }

    post.comments.push(comment)
    await post.save()
    console.log("[v0] Comment added successfully")
    res.json(post)
  } catch (error) {
    console.error("[v0] Error adding comment:", error)
    res.status(500).json({ error: error.message })
  }
})

export default router
