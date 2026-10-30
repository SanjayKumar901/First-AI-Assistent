import { Component } from '@angular/core';
import { OpenAIService } from '../../../open-aiservice';
import OpenAI from 'openai';

type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

@Component({
  imports: [],
  selector: 'app-simple-answer-with-memory',
  styleUrl: './simple-answer-with-memory.css',
  templateUrl: './simple-answer-with-memory.html',
})
export class SimpleAnswerWithMemory {
  constructor(private openAIService: OpenAIService) {}

  public sendMessage(inputMessage: string): void {
    const messages: ChatMessage[] = [
      ...this.openAIService.getChatMessages(),
      { role: 'user', content: inputMessage },
    ];
    this.openAIService.setChatMessages(messages);

    this.openAIService
      .trackRequest(() => this.openAIService.SendMessageToOpenAI(messages))
      .subscribe({
        next: (answer) => {
          this.openAIService.setChatMessages([
            ...this.openAIService.getChatMessages(),
            { role: 'assistant', content: answer },
          ]);
        },
        error: (error) => console.error('Ollama request failed:', error),
      });
  }
}
