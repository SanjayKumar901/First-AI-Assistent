import { Component, signal } from '@angular/core';
import { RouterLinkWithHref } from '@angular/router';

@Component({
  imports: [RouterLinkWithHref],
  selector: 'app-home',
  templateUrl: './home.html',
})
export class Home {
  protected readonly title = signal('First-AI-Assistent');
}
