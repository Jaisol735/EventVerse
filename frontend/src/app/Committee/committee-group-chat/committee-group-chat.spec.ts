import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommitteeGroupChat } from './committee-group-chat';

describe('CommitteeGroupChat', () => {
  let component: CommitteeGroupChat;
  let fixture: ComponentFixture<CommitteeGroupChat>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommitteeGroupChat]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CommitteeGroupChat);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
