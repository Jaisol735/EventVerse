import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PersonalChat } from './personal-chat';

describe('PersonalChat', () => {
  let component: PersonalChat;
  let fixture: ComponentFixture<PersonalChat>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PersonalChat]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PersonalChat);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
