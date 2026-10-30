import { TestBed } from '@angular/core/testing';
import OpenAI from 'openai';
import { Subject } from 'rxjs';
import { OpenAIService } from './open-aiservice';

describe('OpenAIService', () => {
  let service: OpenAIService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OpenAIService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose updated chat messages as a read-only signal', () => {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'user', content: 'Hello' },
    ];
    service.setChatMessages(messages);

    expect(service.chatMessages()).toEqual(messages);
    expect(service.getChatMessages()).toEqual(messages);
  });

  it('should remain loading until all tracked requests finish', () => {
    const firstRequest = new Subject<string>();
    const secondRequest = new Subject<string>();

    service.trackRequest(() => firstRequest).subscribe();
    service.trackRequest(() => secondRequest).subscribe({ error: () => {} });
    expect(service.isLoading()).toBe(true);

    firstRequest.complete();
    expect(service.isLoading()).toBe(true);

    secondRequest.error(new Error('Request failed'));
    expect(service.isLoading()).toBe(false);
  });
});
