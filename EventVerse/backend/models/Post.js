import mongoose from "mongoose"

const postSchema = new mongoose.Schema({
  author_id: Number,
  committee_id: { type: Number, default: null },
  type: { type: String, enum: ["image", "video"] },
  cloudinary_url: String,
  description_ai: String,
  description_user: { type: String, default: null },
  hashtags_ai: [String],
  likes: [{ user_id: Number, timestamp: Date }],
  comments: [
    {
      comment_id: mongoose.Schema.Types.ObjectId,
      user_id: Number,
      text: String,
      timestamp: Date,
    },
  ],
  created_at: { type: Date, default: Date.now },
})

export default mongoose.model("Post", postSchema)
