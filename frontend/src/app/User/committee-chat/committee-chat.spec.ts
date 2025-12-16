import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommitteeChat } from './committee-chat';

describe('CommitteeChat', () => {
  let component: CommitteeChat;
  let fixture: ComponentFixture<CommitteeChat>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommitteeChat]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CommitteeChat);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
