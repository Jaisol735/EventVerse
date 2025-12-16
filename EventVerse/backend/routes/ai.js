import express from "express"

const router = express.Router()
const PY_SERVICE_URL = process.env.PY_SERVICE_URL || "http://127.0.0.1:8000"

// POST /api/ai/analyze
router.post("/analyze", async (req, res) => {
  try {
    const resp = await fetch(`${PY_SERVICE_URL}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileUrl: req.body.fileUrl,
        filePath: req.body.filePath, // optional for Windows local path workflows
        mediaType: req.body.mediaType,
      }),
    })

    const data = await resp.json()
    if (!resp.ok || data?.ok === false) {
      return res.status(400).json({ error: data?.error || "Analyze failed" })
    }
    return res.json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
})

// POST /api/ai/recommend
router.post("/recommend", async (req, res) => {
  try {
    const payload = {
      words: req.body.words || [],
      hashtags: req.body.hashtags, // optional list, else Python will load from file
      hashtagsFilePath: req.body.hashtagsFilePath, // optional Windows path to hashtags.txt
    }

    const resp = await fetch(`${PY_SERVICE_URL}/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    const data = await resp.json()
    if (!resp.ok || data?.ok === false) {
      return res.status(400).json({ error: data?.error || "Recommend failed" })
    }
    return res.json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
})

export default router
