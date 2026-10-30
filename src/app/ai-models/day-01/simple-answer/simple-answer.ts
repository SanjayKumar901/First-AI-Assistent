import { Component } from '@angular/core';
import { OpenAIService } from '../../../open-aiservice';
import OpenAI from 'openai';

type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

@Component({
  imports: [],
  selector: 'app-simple-answer',
  styleUrl: './simple-answer.css',
  templateUrl: './simple-answer.html',
})
export class SimpleAnswer {
  constructor(private openAIService: OpenAIService) {}

  public sendMessage(inputMessage: string): void {
    const requestMessages: ChatMessage[] = [
      { role: 'user', content: inputMessage },
    ];
    this.openAIService.setChatMessages([
      ...this.openAIService.getChatMessages(),
      ...requestMessages,
    ]);

    this.openAIService
      .trackRequest(() => this.openAIService.SendMessageToOpenAI(requestMessages))
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
