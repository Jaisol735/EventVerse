import { Component, OnInit, OnDestroy } from "@angular/core"
import { CommonModule } from "@angular/common"
import { ActivatedRoute, Router } from "@angular/router"
import { FormsModule } from "@angular/forms"
import { Subject, takeUntil } from "rxjs"
import  { CommitteeService, Committee, CommitteeMember } from "../../services/committee.service"
import { AuthService, User } from "../../services/auth.service"
import { PostService, Post } from "../../services/post.service"
import { ChatService } from "../../services/chat.service"
import { NotificationService } from "../../services/notification.service"
import { CommitteePostGridComponent } from "../committee-post-grid/committee-post-grid"
import { CommitteeGroupChatComponent } from "../committee-group-chat/committee-group-chat"
import { CommitteeHeadChatboxComponent } from "../committee-head-chatbox/committee-head-chatbox"

@Component({
  selector: "app-committee-home",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CommitteePostGridComponent,
    CommitteeGroupChatComponent,
    CommitteeHeadChatboxComponent,
  ],
  templateUrl: "./committee-home.html",
  styleUrls: ["./committee-home.css"],
})
export class CommitteeHomeComponent implements OnInit, OnDestroy {
  currentUser: User | null = null
  committee: Committee | null = null
  committeeId = 0
  isCommitteeHead = false
  isCommitteeMember = false

  // Active section
  activeSection: "posts" | "groupChat" | "headChat" = "posts"

  // Committee profile data
  committeeProfileImage: string | null = null
  selectedFile: File | null = null
  uploadingImage = false

  // Posts data
  committeePosts: Post[] = []
  loadingPosts = false

  // Chat data
  groupChatMessages: any[] = []
  headChatMessages: any[] = []
  newMessage = ""
  loadingMessages = false

  // Change head modal state + search suggestions
  showChangeHeadModal = false
  memberSearchTerm = ""
  memberSuggestions: CommitteeMember[] = []
  selectedNewHead: CommitteeMember | null = null
  searchingMembers = false
  savingHead = false

  committeeMembers: CommitteeMember[] = [] // Store all members

