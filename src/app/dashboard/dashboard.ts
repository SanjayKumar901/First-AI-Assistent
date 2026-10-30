import { NgComponentOutlet } from '@angular/common';
import { Component, ElementRef, signal, Type, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLinkWithHref } from '@angular/router';
import { SimpleAnswer } from '../ai-models/day-01/simple-answer/simple-answer';
import { SimpleAnswerWithMemory } from '../ai-models/day-02/simple-answer-with-memory/simple-answer-with-memory';
import { OpenAIService } from '../open-aiservice';
import OpenAI from 'openai';

interface AiModelComponent {
  sendMessage(inputMessage: string): void;
}

type ModelOption = {
  id: string;
  title: string;
  component: Type<AiModelComponent>;
};

type Message = {
  role: 'user' | 'assistant';
  text: string;
  modelTitle?: string;
};

type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

@Component({
  imports: [NgComponentOutlet, RouterLinkWithHref],
  selector: 'app-dashboard',
  styleUrl: './dashboard.css',
  templateUrl: './dashboard.html',
})
export class Dashboard {
  @ViewChild('promptInput') private promptInput?: ElementRef<HTMLTextAreaElement>;
  @ViewChild(NgComponentOutlet)
  private modelOutlet?: NgComponentOutlet<AiModelComponent>;

  protected readonly sidebarOpen = signal(true);
  protected readonly prompt = signal('');
  protected readonly messages = signal<Message[]>([]);
  protected readonly models: ModelOption[] = [
    { id: 'simple-answer', title: 'Simple Answer', component: SimpleAnswer },
    {
      id: 'simple-answer-with-memory',
      title: 'Simple Answer With Memory',
      component: SimpleAnswerWithMemory,
    },
  ];
  protected readonly selectedModelId = signal(this.models[0].id);
  protected readonly suggestions = [
    {
      title: 'Untangle a thought',
      description: 'Get perspective on what’s on your mind',
      prompt: 'Help me untangle this thought: ',
      icon: '⌁',
      tone: 'sage',
    },
    {
      title: 'Make a fresh start',
      description: 'Turn a rough idea into a clear plan',
      prompt: 'Help me turn this idea into a clear plan: ',
      icon: '↗',
      tone: 'peach',
    },
    {
      title: 'Learn something new',
      description: 'Explore a topic, one step at a time',
      prompt: 'I want to learn about ',
      icon: '◌',
      tone: 'blue',
    },
    {
      title: 'Create with me',
      description: 'Brainstorm, write, and make things better',
      prompt: 'Let’s brainstorm ideas for ',
      icon: '✳',
      tone: 'lilac',
    },
  ];

  constructor(private openAIService: OpenAIService) {
    if (typeof window !== 'undefined') {
      this.sidebarOpen.set(window.innerWidth > 760);
    }
    this.openAIService.chatMessages$
      .pipe(takeUntilDestroyed())
      .subscribe((messages) => this.updateMessages(messages));
  }

  protected toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }

  protected updatePrompt(event: Event): void {
    this.prompt.set((event.target as HTMLTextAreaElement).value);
  }

  protected selectModel(event: Event): void {
    const modelId = (event.target as HTMLSelectElement).value;

    if (this.models.some((model) => model.id === modelId)) {
      this.selectedModelId.set(modelId);
    }
  }

  protected selectedModelTitle(): string {
    return this.selectedModel().title;
  }

  protected isLoading(): boolean {
    return this.openAIService.isLoading();
  }

  protected selectedModelComponent(): Type<AiModelComponent> {
    return this.selectedModel().component;
  }

  private selectedModel(): ModelOption {
    const model = this.models.find((option) => option.id === this.selectedModelId());
    if (!model) {
      throw new Error(`Selected AI model "${this.selectedModelId()}" is not registered.`);
    }
    return model;
  }

  protected useSuggestion(value: string): void {
    this.prompt.set(value);
    this.promptInput?.nativeElement.focus();
  }

  protected handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      (event.currentTarget as HTMLTextAreaElement).form?.requestSubmit();
    }
  }

  protected submitPrompt(event: Event): void {
    event.preventDefault();
    const inputMessage = this.prompt().trim();

    if (!inputMessage) {
      return;
    }

    const model = this.modelOutlet?.componentInstance;
    if (!model) {
      throw new Error(`Selected AI model "${this.selectedModelId()}" has not loaded.`);
    }

    model.sendMessage(inputMessage);
    this.prompt.set('');
  }

  protected startNewChat(): void {
    this.openAIService.setChatMessages([]);
    this.prompt.set('');
  }

  private updateMessages(messages: ChatMessage[]): void {
    debugger;
    this.messages.set(messages.flatMap((message) => {
      if (message.role !== 'user' && message.role !== 'assistant') {
        return [];
      }

      return [{
        role: message.role,
        text: typeof message.content === 'string' ? message.content : '',
        modelTitle: message.role === 'assistant' ? this.selectedModelTitle() : undefined,
      }];
    }));
  }
}
