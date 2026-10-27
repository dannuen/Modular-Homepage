// src/prompts.ts
var import_obsidian4 = require("obsidian");
// A modal that resolves with what build's finish(v) chose, or with cancel when it is closed any other way.
function askModal(app, title, cancel, build) {
  return new Promise((resolve) => {
    let result = cancel;
    new class extends import_obsidian4.Modal {
      onOpen() {
        this.titleEl.setText(title);
        build(this.contentEl, (v) => {
          result = v;
          this.close();
        });
      }
      onClose() {
        this.contentEl.empty();
        resolve(result);
      }
    }(app).open();
  });
}
function askName(app, title, value, cta) {
  return askModal(app, title, null, (contentEl, finish) => {
    let text = value;
    new import_obsidian4.Setting(contentEl).setName("Name").addText((t) => {
      t.setValue(value).setPlaceholder("Sunday, Study week…").onChange((v) => {
        text = v;
      });
      t.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.isComposing) {
          e.preventDefault();
          finish(text.trim() || null);
        }
      });
      window.setTimeout(() => {
        t.inputEl.focus();
        t.inputEl.select();
      }, 0);
    });
    new import_obsidian4.Setting(contentEl).addButton((b) => b.setButtonText("Cancel").onClick(() => finish(null))).addButton((b) => b.setButtonText(cta).setCta().onClick(() => finish(text.trim() || null)));
  });
}
function askConfirm(app, title, message, cta) {
  return askModal(app, title, false, (contentEl, finish) => {
    contentEl.createEl("p", { text: message });
    new import_obsidian4.Setting(contentEl).addButton((b) => b.setButtonText("Cancel").onClick(() => finish(false))).addButton((b) => b.setButtonText(cta).setWarning().onClick(() => finish(true)));
  });
}