  private destroy$ = new Subject<void>()
  private hasLoadedCommittee = false

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private committeeService: CommitteeService,
    private authService: AuthService,
    private postService: PostService,
    private chatService: ChatService,
    private notificationService: NotificationService,
  ) {}

  ngOnInit(): void {
    console.log("[v0] Committee Home component initialized")

    // Get current user
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user
      console.log("[v0] Current user:", user)
      this.tryLoadCommitteeData()
    })

    // Get committee ID from route
    this.route.params.subscribe((params) => {
      this.committeeId = +params["committeeId"]
      console.log("[v0] Committee ID from route:", this.committeeId)
      this.hasLoadedCommittee = false
      this.tryLoadCommitteeData()
    })
  }

  ngOnDestroy(): void {
    this.destroy$.next()
    this.destroy$.complete()
  }

  loadCommitteeData(): void {
    console.log("[v0] Loading committee data for ID:", this.committeeId)

    // Load committee details
    this.committeeService
      .getCommitteeById(this.committeeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (committee) => {
          this.committee = committee
          console.log("[v0] Loaded committee:", committee)

          // Check if current user is head
          this.isCommitteeHead = this.currentUser?.user_id === committee.head_id
          console.log("[v0] Is committee head:", this.isCommitteeHead)

          // Check if user is member
          this.checkMembership()

          // Load committee profile image
          this.loadCommitteeProfile()

          // Load all committee members for member count and change head
          this.loadCommitteeMembers()

          // Load initial data based on active section
          this.loadSectionData()
        },
        error: (error) => {
          console.error("[v0] Error loading committee:", error)
        },
      })
  }

  loadCommitteeMembers(): void {
    if (!this.committeeId) return
    this.committeeService
      .getCommitteeMembers(this.committeeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (members) => {
          this.committeeMembers = members
          console.log("[v0] Loaded committee members:", members.length)
        },
        error: (error) => {
          console.error("[v0] Error loading committee members:", error)
          this.committeeMembers = []
        },
      })
  }

  checkMembership(): void {
    if (!this.currentUser) return

    this.committeeService
      .getUserCommittees(this.currentUser.user_id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isCommitteeMember = response.committees.some((c) => c.committee_id === this.committeeId)
          console.log("[v0] Is committee member:", this.isCommitteeMember)
        },
        error: (error) => {
          console.error("[v0] Error checking membership:", error)
        },
      })
  }

  loadCommitteeProfile(): void {
    console.log("[v0] Loading committee profile image")

    this.committeeService
      .getCommitteeProfile(this.committeeId.toString())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.profile) {
            this.committeeProfileImage = response.profile.cloudinary_url
            console.log("[v0] Loaded committee profile image:", this.committeeProfileImage)
          } else {
            console.log("[v0] No committee profile image found")
            this.committeeProfileImage = null
          }
        },
        error: (error) => {
          console.error("[v0] Error loading committee profile:", error)
          this.committeeProfileImage = null
        },
      })
  }

  openNotifications(): void {
    console.log("[v0] Opening committee notifications")
    if (!this.committeeId) {
      this.router.navigate(["/notifications"])
      return
    }
    this.router.navigate(["/committee-notifications", this.committeeId])
  }

  loadSectionData(): void {
    switch (this.activeSection) {
      case "posts":
        this.loadCommitteePosts()
        break
      case "groupChat":
        this.loadGroupChat()
        break
      case "headChat":
        if (this.isCommitteeHead) {
          this.loadHeadChat()
        }
        break
    }
  }

  loadCommitteePosts(): void {
    console.log("[v0] Loading committee posts")
    this.loadingPosts = true

    this.postService
      .getCommitteePosts(this.committeeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (posts) => {
          this.committeePosts = posts
          this.loadingPosts = false
          console.log("[v0] Loaded committee posts:", posts.length)
        },
        error: (error) => {
          console.error("[v0] Error loading committee posts:", error)
          this.loadingPosts = false
        },
      })
  }

  loadGroupChat(): void {
    console.log("[v0] Loading group chat messages")
    this.loadingMessages = true

    // Group chat is now handled by the CommitteeGroupChatComponent
    this.loadingMessages = false
  }

  loadHeadChat(): void {
    console.log("[v0] Loading head chat messages")
    this.loadingMessages = true

    // TODO: Implement head chat loading
    this.loadingMessages = false
  }

  setActiveSection(section: "posts" | "groupChat" | "headChat"): void {
    console.log("[v0] Setting active section:", section)
    this.activeSection = section
    this.loadSectionData()
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0]
    if (file) {
      console.log("[v0] File selected for upload:", file.name)
      this.selectedFile = file
    }
  }

  uploadProfileImage(): void {
    if (!this.selectedFile || !this.isCommitteeHead) {
      console.log("[v0] Cannot upload: no file or not committee head")
      return
    }

    console.log("[v0] Uploading committee profile image")
    this.uploadingImage = true

    const formData = new FormData()
    formData.append("image", this.selectedFile)
    formData.append("committee_id", this.committeeId.toString())

    this.committeeService
      .uploadCommitteeProfileImage(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.committeeProfileImage = response.profile.cloudinary_url
            this.selectedFile = null
            console.log("[v0] Committee profile image uploaded successfully")
          }
          this.uploadingImage = false
        },
        error: (error) => {
          console.error("[v0] Error uploading committee profile image:", error)
          this.uploadingImage = false
        },
      })
  }

  createPost(): void {
    console.log("[v0] Creating new committee post")
    if (this.committee) {
      this.router.navigate(["/post"], { queryParams: { committee_id: this.committee.committee_id } })
    } else {
      this.router.navigate(["/post"])
    }
  }

  changeHead(): void {
    console.log("[v0] Initiating head change process")
    this.showChangeHeadModal = true
    this.memberSearchTerm = ""
    this.memberSuggestions = []
    this.selectedNewHead = null
  }

  // Live search members within this committee
  onMemberSearch(term: string): void {
    this.memberSearchTerm = term
    this.selectedNewHead = null
    if (!this.committeeId) return
    if (!term || term.trim().length < 2) {
      this.memberSuggestions = []
      return
    }
    this.searchingMembers = true
    this.committeeService
      .searchCommitteeMembers(this.committeeId, term.trim())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (members) => {
          this.memberSuggestions = members
          this.searchingMembers = false
          console.log("[v0] Member suggestions:", members.length)
        },
        error: (err) => {
          console.error("[v0] Error searching members:", err)
          this.memberSuggestions = []
          this.searchingMembers = false
        },
      })
  }

  // Select a candidate from suggestions
  selectCandidate(member: CommitteeMember): void {
    this.selectedNewHead = member
    this.memberSearchTerm = member.name
    this.memberSuggestions = []
  }

  // Cancel modal
  cancelChangeHead(): void {
    this.showChangeHeadModal = false
    this.memberSearchTerm = ""
    this.memberSuggestions = []
    this.selectedNewHead = null
  }

  // Confirm change head
  confirmChangeHead(): void {
    if (!this.committee || !this.selectedNewHead) return
    if (!this.isCommitteeHead) {
      console.warn("[v0] Only current head can change head")
      return
    }
    this.savingHead = true
    this.committeeService
      .changeCommitteeHead(this.committee.committee_id, this.selectedNewHead.user_id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp) => {
          console.log("[v0] Head changed successfully")
          // Update local committee info
          this.committee = resp.committee
          // Current user is no longer head after transfer
          this.isCommitteeHead = false
          this.showChangeHeadModal = false
          this.savingHead = false
          // Reload members and committee info to reflect changes
          this.loadCommitteeMembers()
          this.loadCommitteeData()
        },
        error: (err) => {
          console.error("[v0] Failed to change head:", err)
          this.savingHead = false
        },
      })
  }

  sendMessage(): void {
    if (!this.newMessage.trim()) return

    console.log("[v0] Sending message:", this.newMessage)

    if (this.activeSection === "groupChat") {
      // Group chat is now handled by CommitteeGroupChatComponent
    } else if (this.activeSection === "headChat") {
      // TODO: Send head chat message
    }

    this.newMessage = ""
  }

  goBack(): void {
    console.log("[v0] Navigating back to home")
    this.router.navigate(["/home"])
  }

  private tryLoadCommitteeData(): void {
    if (!this.hasLoadedCommittee && this.committeeId && this.currentUser) {
      this.hasLoadedCommittee = true
      this.loadCommitteeData()
    }
  }
}
