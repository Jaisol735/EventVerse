import mongoose from "mongoose"

const userLikeSchema = new mongoose.Schema({
  user_id: { type: Number, required: true },
  hashtag: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
})

export default mongoose.model("UserLike", userLikeSchema)
