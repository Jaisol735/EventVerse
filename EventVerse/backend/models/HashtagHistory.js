import mongoose from "mongoose"

const hashtagHistorySchema = new mongoose.Schema({
  user_id: { type: Number, required: true },
  post_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  hashtags: { type: [String], default: [] },
  source: { type: String, enum: ["ai", "user"], default: "ai" },
  created_at: { type: Date, default: Date.now },
})

export default mongoose.model("HashtagHistory", hashtagHistorySchema)
