import { Component, OnInit, Input } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { Router } from "@angular/router" // add router
import { PostService, Post } from "../../services/post.service"
import { AuthService, User } from "../../services/auth.service"

@Component({
  selector: "app-posts-grid",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./post-grid.html",
  styleUrls: ["./post-grid.css"],
})
export class PostsGridComponent implements OnInit {
  @Input() committeeId?: number
  @Input() showRecommendations = true

  currentUser: User | null = null
  recommendedPosts: Post[] = []
  latestPosts: Post[] = []
  allPosts: Post[] = []
  loading = true
  newComment: { [postId: string]: string | undefined } = {}
  noPostsMessage: string = ""

  constructor(
    private postService: PostService,
    private authService: AuthService,
    private router: Router, // add router
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user
    })

    this.loadPosts()
  }

  loadPosts(): void {
    console.log("[frontend] loadPosts called")
    if (this.committeeId) {
      this.loadCommitteePosts()
    } else if (this.showRecommendations) {
      this.loadRecommendedPosts()
    } else {
      this.loadLatestPosts()
    }
  }

  loadCommitteePosts(): void {
    console.log("[frontend] loadCommitteePosts called")
    this.postService.getCommitteePosts(this.committeeId!).subscribe({
      next: (posts) => {
        this.allPosts = posts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        this.loading = false
        if (!this.allPosts.length) {
          this.noPostsMessage = "No posts found"
          console.log("[frontend] No posts found for committee")
        }
      },
      error: (error) => {
        console.error("Error loading committee posts:", error)
        this.loading = false
        this.noPostsMessage = "No posts found"
      },
    })
  }

  loadRecommendedPosts(): void {
    console.log("[frontend] loadRecommendedPosts called")
    this.postService.getPostsWithRecommendations().subscribe({
      next: (response) => {
        this.recommendedPosts = response.recommended || []
        this.latestPosts = response.latest || []

        const recommendedIds = new Set(this.recommendedPosts.map((p) => p._id))
        const filteredLatest = this.latestPosts.filter((p) => !recommendedIds.has(p._id))

        this.allPosts = [...this.recommendedPosts, ...filteredLatest]
        this.loading = false
        if (!this.allPosts.length) {
          this.noPostsMessage = response?.meta?.message || "No posts found"
          console.log("[frontend] No posts found in feed")
        }
      },
      error: (error) => {
        console.error("Error loading recommended posts:", error)
        this.loadLatestPosts()
      },
    })
  }

  loadLatestPosts(): void {
    console.log("[frontend] loadLatestPosts called")
    this.postService.getPosts().subscribe({
      next: (posts) => {
        this.allPosts = posts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        this.loading = false
        if (!this.allPosts.length) {
          this.noPostsMessage = "No posts found"
          console.log("[frontend] No posts found in latest")
        }
      },
      error: (error) => {
        console.error("Error loading posts:", error)
        this.loading = false
        this.noPostsMessage = "No posts found"
      },
    })
  }

  likePost(post: Post): void {
    const userId = this.currentUser?.user_id
    if (!userId) return

    const isLiked = post.likes.some((like) => like.user_id === userId)

    if (!isLiked) {
      this.postService.likePost(post._id).subscribe({
        next: () => {
          post.likes.push({ user_id: userId, timestamp: new Date() })
          if (this.showRecommendations) {
            this.loadRecommendedPosts()
          }
        },
        error: (error) => console.error("Error liking post:", error),
      })
    }
  }

  addComment(post: Post): void {
    const commentText = this.newComment[post._id]
    if (!commentText || !commentText.trim()) return

    this.postService.addComment(post._id, commentText).subscribe({
      next: (response) => {
        post.comments.push({
          comment_id: response.comment_id,
          user_id: this.currentUser!.user_id,
          text: commentText,
          timestamp: new Date(),
        })
        this.newComment[post._id] = ""
      },
      error: (error) => console.error("Error adding comment:", error),
    })
  }

  isLikedByUser(post: Post): boolean {
    const userId = this.currentUser?.user_id
    return userId ? post.likes.some((like) => like.user_id === userId) : false
  }

  isRecommendedPost(post: Post): boolean {
    return this.recommendedPosts.some((p) => p._id === post._id)
  }

  getTimeAgo(date: Date): string {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000)

    if (diffInSeconds < 60) return `${diffInSeconds}s`
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`
    return `${Math.floor(diffInSeconds / 86400)}d`
  }

  openPost(post: Post): void {
    this.router.navigate([`/post/${post._id}/view`])
  }
}
