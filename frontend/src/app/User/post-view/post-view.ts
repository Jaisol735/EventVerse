import { Component, OnInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import { ActivatedRoute, Router } from "@angular/router"
import { PostService, Post } from "../../services/post.service"
import { AuthService, User } from "../../services/auth.service"

@Component({
  selector: "app-post-view",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./post-view.html",
  styleUrls: ["./post-view.css"],
})
export class PostViewComponent implements OnInit {
  postId!: string
  post: Post | null = null
  currentUser: User | null = null
  loading = true
  likeBusy = false

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private postService: PostService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.currentUserValue
    this.postId = this.route.snapshot.paramMap.get("postId") || ""
    if (!this.postId) {
      this.goBack()
      return
    }
    this.fetchPost()
  }

  fetchPost(): void {
    this.loading = true
    this.postService.getPostById(this.postId).subscribe({
      next: (p) => {
        this.post = p
        this.loading = false
      },
      error: () => {
        this.loading = false
        this.goBack()
      },
    })
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.router.navigateByUrl("/home").then(() => window.history.back())
    } else {
      this.router.navigate(["/home"])
    }
  }

  isLiked(): boolean {
    const uid = this.currentUser?.user_id
    return !!(uid && this.post?.likes?.some((l) => l.user_id === uid))
  }

  like(): void {
    if (!this.post || this.likeBusy) return
    const uid = this.currentUser?.user_id
    if (!uid) return
    if (this.isLiked()) return // like-only per spec; prevent unlike

    this.likeBusy = true
    this.postService.likePost(this.post._id).subscribe({
      next: () => {
        this.post!.likes.push({ user_id: uid, timestamp: new Date() as any })
        this.likeBusy = false
      },
      error: () => {
        this.likeBusy = false
      },
    })
  }

  onHashtagClick(tag: string): void {
    // Placeholder: could navigate to a search page or filter feed by hashtag
    console.log("[v0] Hashtag clicked:", tag)
  }
}
