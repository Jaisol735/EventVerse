import mongoose from "mongoose"

const livestreamSchema = new mongoose.Schema({
  event_id: Number,
  committee_id: Number,
  title: String,
  description: String,
  likes: [{ user_id: Number, timestamp: Date }],
  comments: [
    {
      user_id: Number,
      text: String,
      timestamp: Date,
    },
  ],
  stream_url: String,
})

export default mongoose.model("Livestream", livestreamSchema)
