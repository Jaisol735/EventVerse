import { Injectable } from "@angular/core"
import { HttpClient, HttpHeaders } from "@angular/common/http"
import { Observable, Subject, BehaviorSubject } from "rxjs"
import { environment } from "../../environments/environment"
import { io, Socket } from "socket.io-client"

export interface ChatParticipant {
  user_id: number
  name: string
  joined_at: Date
}

export interface ChatMessage {
  sender_id: number
  sender_name: string
  committee_id?: number | null
  content: string
  message_type: "text" | "image" | "video"
  timestamp: Date
}

export interface Chat {
  _id?: string
  chat_type: "personal" | "committee" | "group"
  participants: ChatParticipant[]
  committee_id?: number
  group_name?: string
  group_admin?: number
  messages: ChatMessage[]
  last_message?: {
    content: string
    sender_name: string
    timestamp: Date
  }
  created_at?: Date
  updated_at?: Date
}

export interface User {
  user_id: number
  name: string
  email: string
  role: string
}

export interface TypingUser {
  userId: number
  userName: string
  chatId: string
  isTyping: boolean
}

export interface UserStatus {
  userId: number
  userName: string
  status: "online" | "offline"
}

@Injectable({
  providedIn: "root",
})
export class ChatService {
  private apiUrl = `${environment.apiUrl}/api/chat`
  private socket: Socket | null = null
  private messagesSubject = new Subject<ChatMessage[]>()
  private typingSubject = new Subject<TypingUser>()
  private userStatusSubject = new Subject<UserStatus>()
  private connectedSubject = new BehaviorSubject<boolean>(false)
  private newMessageSubject = new Subject<{ chatId: string; message: ChatMessage }>()
  private committeeMessageSubject = new Subject<{ committeeId: number; message: ChatMessage }>()
  public newMessage$ = this.newMessageSubject.asObservable()
  public committeeMessage$ = this.committeeMessageSubject.asObservable()

  public messages$ = this.messagesSubject.asObservable()
  public typing$ = this.typingSubject.asObservable()
  public userStatus$ = this.userStatusSubject.asObservable()
  public connected$ = this.connectedSubject.asObservable()

