import { App, Modal, Setting } from 'obsidian';

export class TextPrompt extends Modal {
  constructor(
    app: App,
    private label: string,
    private value: string,
    private submit: (value: string) => void,
  ) {
    super(app);
  }

  onOpen(): void {
    this.setTitle(this.label);
    let input: HTMLInputElement;
    new Setting(this.contentEl).setName(this.label).addText((text) => {
      input = text.inputEl;
      text.setValue(this.value).onChange((value) => {
        this.value = value;
      });
      text.inputEl.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          this.save();
        }
      });
    });
    new Setting(this.contentEl).addButton((button) =>
      button
        .setButtonText('Save')
        .setCta()
        .onClick(() => this.save()),
    );
    input!.focus();
    input!.select();
  }

  private save(): void {
    if (this.value.trim()) this.submit(this.value.trim());
    this.close();
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
