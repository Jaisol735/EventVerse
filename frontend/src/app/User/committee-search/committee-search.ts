import { Component, OnInit, Output, EventEmitter } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { CommitteeService, Committee } from "../../services/committee.service"
import { debounceTime, distinctUntilChanged, switchMap } from "rxjs/operators"
import { Subject, of } from "rxjs"

export interface CommitteeSelection {
  committee: Committee
  mode: "posts" | "chat"
}

@Component({
  selector: "app-committee-search",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./committee-search.html",
  styleUrls: ["./committee-search.css"],
})
export class CommitteeSearchComponent implements OnInit {
  @Output() committeeSelected = new EventEmitter<CommitteeSelection>()

  searchQuery = ""
  searchResults: Committee[] = []
  selectedCommittee: Committee | null = null
  showResults = false
  loading = false
  selectedMode: "posts" | "chat" = "posts"

  private searchSubject = new Subject<string>()

  constructor(private committeeService: CommitteeService) {}

  ngOnInit(): void {
    // Setup search with debounce
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((query) => {
          if (query.trim().length < 2) {
            return of([])
          }
          this.loading = true
          return this.committeeService.searchCommittees(query)
        }),
      )
      .subscribe({
        next: (results) => {
          this.searchResults = results
          this.showResults = true
          this.loading = false
        },
        error: (error) => {
          console.error("Error searching committees:", error)
          this.searchResults = []
          this.loading = false
        },
      })
  }

  onSearchInput(): void {
    this.searchSubject.next(this.searchQuery)
    if (this.searchQuery.trim().length < 2) {
      this.showResults = false
      this.searchResults = []
    }
  }

  selectCommittee(committee: Committee): void {
    this.selectedCommittee = committee
    this.searchQuery = committee.name
    this.showResults = false
    this.emitSelection()
  }

  clearSelection(): void {
    this.selectedCommittee = null
    this.searchQuery = ""
    this.showResults = false
    this.searchResults = []
  }

  onModeChange(mode: "posts" | "chat"): void {
    this.selectedMode = mode
    this.emitSelection()
  }

  private emitSelection(): void {
    if (this.selectedCommittee) {
      this.committeeSelected.emit({
        committee: this.selectedCommittee,
        mode: this.selectedMode,
      })
    }
  }

  onFocus(): void {
    if (this.searchQuery.trim().length >= 2 && this.searchResults.length > 0) {
      this.showResults = true
    }
  }

  onBlur(): void {
    // Delay hiding results to allow for clicks
    setTimeout(() => {
      this.showResults = false
    }, 200)
  }
}
