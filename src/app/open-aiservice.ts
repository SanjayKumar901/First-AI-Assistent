import { Injectable, signal } from '@angular/core';
import OpenAI from 'openai';
import { environment } from '../environments/environment';
import { BehaviorSubject, defer, finalize, from, map, Observable } from 'rxjs';

type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

const client = new OpenAI({
  baseURL: environment.API_BASE_URL,
  apiKey: environment.API_KEY,
  dangerouslyAllowBrowser: true,
});

@Injectable({ providedIn: 'root' })
export class OpenAIService {
  private readonly chatMessagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  private pendingRequestCount = 0;
  readonly isLoading = signal(false);
  readonly chatMessages$ = this.chatMessagesSubject.asObservable();

  getChatMessages(): ChatMessage[] {
    return this.chatMessagesSubject.value;
  }

  setChatMessages(messages: ChatMessage[]): void {
    this.chatMessagesSubject.next([...messages]);
  }

  trackRequest<T>(request: () => Observable<T>): Observable<T> {
    return defer(() => {
      this.pendingRequestCount++;
      this.isLoading.set(true);

      return request().pipe(
        finalize(() => {
          this.pendingRequestCount--;
          this.isLoading.set(this.pendingRequestCount > 0);
        }),
      );
    });
  }

  SendMessageToOpenAI(messages: ChatMessage[]): Observable<string> {
    return from(
      client.chat.completions.create({
        messages,
        model: environment.API_MODEL,
      }),
    ).pipe(
      map((response) => {
        const content = response.choices[0]?.message.content;
        if (typeof content !== 'string') {
          throw new Error('Ollama returned no text response.');
        }
        return content;
      }),
    );
  }
}
