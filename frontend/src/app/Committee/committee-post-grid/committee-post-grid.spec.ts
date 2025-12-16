import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommitteePostGrid } from './committee-post-grid';

describe('CommitteePostGrid', () => {
  let component: CommitteePostGrid;
  let fixture: ComponentFixture<CommitteePostGrid>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommitteePostGrid]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CommitteePostGrid);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
