import { Component,  OnInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import  { Router } from "@angular/router"
import  { NotificationService, Notification } from "../../services/notification.service"
import  { CommitteeService } from "../../services/committee.service"
import  { AuthService, User } from "../../services/auth.service"

interface Committee {
  committee_id: number
  name: string
  description: string
  head_id: number
  head_name?: string
  member_count?: number
}

interface CommitteeRequest {
  name: string
  description: string
}

interface JoinRequest {
  committee_id: number
  skills_description: string
}

@Component({
  selector: "app-notifications",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./notification.html",
  styleUrls: ["./notification.css"],
})
export class NotificationsComponent implements OnInit {
  notifications: Notification[] = []
  loading = true
  unreadCount = 0
  currentUser: User | null = null

  showCreateCommittee = false
  showJoinCommittee = false
  availableCommittees: Committee[] = []
  selectedCommitteeId: number | null = null

  committeeRequest: CommitteeRequest = {
    name: "",
    description: "",
  }

  joinRequest: JoinRequest = {
    committee_id: 0,
    skills_description: "",
  }

  constructor(
    private notificationService: NotificationService,
    private committeeService: CommitteeService,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    console.log("[v0] NotificationsComponent initialized")
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user
      if (user) {
        this.loadNotifications()
        this.loadUnreadCount()
        this.loadAvailableCommittees()
      }
    })
  }

  loadNotifications(): void {
    console.log("[v0] Loading notifications for user:", this.currentUser?.user_id)
    this.notificationService.getNotifications().subscribe({
      next: (notifications: Notification[]) => {
        this.notifications = notifications
        this.loading = false
        console.log("[v0] Loaded notifications:", notifications.length)
      },
      error: (error: unknown) => {
        console.error("[v0] Error loading notifications:", error)
        this.loading = false
      },
    })
  }

  loadUnreadCount(): void {
    console.log("[v0] Loading unread count")
    this.notificationService.getUnreadCount().subscribe({
      next: (response: { count: number }) => {
        this.unreadCount = response.count
        console.log("[v0] Unread count:", this.unreadCount)
      },
      error: (error: unknown) => {
        console.error("[v0] Error loading unread count:", error)
      },
    })
  }

  loadAvailableCommittees(): void {
    console.log("[v0] Loading available committees")
    this.committeeService.getAllCommittees().subscribe({
      next: (committees: Committee[]) => {
        this.availableCommittees = committees
        console.log("[v0] Loaded committees:", committees.length)
      },
      error: (error: unknown) => {
        console.error("[v0] Error loading committees:", error)
      },
    })
  }

  markAsRead(notification: Notification): void {
    if (!notification.is_read) {
      console.log("[v0] Marking notification as read:", notification.notification_id)
      this.notificationService.markAsRead(notification.notification_id).subscribe({
        next: (): void => {
          notification.is_read = true
          this.unreadCount = Math.max(0, this.unreadCount - 1)
          console.log("[v0] Notification marked as read")
        },
        error: (error: unknown) => {
          console.error("[v0] Error marking notification as read:", error)
        },
      })
    }
  }

  acceptNotification(notification: Notification): void {
    console.log("[v0] Accepting notification:", notification.notification_id)
    this.notificationService.updateNotificationStatus(notification.notification_id, "accepted").subscribe({
      next: (): void => {
        notification.status = "accepted"
        notification.action_timestamp = new Date()
        this.markAsRead(notification)
        console.log("[v0] Notification accepted")
      },
      error: (error: unknown) => {
        console.error("[v0] Error accepting notification:", error)
      },
    })
  }

  declineNotification(notification: Notification): void {
    console.log("[v0] Declining notification:", notification.notification_id)
    this.notificationService.updateNotificationStatus(notification.notification_id, "declined").subscribe({
      next: (): void => {
        notification.status = "declined"
        notification.action_timestamp = new Date()
        this.markAsRead(notification)
        console.log("[v0] Notification declined")
      },
      error: (error: unknown) => {
        console.error("[v0] Error declining notification:", error)
      },
    })
  }

  showCreateCommitteeForm(): void {
    console.log("[v0] Showing create committee form")
    this.showCreateCommittee = true
    this.showJoinCommittee = false
  }

  submitCommitteeRequest(): void {
    if (!this.currentUser || !this.committeeRequest.name || !this.committeeRequest.description) {
      console.log("[v0] Invalid committee request data")
      return
    }

    console.log("[v0] Submitting committee request:", this.committeeRequest)
    this.committeeService.createCommitteeRequest(this.committeeRequest).subscribe({
      next: (response: { success: boolean; message: string; notification_id: number }): void => {
        console.log("[v0] Committee request submitted successfully")
        this.showCreateCommittee = false
        this.committeeRequest = { name: "", description: "" }
        this.loadNotifications()
      },
      error: (error: unknown) => {
        console.error("[v0] Error submitting committee request:", error)
      },
    })
  }

  showJoinCommitteeForm(): void {
    console.log("[v0] Showing join committee form")
    this.showJoinCommittee = true
    this.showCreateCommittee = false
  }

  selectCommittee(committeeId: number): void {
    console.log("[v0] Selected committee:", committeeId)
    this.selectedCommitteeId = committeeId
    this.joinRequest.committee_id = committeeId
  }

  submitJoinRequest(): void {
    if (!this.currentUser || !this.joinRequest.committee_id || !this.joinRequest.skills_description) {
      console.log("[v0] Invalid join request data")
      return
    }

    console.log("[v0] Submitting join request:", this.joinRequest)
    this.committeeService.submitJoinRequest(this.joinRequest).subscribe({
      next: (response: { success: boolean; message: string; notification_id: number }): void => {
        console.log("[v0] Join request submitted successfully")
        this.showJoinCommittee = false
        this.selectedCommitteeId = null
        this.joinRequest = { committee_id: 0, skills_description: "" }
        this.loadNotifications()
      },
      error: (error: unknown) => {
        console.error("[v0] Error submitting join request:", error)
      },
    })
  }

  cancelForms(): void {
    console.log("[v0] Canceling forms")
    this.showCreateCommittee = false
    this.showJoinCommittee = false
    this.selectedCommitteeId = null
    this.committeeRequest = { name: "", description: "" }
    this.joinRequest = { committee_id: 0, skills_description: "" }
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case "committee_request":
        return "fas fa-users"
      case "join_request":
        return "fas fa-user-plus"
      case "role_transfer":
        return "fas fa-exchange-alt"
      case "event_update":
        return "fas fa-calendar"
      case "livestream_update":
        return "fas fa-video"
      default:
        return "fas fa-bell"
    }
  }

  getNotificationColor(type: string): string {
    switch (type) {
      case "committee_request":
        return "text-primary"
      case "join_request":
        return "text-success"
      case "role_transfer":
        return "text-warning"
      case "event_update":
        return "text-info"
      case "livestream_update":
        return "text-danger"
      default:
        return "text-secondary"
    }
  }

  getTimeAgo(date: Date): string {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000)

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return `${Math.floor(diffInSeconds / 604800)}w ago`
  }

  canTakeAction(notification: Notification): boolean {
    return (
      notification.status === "pending" &&
      (notification.type === "committee_request" ||
        notification.type === "join_request" ||
        notification.type === "role_transfer")
    )
  }
}
