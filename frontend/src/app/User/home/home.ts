import { Component,OnInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import  { Router } from "@angular/router"
import  { AuthService, User } from "../../services/auth.service"
import  { PostService } from "../../services/post.service"
import { NavbarComponent } from "../navbar/navbar"
import { NotificationsComponent } from "../notification/notification"
import { CommitteeSearchComponent, CommitteeSelection } from "../committee-search/committee-search"
import { PostsGridComponent } from "../post-grid/post-grid"
import { CommitteePostsComponent } from "../committee-post/committee-post"
import { CommitteeChatComponent } from "../committee-chat/committee-chat"
import { Committee } from "../../services/committee.service"

@Component({
  selector: "app-home",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NavbarComponent,
    NotificationsComponent,
    CommitteeSearchComponent,
    PostsGridComponent,
    CommitteePostsComponent,
    CommitteeChatComponent,
  ],
  templateUrl: "./home.html",
  styleUrls: ["./home.css"],
})
export class HomeComponent implements OnInit {
  currentUser: User | null = null
  selectedCommittee: Committee | null = null
  selectedMode: "posts" | "chat" | null = null
  showCommitteeContent = false

  constructor(
    private authService: AuthService,
    private postService: PostService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user
    })
  }

  onCommitteeSelected(selection: CommitteeSelection): void {
    this.selectedCommittee = selection.committee
    this.selectedMode = selection.mode
    this.showCommitteeContent = true

    // Remove this navigation to keep chat inline
    // if (selection.mode === "chat") {
    //   this.router.navigate([`/committee/${selection.committee.committee_id}/chat`])
    // }
  }

  clearCommitteeSelection(): void {
    this.selectedCommittee = null
    this.selectedMode = null
    this.showCommitteeContent = false
  }

  logout(): void {
    this.authService.logout()
    this.router.navigate(["/login"])
  }
}
