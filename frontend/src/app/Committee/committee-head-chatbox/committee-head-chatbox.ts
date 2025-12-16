import { Component, OnInit, Input, OnDestroy, ViewChild, ElementRef } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { ChatService, Chat, ChatMessage, User } from "../../services/chat.service"
import { Committee } from "../../services/committee.service"
import { AuthService, User as AuthUser } from "../../services/auth.service"
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from "rxjs"

@Component({
  selector: "app-committee-head-chatbox",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./committee-head-chatbox.html",
  styleUrls: ["./committee-head-chatbox.css"],
})
export class CommitteeHeadChatboxComponent implements OnInit, OnDestroy {
  @Input() committee!: Committee
  @Input() isCommitteeHead = false
  @ViewChild("messagesContainer") messagesContainer!: ElementRef

  currentUser: AuthUser | null = null

  // Chat list and active chat
  chats: Chat[] = []
  activeChat: Chat | null = null
  messages: ChatMessage[] = []

  // User search
  searchQuery = ""
  searchResults: User[] = []
  showSearchResults = false
  searchLoading = false

  // Message input
  newMessage = ""
  sending = false
  isTyping = false
  typingUsers: string[] = []

  // UI states
  loading = true
  showUserSearch = false

  private destroy$ = new Subject<void>()
  private searchSubject = new Subject<string>()

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    console.log("[v0] Committee Head Chatbox initialized for committee:", this.committee?.committee_id)

    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user
      console.log("[v0] Current user:", user)

      if (user && this.isCommitteeHead) {
        this.initializeChatbox()
      }
    })

    // Setup user search with debounce
    this.searchSubject.pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$)).subscribe((query) => {
      if (query.trim().length >= 2) {
        this.searchUsers(query)
      } else {
        this.searchResults = []
        this.showSearchResults = false
      }
    })
  }

  ngOnDestroy(): void {
    this.destroy$.next()
    this.destroy$.complete()

    if (this.committee) {
      this.chatService.leaveCommitteeRoom(this.committee.committee_id)
    }
    this.chatService.disconnectSocket()
  }

  initializeChatbox(): void {
    if (!this.currentUser || !this.isCommitteeHead) return

    this.chatService.initializeSocket(this.currentUser.user_id, this.currentUser.name)
    this.chatService.joinCommitteeRoom(this.committee.committee_id)

    // Synthesize an active chat object to reuse UI layout
    this.activeChat = {
      _id: `committee-${this.committee.committee_id}`,
      chat_type: "committee",
      participants: [],
      committee_id: this.committee.committee_id,
      messages: [],
    } as Chat

    this.loadCommitteeMessages()
    this.subscribeToCommitteeMessages()
  }

  loadCommitteeMessages(): void {
    this.chatService
      .getCommitteeMessages(this.committee.committee_id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (msgs) => {
          this.messages = (msgs || []).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
          this.loading = false
          this.scrollToBottom()
        },
        error: (error) => {
          console.error("[v0] Error loading committee messages:", error)
          this.loading = false
        },
      })
  }

  subscribeToCommitteeMessages(): void {
    this.chatService.committeeMessage$.pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ committeeId, message }) => {
        if (committeeId !== this.committee.committee_id) return

        const exists = this.messages.some(
          (m) =>
            m.sender_id === message.sender_id &&
            m.content === message.content &&
            Math.abs(new Date(m.timestamp).getTime() - new Date(message.timestamp).getTime()) < 1000,
        )
        if (!exists) {
          this.messages.push(message)
          this.scrollToBottom()
        }
      },
    })
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || this.sending || !this.currentUser) {
      return
    }

    const content = this.newMessage.trim()
    this.sending = true
    this.newMessage = ""

    // realtime
    this.chatService.sendCommitteeMessage(this.committee.committee_id, content)

    // persist
    this.chatService
      .sendMessageToCommittee(this.committee.committee_id, this.currentUser.user_id, content)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (message) => {
          const exists = this.messages.some(
            (m) =>
              m.sender_id === message.sender_id &&
              m.content === message.content &&
              Math.abs(new Date(m.timestamp).getTime() - new Date(message.timestamp).getTime()) < 1000,
          )
          if (!exists) {
            this.messages.push(message)
            this.scrollToBottom()
          }
          this.sending = false
        },
        error: (error) => {
          console.error("[v0] Error sending committee message:", error)
          this.newMessage = content
          this.sending = false
        },
      })
  }

  toggleUserSearch(): void {
    this.showUserSearch = !this.showUserSearch
    if (!this.showUserSearch) {
      this.clearSearch()
    }
  }

  clearSearch(): void {
    this.searchQuery = ""
    this.searchResults = []
    this.showSearchResults = false
    this.showUserSearch = false
  }

  isMyMessage(message: ChatMessage): boolean {
    return message.sender_id === this.currentUser?.user_id
  }

  getOtherParticipant(chat: Chat): string {
    if (chat.chat_type === "committee") {
      return this.committee?.name ?? "Committee"
    }
    const otherParticipant = chat.participants.find((p) => p.user_id !== this.currentUser?.user_id)
    return otherParticipant?.name || "Unknown User"
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

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.messagesContainer) {
        const element = this.messagesContainer.nativeElement
        element.scrollTop = element.scrollHeight
      }
    }, 100)
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      this.sendMessage()
    }
  }

  onKeyUp(): void {
    // typing indicator omitted for committee inbox
  }

  searchUsers(query: string): void {
    this.searchLoading = true
    this.showSearchResults = false
    this.searchResults = []
    // Assuming chatService has a searchUsers method
    this.chatService
      .searchUsers(query)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (users: User[]) => {
          this.searchResults = users
          this.showSearchResults = true
          this.searchLoading = false
        },
        error: (error) => {
          console.error("[v0] Error searching users:", error)
          this.searchResults = []
          this.showSearchResults = false
          this.searchLoading = false
        },
      })
  }

  // Add missing methods for template binding

  onSearchInput(): void {
    // Called on (input) in search box
    this.searchSubject.next(this.searchQuery)
  }

  startChatWithUser(user: User): void {
    // TODO: Implement starting a new chat with the selected user
    // For now, just close the search UI
    this.clearSearch()
    // Optionally, show a message or open a chat
    // Example: alert(`Start chat with ${user.name} (${user.email})`)
  }

  selectChat(chat: Chat): void {
    // TODO: Implement selecting a chat from the chat list
    // For now, just set as activeChat and load messages if needed
    this.activeChat = chat
    // Optionally, load messages for the selected chat
    // this.loadMessagesForChat(chat)
  }

  getTypingText(): string {
    // Returns a string for typing indicator
    if (this.typingUsers.length === 0) return ""
    if (this.typingUsers.length === 1) return `${this.typingUsers[0]} is typing...`
    return `${this.typingUsers.join(", ")} are typing...`
  }
}
