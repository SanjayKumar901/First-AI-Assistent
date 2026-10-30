import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { defer, finalize, Observable, of, Subject } from 'rxjs';
import OpenAI from 'openai';
import { Dashboard } from './dashboard';
import { routes } from '../app.routes';
import { OpenAIService } from '../open-aiservice';

type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;
  let chatMessages: WritableSignal<ChatMessage[]>;
  let requests: ChatMessage[][];
  let loading: ReturnType<typeof signal<boolean>>;
  let hasReceivedResponse: ReturnType<typeof signal<boolean>>;
  let response: Observable<string>;

  beforeEach(async () => {
    chatMessages = signal<ChatMessage[]>([]);
    requests = [];
    loading = signal(false);
    hasReceivedResponse = signal(false);
    response = of(`Answer ${requests.length + 1}`);
    let pendingRequests = 0;
    const openAIServiceMock = {
      chatMessages: chatMessages.asReadonly(),
      isLoading: loading,
      hasReceivedResponse: hasReceivedResponse.asReadonly(),
      getChatMessages: () => chatMessages(),
      setChatMessages: (messages: ChatMessage[]) => chatMessages.set([...messages]),
      sendMessage: (inputMessage: string, messages: ChatMessage[]) => {
        hasReceivedResponse.set(false);
        chatMessages.update((currentMessages) => [
          ...currentMessages,
          { role: 'user', content: inputMessage },
        ]);
        defer(() => {
          pendingRequests++;
          loading.set(true);
          requests.push(messages);
          return response.pipe(
            finalize(() => {
              pendingRequests--;
              loading.set(pendingRequests > 0);
            }),
          );
        }).subscribe({
          next: (chunk) => {
            hasReceivedResponse.set(true);
            chatMessages.update((currentMessages) => {
              const lastMessage = currentMessages.at(-1);
              if (lastMessage?.role === 'assistant' && typeof lastMessage.content === 'string') {
                return [
                  ...currentMessages.slice(0, -1),
                  { ...lastMessage, content: lastMessage.content + chunk },
                ];
              }
              return [...currentMessages, { role: 'assistant', content: chunk }];
            });
          },
        });
      },
    };

    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        provideRouter(routes),
        { provide: OpenAIService, useValue: openAIServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render chat messages when they arrive asynchronously', async () => {
    fixture.autoDetectChanges();
    chatMessages.set([{ role: 'assistant', content: 'Delayed answer' }]);

    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Delayed answer');
  });

  it('should show the assistant loader until the API responds', () => {
    const pendingResponse = new Subject<string>();
    response = pendingResponse;

    const textarea = fixture.nativeElement.querySelector(
      'textarea[aria-label="Message assistant"]',
    ) as HTMLTextAreaElement;
    textarea.value = 'Hello';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    textarea.form?.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[aria-label="Assistant is responding"]')).toBeTruthy();

    pendingResponse.next('Hello ');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Hello ');
    expect(fixture.nativeElement.querySelector('[aria-label="Assistant is responding"]')).toBeNull();

    pendingResponse.next('back');
    pendingResponse.complete();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Hello back');
    expect(fixture.nativeElement.querySelector('[aria-label="Assistant is responding"]')).toBeNull();
  });

  it('should send through the selected model component', () => {
    const selectModel = (modelId: string) => {
      const select = fixture.nativeElement.querySelector(
        'select[aria-label="Choose AI model"]',
      ) as HTMLSelectElement;
      select.value = modelId;
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();
    };

    selectModel('simple-answer-with-memory');

    const submit = (text: string) => {
      const textarea = fixture.nativeElement.querySelector(
        'textarea[aria-label="Message assistant"]',
      ) as HTMLTextAreaElement;
      textarea.value = text;
      textarea.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      textarea.form?.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      );
      fixture.detectChanges();
    };

    submit('Hello');
    expect(requests[0]).toEqual([{ role: 'user', content: 'Hello' }]);
    expect(fixture.nativeElement.textContent).toContain('Answer 1');
    submit('Follow-up');
    expect(requests[1]).toEqual([
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Answer 1' },
      { role: 'user', content: 'Follow-up' },
    ]);

    expect(fixture.nativeElement.textContent).toContain('Simple Answer With Memory');

    selectModel('simple-answer');
    expect(fixture.nativeElement.textContent).toContain('Simple Answer');
    expect(fixture.nativeElement.textContent).toContain('Hello');
    expect(fixture.nativeElement.textContent).toContain('Follow-up');

    submit('No memory');
    expect(requests[2]).toEqual([{ role: 'user', content: 'No memory' }]);
    expect(fixture.nativeElement.textContent).toContain('Hello');
    expect(fixture.nativeElement.textContent).toContain('Follow-up');
    expect(fixture.nativeElement.textContent).toContain('No memory');
  });
});
