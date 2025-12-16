import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommitteePost } from './committee-post';

describe('CommitteePost', () => {
  let component: CommitteePost;
  let fixture: ComponentFixture<CommitteePost>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommitteePost]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CommitteePost);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
