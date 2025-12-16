import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommitteeSearch } from './committee-search';

describe('CommitteeSearch', () => {
  let component: CommitteeSearch;
  let fixture: ComponentFixture<CommitteeSearch>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommitteeSearch]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CommitteeSearch);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
