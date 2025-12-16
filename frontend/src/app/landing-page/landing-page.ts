import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-landing-page',
  standalone: true,            // ✅ standalone component
  imports: [],
  templateUrl: './landing-page.html',
  styleUrls: ['./landing-page.css'],
  animations: [
    // Blur animation
    trigger('blurAnimation', [
      state('normal', style({ filter: 'blur(0px)' })),
      state('blur', style({ filter: 'blur(5px)' })),
      transition('normal <=> blur', animate('600ms ease-in-out'))
    ]),

    // Fade-in animation
    trigger('fadeInAnimation', [
      state('void', style({ opacity: 0 })),
      state('show', style({ opacity: 1 })),
      transition('void => show', animate('1000ms ease-in'))
    ])
  ]
})
export class LandingPageComponent implements OnInit {
  showContent: boolean = false;

  constructor(private router: Router) {}

  ngOnInit(): void {
    setTimeout(() => {
      this.showContent = true;
    }, 2000); // after 2s show content
  }

  navigate(path: string) {
    this.router.navigate([path]);
  }
}
