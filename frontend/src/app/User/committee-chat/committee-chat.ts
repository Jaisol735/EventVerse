import { Component, OnInit, Input, OnDestroy } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { ChatService, ChatMessage } from "../../services/chat.service"
import { Committee } from "../../services/committee.service"
import { AuthService, User } from "../../services/auth.service"
import { Subscription } from "rxjs"

@Component({
  selector: "app-committee-chat",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./committee-chat.html",
  styleUrls: ["./committee-chat.css"],
})
export class CommitteeChatComponent implements OnInit, OnDestroy {
  @Input() committee!: Committee

  currentUser: User | null = null
  messages: ChatMessage[] = []
  newMessage = ""
  loading = true
  sending = false
  private committeeSub?: Subscription
  private userSub?: Subscription

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.userSub = this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user
      if (user) {
        this.chatService.initializeSocket(user.user_id, user.name)
      }
    })

    if (this.committee) {
      this.chatService.joinCommitteeRoom(this.committee.committee_id)
      this.loadMessages()
      this.subscribeToCommitteeMessages()
    }
  }

  ngOnDestroy(): void {
    if (this.committee) {
      this.chatService.leaveCommitteeRoom(this.committee.committee_id)
    }
    if (this.committeeSub) this.committeeSub.unsubscribe()
    if (this.userSub) this.userSub.unsubscribe()
    this.chatService.disconnectSocket()
  }

  loadMessages(): void {
    this.chatService.getCommitteeMessages(this.committee.committee_id).subscribe({
      next: (messages) => {
        this.messages = (messages || []).sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        )
        this.loading = false
        this.scrollToBottom()
      },
      error: (error) => {
        console.error("Error loading messages:", error)
        this.loading = false
      },
    })
  }

  subscribeToCommitteeMessages(): void {
    this.committeeSub = this.chatService.committeeMessage$.subscribe(({ committeeId, message }) => {
      if (committeeId !== this.committee.committee_id) return

      const exists = this.messages.some(
        (m) =>
          m.sender_id === message.sender_id &&
          m.content === message.content &&
          Math.abs(new Date(m.timestamp).getTime() - new Date(message.timestamp).getTime()) < 1000,
      )
      if (!exists) {
        this.messages = [...this.messages, message]
        this.scrollToBottom()
      }
    })
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || this.sending || !this.currentUser) return

    const content = this.newMessage.trim()
    this.sending = true
    this.newMessage = ""

    this.chatService.sendCommitteeMessage(this.committee.committee_id, content)

    this.chatService.sendMessageToCommittee(this.committee.committee_id, this.currentUser.user_id, content).subscribe({
      next: (message) => {
        const exists = this.messages.some(
          (m) =>
            m.sender_id === message.sender_id &&
            m.content === message.content &&
            Math.abs(new Date(m.timestamp).getTime() - new Date(message.timestamp).getTime()) < 1000,
        )
        if (!exists) {
          this.messages.push(message as ChatMessage)
          this.scrollToBottom()
        }
        this.sending = false
      },
      error: (error) => {
        console.error("Error sending message:", error)
        this.newMessage = content
        this.sending = false
      },
    })
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const chatContainer = document.querySelector(".chat-messages")
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight
      }
    }, 100)
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
    return `${Math.floor(diffInSeconds / 86400)}d ago`
  }
}
