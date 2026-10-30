import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleAnswer } from './simple-answer';

describe('SimpleAnswer', () => {
  let component: SimpleAnswer;
  let fixture: ComponentFixture<SimpleAnswer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SimpleAnswer],
    }).compileComponents();

    fixture = TestBed.createComponent(SimpleAnswer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
