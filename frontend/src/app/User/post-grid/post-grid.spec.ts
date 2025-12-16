import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PostGrid } from './post-grid';

describe('PostGrid', () => {
  let component: PostGrid;
  let fixture: ComponentFixture<PostGrid>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PostGrid]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PostGrid);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
