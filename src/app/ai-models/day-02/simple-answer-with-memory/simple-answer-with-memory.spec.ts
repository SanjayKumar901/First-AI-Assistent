import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleAnswerWithMemory } from './simple-answer-with-memory';

describe('SimpleAnswerWithMemory', () => {
  let component: SimpleAnswerWithMemory;
  let fixture: ComponentFixture<SimpleAnswerWithMemory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SimpleAnswerWithMemory],
    }).compileComponents();

    fixture = TestBed.createComponent(SimpleAnswerWithMemory);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
