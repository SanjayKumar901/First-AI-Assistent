import { Injectable, signal } from '@angular/core';
import OpenAI from 'openai';
import { environment } from '../environments/environment';
import { defer, filter, finalize, from, map, mergeMap, Observable, throwIfEmpty } from 'rxjs';

type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

const client = new OpenAI({
  baseURL: environment.API_BASE_URL,
  apiKey: environment.API_KEY,
  dangerouslyAllowBrowser: true,
});

@Injectable({ providedIn: 'root' })
export class OpenAIService {
  private readonly chatMessagesState = signal<ChatMessage[]>([]);
  private pendingRequestCount = 0;
  private readonly hasReceivedResponseState = signal(false);
  readonly isLoading = signal(false);
  readonly hasReceivedResponse = this.hasReceivedResponseState.asReadonly();
  readonly chatMessages = this.chatMessagesState.asReadonly();

  getChatMessages(): ChatMessage[] {
    return this.chatMessages();
  }

  setChatMessages(messages: ChatMessage[]): void {
    this.chatMessagesState.set([...messages]);
  }

  sendMessage(inputMessage: string, requestMessages: ChatMessage[]): void {
    this.hasReceivedResponseState.set(false);
    this.chatMessagesState.update((messages) => [
      ...messages,
      { role: 'user', content: inputMessage },
    ]);

    this.trackRequest(() => this.requestAssistantResponse(requestMessages)).subscribe({
      next: (chunk) => {
        this.hasReceivedResponseState.set(true);
        this.appendAssistantChunk(chunk);
      },
      error: (error) => console.error('Ollama request failed:', error),
    });
  }

  private appendAssistantChunk(chunk: string): void {
    this.chatMessagesState.update((messages) => {
      const lastMessage = messages.at(-1);
      if (lastMessage?.role === 'assistant' && typeof lastMessage.content === 'string') {
        return [
          ...messages.slice(0, -1),
          { ...lastMessage, content: lastMessage.content + chunk },
        ];
      }

      return [...messages, { role: 'assistant', content: chunk }];
    });
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

  private requestAssistantResponse(messages: ChatMessage[]): Observable<string> {
    return from(
      client.chat.completions.create({
        messages,
        model: environment.API_MODEL,
        stream: true,
      }),
    ).pipe(
      mergeMap((stream) => from(stream)),
      map((chunk) => chunk.choices[0]?.delta.content),
      filter((content): content is string => typeof content === 'string' && content.length > 0),
      throwIfEmpty(() => new Error('Ollama returned no text response.')),
    );
  }
}
