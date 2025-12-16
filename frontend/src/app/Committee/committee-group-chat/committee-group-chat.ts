import { Component, OnInit, Input, OnDestroy, ViewChild, ElementRef } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { ChatService, ChatMessage, Chat } from "../../services/chat.service"
import { Committee } from "../../services/committee.service"
import { AuthService, User } from "../../services/auth.service"
import { Subject, takeUntil } from "rxjs"

@Component({
  selector: "app-committee-group-chat",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./committee-group-chat.html",
  styleUrls: ["./committee-group-chat.css"],
})
export class CommitteeGroupChatComponent implements OnInit, OnDestroy {
  @Input() committee!: Committee
  @Input() isCommitteeMember = false
  @ViewChild("messagesContainer") messagesContainer!: ElementRef

  currentUser: User | null = null
  chat: Chat | null = null
  messages: ChatMessage[] = []
  newMessage = ""
  loading = true
  sending = false
  isTyping = false
  typingUsers: string[] = []

  private destroy$ = new Subject<void>()

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    console.log("[v0] Committee Group Chat initialized for committee:", this.committee?.committee_id)

    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user
      console.log("[v0] Current user:", user)

      if (user) {
        this.initializeChat()
      }
    })
  }

  ngOnDestroy(): void {
    this.destroy$.next()
    this.destroy$.complete()

    if (this.chat) {
      this.chatService.leaveChatRoom(this.chat._id!)
    }
    this.chatService.disconnectSocket()
  }

  initializeChat(): void {
    if (!this.currentUser || !this.committee) return

    console.log("[v0] Initializing committee group chat")

    // Initialize socket connection
    this.chatService.initializeSocket(this.currentUser.user_id, this.currentUser.name)

    // Always use backend endpoint to get committee *group* chat (not committee head chat)
    // Use a new endpoint or filter to get group chat for this committee
    this.chatService
      .getCommitteeGroupChat(this.committee.committee_id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (chat: Chat) => {
          this.chat = chat
          this.messages = chat.messages || []
          this.loading = false
          console.log("[v0] Committee group chat loaded:", chat._id)

          // Join the chat room for real-time updates
          if (chat._id) {
            this.chatService.joinChatRoom(chat._id)
          }

          this.subscribeToMessages()
          this.subscribeToTyping()
          this.scrollToBottom()
        },
        error: (error: any) => {
          console.error("[v0] Error loading committee group chat:", error)
          this.loading = false
        },
      })
  }

  subscribeToMessages(): void {
    console.log("[v0] Subscribing to real-time messages")

    this.chatService.newMessage$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        console.log("[v0] Received new message:", data)

        if (this.chat && data.chatId === this.chat._id) {
          // Check if message already exists to prevent duplicates
          const messageExists = this.messages.some(
            (msg) =>
              msg.sender_id === data.message.sender_id &&
              msg.content === data.message.content &&
              Math.abs(new Date(msg.timestamp).getTime() - new Date(data.message.timestamp).getTime()) < 1000,
          )

          if (!messageExists) {
            this.messages.push(data.message)
            this.scrollToBottom()
            console.log("[v0] Added new message to chat")
          } else {
            console.log("[v0] Message already exists, skipping duplicate")
          }
        }
      },
      error: (error) => {
        console.error("[v0] Error receiving messages:", error)
      },
    })
  }

  subscribeToTyping(): void {
    console.log("[v0] Subscribing to typing indicators")

    this.chatService.typing$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (typingData) => {
        if (this.chat && typingData.chatId === this.chat._id && typingData.userId !== this.currentUser?.user_id) {
          if (typingData.isTyping) {
            if (!this.typingUsers.includes(typingData.userName)) {
              this.typingUsers.push(typingData.userName)
            }
          } else {
            this.typingUsers = this.typingUsers.filter((name) => name !== typingData.userName)
          }
          console.log("[v0] Typing users updated:", this.typingUsers)
        }
      },
    })
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || this.sending || !this.currentUser || !this.chat) {
      console.log("[v0] Cannot send message: invalid state")
      return
    }

    console.log("[v0] Sending message to committee chat")
    this.sending = true

    const messageContent = this.newMessage.trim()
    this.newMessage = "" // Clear input immediately

    this.chatService
      .sendMessage(this.chat._id!, messageContent)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (message) => {
          console.log("[v0] Message sent successfully")

          // Add message to local array if not already present
          const messageExists = this.messages.some(
            (msg) =>
              msg.sender_id === message.sender_id &&
              msg.content === message.content &&
              Math.abs(new Date(msg.timestamp).getTime() - new Date(message.timestamp).getTime()) < 1000,
          )

          if (!messageExists) {
            this.messages.push(message)
            this.scrollToBottom()
          }

          this.sending = false
        },
        error: (error) => {
          console.error("[v0] Error sending message:", error)
          this.newMessage = messageContent // Restore message on error
          this.sending = false
        },
      })
  }

  onTyping(): void {
    if (!this.chat) return

    if (!this.isTyping) {
      this.isTyping = true
      this.chatService.startTyping(this.chat._id!)
      console.log("[v0] Started typing indicator")
    }
  }

  onStopTyping(): void {
    if (!this.chat || !this.isTyping) return

    this.isTyping = false
    this.chatService.stopTyping(this.chat._id!)
    console.log("[v0] Stopped typing indicator")
  }

  isMyMessage(message: ChatMessage): boolean {
    return message.sender_id === this.currentUser?.user_id
  }

  getTimeAgo(date: Date): string {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000)

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return new Date(date).toLocaleDateString()
  }

  getTypingText(): string {
    if (this.typingUsers.length === 0) return ""
    if (this.typingUsers.length === 1) return `${this.typingUsers[0]} is typing...`
    if (this.typingUsers.length === 2) return `${this.typingUsers[0]} and ${this.typingUsers[1]} are typing...`
    return `${this.typingUsers.length} people are typing...`
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.messagesContainer?.nativeElement) {
        const element = this.messagesContainer.nativeElement
        element.scrollTop = element.scrollHeight
      }
    }, 100)
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      this.sendMessage()
    } else {
      this.onTyping()
    }
  }

  onKeyUp(): void {
    // Stop typing after a delay
    setTimeout(() => {
      this.onStopTyping()
    }, 1000)
  }
}