import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewChecked,
} from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { ActivatedRoute, Router } from "@angular/router"
import { ChatService, Chat, ChatMessage } from "../../services/chat.service"
import { AuthService } from "../../services/auth.service"
import { UserProfileImageService } from "../../services/user-profile-image.service"
import { GroupChatProfileImageService } from "../../services/group-chat-profile-image.service"
import { Subject, takeUntil } from "rxjs"

@Component({
  selector: "app-chat-grid",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./chat-grid.html",
  styleUrls: ["./chat-grid.css"],
})
export class ChatGridComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild("messagesContainer") messagesContainer!: ElementRef
  @ViewChild("fileInput") fileInput!: ElementRef

  chat: Chat | null = null
  chatId = ""
  currentUser: any
  newMessage = ""
  loading = false
  sending = false
  uploadingImage = false
  otherUserProfileImage = "/default-user-avatar.png"
  groupProfileImage = "/default-user-avatar.png"
  showImageUploadModal = false
  isConnected = false
  typingUsers: string[] = []

  private destroy$ = new Subject<void>()
  private shouldScrollToBottom = false
  private typingTimeout: any = null

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private chatService: ChatService,
    private authService: AuthService,
    private userProfileImageService: UserProfileImageService,
    private groupChatProfileImageService: GroupChatProfileImageService,
  ) {}

  ngOnInit() {
    // Always get currentUser from AuthService
    this.currentUser = this.authService.currentUserValue
    const initChatGrid = (user: any) => {
      if (user) {
        this.currentUser = user
        this.chatService.initializeSocket(user.user_id, user.name)
      }
      this.route.params.pipe(takeUntil(this.destroy$)).subscribe((params) => {
        this.chatId = params["chatId"]
        if (this.chatId) {
          console.log("[v0] Loading chat:", this.chatId)
          this.loadChat()
        }
      })
      this.chatService.newMessage$.pipe(takeUntil(this.destroy$)).subscribe((data) => {
        if (data.chatId === this.chatId && this.chat) {
          // Only add the message if it's not sent by the current user
          if (data.message.sender_id !== this.currentUser.user_id) {
            console.log("[v0] Received real-time message for current chat")
            this.chat.messages.push(data.message)
            this.shouldScrollToBottom = true
          }
        }
      })
      this.chatService.typing$.pipe(takeUntil(this.destroy$)).subscribe((typingData) => {
        if (typingData.chatId === this.chatId && typingData.userId !== this.currentUser?.user_id) {
          if (typingData.isTyping) {
            if (!this.typingUsers.includes(typingData.userName)) {
              this.typingUsers.push(typingData.userName)
            }
          } else {
            this.typingUsers = this.typingUsers.filter((name) => name !== typingData.userName)
          }
        }
      })
      this.chatService.connected$.pipe(takeUntil(this.destroy$)).subscribe((connected) => {
        this.isConnected = connected
        console.log("[v0] Socket connection status:", connected)
      })
    }
    if (!this.currentUser && this.authService.currentUser$) {
      this.authService.currentUser$.subscribe((user) => {
        initChatGrid(user)
      })
    } else {
      initChatGrid(this.currentUser)
    }
  }

  ngOnDestroy() {
    if (this.chatId) {
      this.chatService.leaveChatRoom(this.chatId)
    }

    this.destroy$.next()
    this.destroy$.complete()

    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout)
    }
  }

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom()
      this.shouldScrollToBottom = false
    }
  }

  loadChat() {
    this.loading = true

    this.chatService
      .getChat(this.chatId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (chat) => {
          this.chat = chat
          console.log("[v0] Chat loaded:", chat.chat_type, "with", chat.messages.length, "messages")
          this.loading = false
          this.shouldScrollToBottom = true
          this.loadProfileImages()

          this.chatService.joinChatRoom(this.chatId)
        },
        error: (error) => {
          console.error("[v0] Error loading chat:", error)
          this.loading = false
          this.router.navigate(["/personal-chat"])
        },
      })
  }

  onMessageInput() {
    if (this.chatId) {
      this.chatService.startTyping(this.chatId)
    }
  }

  sendMessage() {
    if (!this.newMessage.trim() || !this.chat || this.sending) {
      return
    }

    const messageContent = this.newMessage.trim()
    this.newMessage = ""
    this.sending = true

    console.log("[v0] Sending message:", messageContent)

    this.chatService
      .sendMessage(this.chat._id!, messageContent)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (message) => {
          console.log("[v0] Message sent successfully")
          this.chat!.messages.push(message)
          this.chat!.last_message = {
            content: messageContent,
            sender_name: this.currentUser.name,
            timestamp: new Date(),
          }
          this.shouldScrollToBottom = true
          this.sending = false
        },
        error: (error) => {
          console.error("[v0] Error sending message:", error)
          this.newMessage = messageContent // Restore message on error
          this.sending = false
        },
      })
  }

  onKeyPress(event: KeyboardEvent) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      this.sendMessage()
    }
  }

  getTypingIndicatorText(): string {
    if (this.typingUsers.length === 0) return ""
    if (this.typingUsers.length === 1) return `${this.typingUsers[0]} is typing...`
    if (this.typingUsers.length === 2) return `${this.typingUsers[0]} and ${this.typingUsers[1]} are typing...`
    return `${this.typingUsers.length} people are typing...`
  }

  loadProfileImages() {
    if (!this.chat) return

    if (this.chat.chat_type === "personal") {
      // Load other user's profile image
      const otherParticipant = this.chat.participants.find((p) => p.user_id !== this.currentUser?.user_id)
      if (otherParticipant) {
        this.userProfileImageService.getProfileImage(otherParticipant.user_id).subscribe({
          next: (response) => {
            this.otherUserProfileImage = response.image_url
            console.log("[v0] Loaded other user profile image")
          },
          error: () => {
            console.log("[v0] No profile image found for other user, using default")
          },
        })
      }
    } else if (this.chat.chat_type === "group") {
      // Load group profile image
      this.groupChatProfileImageService.getGroupChatProfileImage(this.chat._id!).subscribe({
        next: (response) => {
          this.groupProfileImage = response.image_url
          console.log("[v0] Loaded group chat profile image")
        },
        error: () => {
          console.log("[v0] No group profile image found, using default")
        },
      })
    }
  }

  getChatTitle(): string {
    if (!this.chat) return "Chat"

    if (this.chat.chat_type === "group") {
      return this.chat.group_name || "Group Chat"
    } else if (this.chat.chat_type === "personal") {
      const otherParticipant = this.chat.participants.find((p) => p.user_id !== this.currentUser?.user_id)
      return otherParticipant?.name || "Unknown User"
    }
    return "Chat"
  }

  getChatSubtitle(): string {
    if (!this.chat) return ""

    if (this.chat.chat_type === "group") {
      return `${this.chat.participants.length} members`
    } else if (this.chat.chat_type === "personal") {
      return "Personal chat"
    }
    return ""
  }

  openImageUploadModal() {
    if (this.chat?.chat_type === "group") {
      this.showImageUploadModal = true
    }
  }

  closeImageUploadModal() {
    this.showImageUploadModal = false
  }

  onImageSelected(event: any) {
    const file = event.target.files[0]
    if (file && this.chat) {
      this.uploadGroupProfileImage(file)
    }
  }

  uploadGroupProfileImage(file: File) {
    if (!this.chat) return

    this.uploadingImage = true
    console.log("[v0] Starting group profile image upload")

    this.groupChatProfileImageService
      .uploadGroupChatProfileImage(this.chat._id!, file)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log("[v0] Group profile image uploaded successfully")
          this.groupProfileImage = response.image_url
          this.uploadingImage = false
          this.closeImageUploadModal()

          // Reload chat to get the updated message about image change
          this.loadChat()
        },
        error: (error) => {
          console.error("[v0] Error uploading group profile image:", error)
          this.uploadingImage = false
        },
      })
  }

  canUploadGroupImage(): boolean {
    return (
      this.chat?.chat_type === "group" &&
      (this.chat.group_admin === this.currentUser?.user_id ||
        this.chat.participants.some((p) => p.user_id === this.currentUser?.user_id))
    )
  }

  isMyMessage(message: ChatMessage): boolean {
    return message.sender_id === this.currentUser?.user_id
  }

  getMessageTime(timestamp: Date): string {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  getMessageDate(timestamp: Date): string {
    const date = new Date(timestamp)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return "Today"
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday"
    } else {
      return date.toLocaleDateString()
    }
  }

  shouldShowDateSeparator(index: number): boolean {
    if (index === 0) return true

    const currentMessage = this.chat!.messages[index]
    const previousMessage = this.chat!.messages[index - 1]

    const currentDate = new Date(currentMessage.timestamp).toDateString()
    const previousDate = new Date(previousMessage.timestamp).toDateString()

    return currentDate !== previousDate
  }

  scrollToBottom() {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight
      }
    } catch (err) {
      console.error("[v0] Error scrolling to bottom:", err)
    }
  }

  goBack() {
    this.router.navigate(["/personal-chat"])
  }

  openChatInfo() {
    // TODO: Implement chat info modal
    console.log("[v0] Chat info not implemented yet")
  }
}
