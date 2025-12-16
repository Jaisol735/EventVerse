import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommitteeHeadChatbox } from './committee-head-chatbox';

describe('CommitteeHeadChatbox', () => {
  let component: CommitteeHeadChatbox;
  let fixture: ComponentFixture<CommitteeHeadChatbox>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommitteeHeadChatbox]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CommitteeHeadChatbox);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
