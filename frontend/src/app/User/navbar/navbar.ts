import { Component,  OnInit, OnDestroy } from "@angular/core"
import { CommonModule } from "@angular/common"
import { Router } from "@angular/router"
import { AuthService, User } from "../../services/auth.service"
import { NotificationService } from "../../services/notification.service"
import { CommitteeService, UserCommittee } from "../../services/committee.service"
import { Subject, takeUntil } from "rxjs"
import { RouterLink } from "@angular/router"

export interface Notification {
  notification_id: number
  type: string
  message: string
  sender_name: string
  status: string
  is_read: boolean
  created_at: Date
}

@Component({
  selector: "app-navbar",
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: "./navbar.html",
  styleUrls: ["./navbar.css"],
})
export class NavbarComponent implements OnInit, OnDestroy {
  currentUser: User | null = null
  showNotifications = false
  showChatbox = false
  showProfile = false
  notifications: Notification[] = []
  unreadNotificationCount = 0
  userCommittees: UserCommittee[] = []
  isLoadingCommittees = false

  private destroy$ = new Subject<void>()

  constructor(
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService,
    private committeeService: CommitteeService,
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user
      if (user) {
        this.loadNotifications()
        this.loadUserCommittees()
      }
    })
  }

  ngOnDestroy(): void {
    this.destroy$.next()
    this.destroy$.complete()
  }

  loadNotifications(): void {
    console.log("[v0] Loading notifications for navbar")

    this.notificationService
      .getNotifications()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (notifications) => {
          this.notifications = notifications.slice(0, 25)
          this.unreadNotificationCount = notifications.filter((n) => !n.is_read).length
          console.log("[v0] Loaded notifications:", notifications.length, "unread:", this.unreadNotificationCount)
        },
        error: (error) => {
          console.error("[v0] Error loading notifications:", error)
        },
      })
  }

  loadUserCommittees(): void {
    if (!this.currentUser) return

    this.isLoadingCommittees = true
    console.log("[v0] Loading committees for user:", this.currentUser.user_id)

    this.committeeService
      .getUserCommittees(this.currentUser.user_id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.userCommittees = response.committees || []
          this.isLoadingCommittees = false
          console.log("[v0] Loaded user committees:", this.userCommittees.length)
        },
        error: (error) => {
          console.error("[v0] Error loading user committees:", error)
          this.userCommittees = []
          this.isLoadingCommittees = false
        },
      })
  }

  goToProfile(): void {
    this.router.navigate(["/profile"])
    this.showProfile = false
  }

  goToChat(): void {
    console.log("[v0] Navigating to personal chat")
    this.router.navigate(["/personal-chat"])
    this.showChatbox = false
  }

  toggleNotifications(): void {
    console.log("[v0] Navigating to notifications page")
    this.router.navigate(["/notifications"])
    this.showNotifications = false
    this.showChatbox = false
    this.showProfile = false
  }

  toggleChatbox(): void {
    this.showChatbox = !this.showChatbox
    this.showNotifications = false
    this.showProfile = false
  }

  toggleProfile(): void {
    this.showProfile = !this.showProfile
    this.showNotifications = false
    this.showChatbox = false
  }

  handleNotificationAction(notification: Notification, action: "accept" | "decline"): void {
    console.log("[v0] Handling notification action:", action, "for notification:", notification.notification_id)

    this.notificationService
      .updateNotificationStatus(notification.notification_id, action === "accept" ? "accepted" : "declined")
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log("[v0] Notification status updated")
          this.loadNotifications()

          if (action === "accept" && notification.type === "group_chat_invite") {
            console.log("[v0] Should join group chat")
          }
        },
        error: (error) => {
          console.error("[v0] Error updating notification status:", error)
        },
      })
  }

  markNotificationAsRead(notification: Notification): void {
    if (!notification.is_read) {
      this.notificationService
        .markAsRead(notification.notification_id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            notification.is_read = true
            this.unreadNotificationCount = Math.max(0, this.unreadNotificationCount - 1)
          },
          error: (error) => {
            console.error("[v0] Error marking notification as read:", error)
          },
        })
    }
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case "group_chat_invite":
        return "fas fa-users"
      case "committee_request":
        return "fas fa-user-plus"
      case "join_request":
        return "fas fa-hand-paper"
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
      case "group_chat_invite":
        return "text-primary"
      case "committee_request":
        return "text-success"
      case "join_request":
        return "text-warning"
      case "role_transfer":
        return "text-info"
      case "event_update":
        return "text-purple"
      case "livestream_update":
        return "text-danger"
      default:
        return "text-secondary"
    }
  }

  getTimeAgo(date: Date): string {
    const now = new Date()
    const notificationDate = new Date(date)
    const diffInMinutes = Math.floor((now.getTime() - notificationDate.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return "Just now"
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  openUploadPost(): void {
    if (this.currentUser) {
      this.router.navigate(["/post"], { queryParams: { user_id: this.currentUser.user_id } })
    } else {
      this.router.navigate(["/post"])
    }
  }

  goToCommittee(): void {
    if (this.userCommittees.length > 0) {
      const firstCommittee = this.userCommittees[0]
      console.log("[v0] Navigating to committee home:", firstCommittee.committee_id)
      this.router.navigate(["/committee", firstCommittee.committee_id])
    }
    console.log("Committee clicked")
  }

  goToAdminControl(): void {
    console.log("Admin control clicked")
  }

  isInCommittee(): boolean {
    return this.userCommittees.length > 0
  }

  isAdmin(): boolean {
    return this.currentUser?.role === "admin"
  }

  getCommitteeName(): string {
    if (this.userCommittees.length === 1) {
      return this.userCommittees[0].committee_name
    } else if (this.userCommittees.length > 1) {
      return "Committees"
    }
    return "Committee"
  }

  logout(): void {
    this.authService.logout()
    this.router.navigate(["/login"])
  }
}
