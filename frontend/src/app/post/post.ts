import { Component, OnInit } from "@angular/core"
import { ActivatedRoute } from "@angular/router"
import { PostService } from "../services/post.service"

@Component({
  selector: "app-post",
  imports: [],
  templateUrl: "./post.html",
  styleUrls: ["./post.css"],
})
export class PostComponent implements OnInit {
  selectedFile: File | null = null
  uploadType: "image" | "video" | null = null
  userId: string | null = null
  committeeId: string | null = null
  showForm = false
  uploading = false
  uploadSuccess = false
  uploadError = ""

  constructor(
    private route: ActivatedRoute,
    private postService: PostService,
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      this.userId = params["user_id"] || null
      this.committeeId = params["committee_id"] || null
      console.log("[PostComponent] Query params:", params, "userId:", this.userId, "committeeId:", this.committeeId)
    })
  }

  onFileSelected(event: any, type: "image" | "video") {
    const file = event.target.files[0]
    console.log("[PostComponent] File selected:", file?.name, "type:", type)
    if (file) {
      this.selectedFile = file
      this.uploadType = type
      this.showForm = true
      this.uploadSuccess = false
      this.uploadError = ""
    }
  }

  upload(event?: Event) {
    event?.preventDefault()
    if (!this.selectedFile || !this.uploadType) {
      console.warn("[PostComponent] No file or type selected")
      return
    }
    if (!this.userId && !this.committeeId) {
      this.uploadError = "Missing user or committee context"
      return
    }

    this.uploading = true
    this.uploadSuccess = false
    this.uploadError = ""
    console.log("[PostComponent] Starting upload...")

    const formData = new FormData()
    formData.append("media", this.selectedFile)
    formData.append("type", this.uploadType)
    if (this.userId) formData.append("user_id", this.userId)
    if (this.committeeId) formData.append("committee_id", this.committeeId)

    this.postService.createPost(formData).subscribe({
      next: (resp) => {
        console.log("[PostComponent] Upload success:", resp)
        this.uploading = false
        this.uploadSuccess = true
        this.showForm = false
        this.selectedFile = null
        this.uploadType = null
      },
      error: (err) => {
        console.error("[PostComponent] Upload error:", err)
        this.uploading = false
        this.uploadError = err?.error?.error || "Upload failed"
      },
    })
  }
}
