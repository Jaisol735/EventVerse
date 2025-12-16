import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatGrid } from './chat-grid';

describe('ChatGrid', () => {
  let component: ChatGrid;
  let fixture: ComponentFixture<ChatGrid>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatGrid]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChatGrid);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
