import { Component,OnInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import { ActivatedRoute, Router } from "@angular/router"
import { NotificationService, Notification } from "../../services/notification.service"

@Component({
  selector: "app-committee-notification",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./committee-notification.html",
  styleUrls: ["./committee-notification.css"],
})
export class CommitteeNotificationComponent implements OnInit {
  committeeId = 0
  loading = false
  notifications: Notification[] = []
  error: string | null = null
  acting = new Set<number>() // track IDs while accepting/rejecting

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private notificationService: NotificationService,
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.committeeId = +params["committeeId"]
      this.fetch()
    })
  }

  fetch(): void {
    if (!this.committeeId) return
    this.loading = true
    this.error = null
    this.notificationService.getCommitteeNotifications(this.committeeId).subscribe({
      next: (rows) => {
        this.notifications = rows
        this.loading = false
        // Mark all as read on open
        for (const n of rows) {
          if (!n.is_read) {
            this.notificationService.markAsRead(n.notification_id).subscribe()
          }
        }
      },
      error: (err) => {
        console.error("[v0] Failed to load committee notifications:", err)
        this.error = "Failed to load notifications"
        this.loading = false
      },
    })
  }

  accept(n: Notification) {
    if (this.acting.has(n.notification_id)) return
    this.acting.add(n.notification_id)
    this.notificationService.acceptNotification(n.notification_id).subscribe({
      next: () => {
        this.acting.delete(n.notification_id)
        // Refresh list after action
        this.fetch()
      },
      error: (err) => {
        console.error("[v0] Accept failed:", err)
        this.acting.delete(n.notification_id)
      },
    })
  }

  reject(n: Notification) {
    if (this.acting.has(n.notification_id)) return
    this.acting.add(n.notification_id)
    this.notificationService.rejectNotification(n.notification_id).subscribe({
      next: () => {
        this.acting.delete(n.notification_id)
        this.fetch()
      },
      error: (err) => {
        console.error("[v0] Reject failed:", err)
        this.acting.delete(n.notification_id)
      },
    })
  }

  back() {
    this.router.navigate(["/committee", this.committeeId])
  }
}
