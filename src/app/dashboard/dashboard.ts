import { NgComponentOutlet } from '@angular/common';
import { Component, computed, ElementRef, signal, Type, ViewChild } from '@angular/core';
import { RouterLinkWithHref } from '@angular/router';
import { SimpleAnswer } from '../ai-models/day-01/simple-answer/simple-answer';
import { SimpleAnswerWithMemory } from '../ai-models/day-02/simple-answer-with-memory/simple-answer-with-memory';
import { OpenAIService } from '../open-aiservice';

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
  protected readonly messages = computed(() => this.openAIService.chatMessages().flatMap((message) => {
    if (message.role !== 'user' && message.role !== 'assistant') {
      return [];
    }

    return [{
      role: message.role,
      text: typeof message.content === 'string' ? message.content : '',
      modelTitle: message.role === 'assistant' ? this.selectedModelTitle() : undefined,
    }];
  }));
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
      prompt: 'Help me untangle this thought: ',
      icon: '⌁',
    },
    {
      title: 'Make a fresh start',
      prompt: 'Help me turn this idea into a clear plan: ',
      icon: '↗',
    },
    {
      title: 'Learn something new',
      prompt: 'I want to learn about ',
      icon: '◌',
    },
    {
      title: 'Create with me',
      prompt: 'Let’s brainstorm ideas for ',
      icon: '✳',
    },
  ];

  constructor(private readonly openAIService: OpenAIService) {
    if (typeof window !== 'undefined') {
      this.sidebarOpen.set(window.innerWidth > 760);
    }
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

  protected hasReceivedResponse(): boolean {
    return this.openAIService.hasReceivedResponse();
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

    if (!inputMessage || this.isLoading()) {
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

}
