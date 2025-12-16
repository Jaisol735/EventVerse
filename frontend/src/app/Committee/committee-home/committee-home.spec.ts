import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommitteeHome } from './committee-home';

describe('CommitteeHome', () => {
  let component: CommitteeHome;
  let fixture: ComponentFixture<CommitteeHome>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommitteeHome]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CommitteeHome);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
