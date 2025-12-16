import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommitteeNotification } from './committee-notification';

describe('CommitteeNotification', () => {
  let component: CommitteeNotification;
  let fixture: ComponentFixture<CommitteeNotification>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommitteeNotification]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CommitteeNotification);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
