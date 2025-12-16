import mongoose from "mongoose"

const recommendationSchema = new mongoose.Schema({
  user_id: Number,
  liked_hashtags: [String],
  last_updated: { type: Date, default: Date.now },
})

export default mongoose.model("Recommendation", recommendationSchema)
