import { Component, OnInit, OnDestroy } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { Router } from "@angular/router"
import { ChatService, Chat, User } from "../../services/chat.service"
import { AuthService } from "../../services/auth.service"
import { UserProfileImageService } from "../../services/user-profile-image.service"
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from "rxjs"

@Component({
  selector: "app-personal-chat",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./personal-chat.html",
  styleUrls: ["./personal-chat.css"],
})
export class PersonalChatComponent implements OnInit, OnDestroy {
  chats: Chat[] = []
  searchResults: User[] = []
  searchQuery = ""
  showSearchResults = false
  showGroupChatModal = false
  groupChatName = ""
  selectedUsers: User[] = []
  currentUser: any
  loading = false
  userProfileImages: { [userId: number]: string } = {}

  private destroy$ = new Subject<void>()
  private searchSubject = new Subject<string>()

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private userProfileImageService: UserProfileImageService,
    private router: Router,
  ) {
    this.searchSubject.pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$)).subscribe((query) => {
      if (query.trim()) {
        this.performSearch(query)
      } else {
        this.clearSearch()
      }
    })
  }

  ngOnInit() {
    console.log("[v0] Personal chat component initialized")
    this.currentUser = this.authService.currentUserValue
    this.loadChats()
  }

  ngOnDestroy() {
    this.destroy$.next()
    this.destroy$.complete()
  }

  loadChats() {
    this.loading = true
    console.log("[v0] Loading chats for user")

    this.chatService
      .getAllChats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (chats) => {
          this.chats = chats
          console.log("[v0] Loaded chats:", chats.length)
          this.loading = false
          chats.forEach((chat) => {
            chat.participants.forEach((participant) => {
              if (!this.userProfileImages[participant.user_id]) {
                this.userProfileImageService.getProfileImage(participant.user_id).subscribe({
                  next: (img) => {
                    this.userProfileImages[participant.user_id] = img.image_url
                  },
                  error: () => {
                    this.userProfileImages[participant.user_id] = "/default-user-avatar.png"
                  },
                })
              }
            })
          })
        },
        error: (error) => {
          console.error("[v0] Error loading chats:", error)
          this.loading = false
        },
      })
  }

  onSearchInput() {
    this.searchSubject.next(this.searchQuery)
  }

  performSearch(query: string) {
    console.log("[v0] Performing user search:", query)

    this.chatService
      .searchUsers(query)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (users) => {
          this.searchResults = users
          this.showSearchResults = true
          console.log("[v0] Search results:", users.length)
          users.forEach((user) => {
            if (!this.userProfileImages[user.user_id]) {
              this.userProfileImageService.getProfileImage(user.user_id).subscribe({
                next: (img) => {
                  this.userProfileImages[user.user_id] = img.image_url
                },
                error: () => {
                  this.userProfileImages[user.user_id] = "/default-user-avatar.png"
                },
              })
            }
          })
        },
        error: (error) => {
          console.error("[v0] Error searching users:", error)
          this.searchResults = []
        },
      })
  }

  clearSearch() {
    this.searchResults = []
    this.showSearchResults = false
  }

  startPersonalChat(user: User) {
    console.log("[v0] Starting personal chat with user:", user.name)

    this.chatService
      .createPersonalChat(user.user_id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (chat) => {
          console.log("[v0] Personal chat created/found:", chat._id)
          this.router.navigate(["/chat-grid", chat._id])
          this.clearSearch()
          this.searchQuery = ""
        },
        error: (error) => {
          console.error("[v0] Error creating personal chat:", error)
        },
      })
  }

  openChat(chat: Chat) {
    console.log("[v0] Opening chat:", chat._id)
    this.router.navigate(["/chat-grid", chat._id])
  }

  openGroupChatModal() {
    this.showGroupChatModal = true
    this.groupChatName = ""
    this.selectedUsers = []
  }

  closeGroupChatModal() {
    this.showGroupChatModal = false
    this.groupChatName = ""
    this.selectedUsers = []
  }

  toggleUserSelection(user: User) {
    const index = this.selectedUsers.findIndex((u) => u.user_id === user.user_id)
    if (index > -1) {
      this.selectedUsers.splice(index, 1)
    } else {
      this.selectedUsers.push(user)
    }
  }

  isUserSelected(user: User): boolean {
    return this.selectedUsers.some((u) => u.user_id === user.user_id)
  }

  createGroupChat() {
    if (!this.groupChatName.trim() || this.selectedUsers.length === 0) {
      return
    }

    console.log("[v0] Creating group chat:", this.groupChatName)

    const userIds = this.selectedUsers.map((u) => u.user_id)
    this.chatService
      .createGroupChat(this.groupChatName, userIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (chat) => {
          console.log("[v0] Group chat created:", chat._id)
          this.closeGroupChatModal()
          this.loadChats() // Refresh chat list
          this.router.navigate(["/chat-grid", chat._id])
        },
        error: (error) => {
          console.error("[v0] Error creating group chat:", error)
        },
      })
  }

  getChatDisplayName(chat: Chat): string {
    if (chat.chat_type === "group") {
      return chat.group_name || "Group Chat"
    } else if (chat.chat_type === "personal") {
      const otherParticipant = chat.participants.find((p) => p.user_id !== this.currentUser?.user_id)
      return otherParticipant?.name || "Unknown User"
    }
    return "Chat"
  }

  getChatLastMessage(chat: Chat): string {
    if (chat.last_message) {
      return chat.last_message.content
    }
    return "No messages yet"
  }

  getTimeAgo(date: Date): string {
    const now = new Date()
    const messageDate = new Date(date)
    const diffInMinutes = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return "Just now"
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  getOtherParticipantId(chat: Chat): number {
    if (chat.chat_type === "personal") {
      const other = chat.participants.find((p) => p.user_id !== this.currentUser?.user_id)
      return other?.user_id ?? 0
    }
    // For group chats, fallback to 0 (will show default avatar)
    return 0
  }

  getUserProfileImage(userId: number): string {
    return this.userProfileImages[userId] || "/default-user-avatar.png"
  }
}