  private currentChatId: string | null = null
  private typingTimeout: any = null

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem("token")
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    })
  }

  initializeSocket(userId: number, userName: string): void {
    if (!this.socket) {
      console.log("[v0] Initializing Socket.io connection for user:", userId)

      this.socket = io(environment.apiUrl, {
        auth: {
          token: localStorage.getItem("token"),
          userId: userId,
        },
      })

      this.socket.on("connect", () => {
        console.log("[v0] Connected to chat server")
        this.connectedSubject.next(true)

        // Authenticate user and set online status
        this.socket!.emit("authenticate", { userId, userName })
        this.socket!.emit("user-online")
      })

      this.socket.on("disconnect", () => {
        console.log("[v0] Disconnected from chat server")
        this.connectedSubject.next(false)
      })

      this.socket.on("messages", (messages: ChatMessage[]) => {
        this.messagesSubject.next(messages)
      })

      this.socket.on("new-message", (data: { chatId: string; message: ChatMessage }) => {
        console.log("[DEBUG] Received 'new-message' socket event:", data)
        this.newMessageSubject.next(data)
      })

      this.socket.on("user-typing", (data: TypingUser) => {
        console.log("[v0] User typing status:", data.userName, data.isTyping)
        this.typingSubject.next(data)
      })

      this.socket.on("user-status-change", (data: UserStatus) => {
        console.log("[v0] User status change:", data.userName, data.status)
        this.userStatusSubject.next(data)
      })

      this.socket.on("user-joined-chat", (data: { userId: number; userName: string; chatId: string }) => {
        console.log("[v0] User joined chat:", data.userName, data.chatId)
      })

      this.socket.on("user-left-chat", (data: { userId: number; userName: string; chatId: string }) => {
        console.log("[v0] User left chat:", data.userName, data.chatId)
      })

      this.socket.on("committee_message", (data: { committeeId: number; message: any }) => {
        const mapped: ChatMessage = {
          sender_id: data.message.sender_id,
          sender_name: data.message.sender_name,
          committee_id: data.committeeId,
          content: data.message.content ?? data.message.message ?? "",
          message_type: (data.message.message_type as any) || "text",
          timestamp: new Date(data.message.timestamp),
        }
        this.committeeMessageSubject.next({ committeeId: data.committeeId, message: mapped })
      })

      this.socket.on("new-committee-message", (data: { committeeId: number; message: any }) => {
        const mapped: ChatMessage = {
          sender_id: data.message.sender_id,
          sender_name: data.message.sender_name,
          committee_id: data.committeeId,
          content: data.message.content ?? data.message.message ?? "",
          message_type: (data.message.message_type as any) || "text",
          timestamp: new Date(data.message.timestamp),
        }
        this.committeeMessageSubject.next({ committeeId: data.committeeId, message: mapped })
      })

      this.socket.on("committee_message_ack", (_ack: any) => {
        // no-op; available for optimistic flows
      })
    }
  }

  joinChatRoom(chatId: string): void {
    if (this.socket && this.socket.connected) {
      console.log("[v0] Joining chat room:", chatId)
      this.currentChatId = chatId
      this.socket.emit("join-chat", chatId)
    }
  }

  leaveChatRoom(chatId: string): void {
    if (this.socket && this.socket.connected) {
      console.log("[v0] Leaving chat room:", chatId)
      this.socket.emit("leave-chat", chatId)
      this.currentChatId = null
    }
  }

  sendRealtimeMessage(chatId: string, message: ChatMessage): void {
    if (this.socket && this.socket.connected) {
      console.log("[v0] Sending real-time message to chat:", chatId)
      this.socket.emit("send-message", { chatId, message })
    }
  }

  startTyping(chatId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit("typing-start", { chatId })

      // Clear existing timeout
      if (this.typingTimeout) {
        clearTimeout(this.typingTimeout)
      }

      // Auto-stop typing after 3 seconds
      this.typingTimeout = setTimeout(() => {
        this.stopTyping(chatId)
      }, 3000)
    }
  }

  stopTyping(chatId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit("typing-stop", { chatId })

      if (this.typingTimeout) {
        clearTimeout(this.typingTimeout)
        this.typingTimeout = null
      }
    }
  }

  disconnectSocket(): void {
    if (this.socket) {
      console.log("[v0] Disconnecting from chat server")
      this.socket.disconnect()
      this.socket = null
      this.connectedSubject.next(false)
      this.currentChatId = null
    }
  }

  sendMessage(chatId: string, content: string, messageType = "text"): Observable<ChatMessage> {
    console.log("[v0] Sending message to chat:", chatId)

    const messageObservable = this.http.post<ChatMessage>(
      `${this.apiUrl}/${chatId}/messages`,
      {
        content,
        message_type: messageType,
      },
      {
        headers: this.getAuthHeaders(),
      },
    )

    messageObservable.subscribe({
      next: () => {
        this.stopTyping(chatId)
      },
      error: (error) => {
        console.error("[v0] Error sending message:", error)
      },
    })

    return messageObservable
  }

  getAllChats(): Observable<Chat[]> {
    console.log("[v0] Fetching all chats for user")
    return this.http.get<Chat[]>(this.apiUrl, {
      headers: this.getAuthHeaders(),
    })
  }

  searchUsers(query: string): Observable<User[]> {
    console.log("[v0] Searching users with query:", query)
    return this.http.get<User[]>(`${this.apiUrl}/search-users/${query}`, {
      headers: this.getAuthHeaders(),
    })
  }

  createPersonalChat(userId: number): Observable<Chat> {
    console.log("[v0] Creating personal chat with user:", userId)
    return this.http.post<Chat>(
      `${this.apiUrl}/personal/${userId}`,
      {},
      {
        headers: this.getAuthHeaders(),
      },
    )
  }

  createGroupChat(groupName: string, selectedUsers: number[]): Observable<Chat> {
    console.log("[v0] Creating group chat:", groupName, "with users:", selectedUsers)
    return this.http.post<Chat>(
      `${this.apiUrl}/group/create`,
      {
        group_name: groupName,
        selected_users: selectedUsers,
      },
      {
        headers: this.getAuthHeaders(),
      },
    )
  }

  getChat(chatId: string): Observable<Chat> {
    return this.http.get<Chat>(`${this.apiUrl}/${chatId}`, {
      headers: this.getAuthHeaders(),
    })
  }

  getCommitteeMessages(committeeId: number): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.apiUrl}/committee/${committeeId}/messages`, {
      headers: this.getAuthHeaders(),
    })
  }

  sendMessageToCommittee(committeeId: number, senderId: number, content: string): Observable<ChatMessage> {
    return this.http.post<ChatMessage>(
      `${this.apiUrl}/committee/${committeeId}/messages`,
      {
        sender_id: senderId,
        message: content,
      },
      {
        headers: this.getAuthHeaders(),
      },
    )
  }

  joinCommitteeRoom(committeeId: number): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit("join_committee_room", { committeeId })
      // legacy fallback
      this.socket.emit("join-committee-chat", committeeId)
    }
  }

  leaveCommitteeRoom(committeeId: number): void {
    if (this.socket && this.socket.connected) {
      // No explicit leave event required; rely on socket leave via server legacy if needed
      this.socket.emit("leave-committee-chat", committeeId)
    }
  }

  sendCommitteeMessage(committeeId: number, content: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit("committee_message", {
        committeeId,
        message: { content, message_type: "text" },
      })
      // legacy fallback
      this.socket.emit("committeeMessage", { committeeId, content, message_type: "text" })
    }
  }

  createChat(chatData: Partial<Chat>): Observable<Chat> {
    return this.http.post<Chat>(this.apiUrl, chatData, {
      headers: this.getAuthHeaders(),
    })
  }

  getUserChats(userId: string): Observable<Chat[]> {
    return this.http.get<Chat[]>(`${this.apiUrl}/${userId}`, {
      headers: this.getAuthHeaders(),
    })
  }

  getCommitteeChat(committeeId: number): Observable<Chat> {
    return this.http.post<Chat>(
      `${this.apiUrl}/committee/${committeeId}`,
      {},
      { headers: this.getAuthHeaders() }
    )
  }

  getCommitteeGroupChat(committeeId: number): Observable<Chat> {
    // Fetch the group chat for this committee (chat_type: "group", committee_id: ...)
    return this.http.get<Chat>(
      `${this.apiUrl}/committee/${committeeId}/group`,
      { headers: this.getAuthHeaders() }
    )
  }
}
