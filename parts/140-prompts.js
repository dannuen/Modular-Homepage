// src/prompts.ts
var import_obsidian4 = require("obsidian");
function askName(app, title, value, cta) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => {
      if (done) return;
      done = true;
      resolve(v);
      modal.close();
    };
    const modal = new class extends import_obsidian4.Modal {
      onOpen() {
        this.titleEl.setText(title);
        let text = value;
        new import_obsidian4.Setting(this.contentEl).setName("Name").addText((t) => {
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
        new import_obsidian4.Setting(this.contentEl).addButton((b) => b.setButtonText("Cancel").onClick(() => finish(null))).addButton((b) => b.setButtonText(cta).setCta().onClick(() => finish(text.trim() || null)));
      }
      onClose() {
        this.contentEl.empty();
        finish(null);
      }
    }(app);
    modal.open();
  });
}
function askConfirm(app, title, message, cta) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => {
      if (done) return;
      done = true;
      resolve(v);
      modal.close();
    };
    const modal = new class extends import_obsidian4.Modal {
      onOpen() {
        this.titleEl.setText(title);
        this.contentEl.createEl("p", { text: message });
        new import_obsidian4.Setting(this.contentEl).addButton((b) => b.setButtonText("Cancel").onClick(() => finish(false))).addButton((b) => b.setButtonText(cta).setWarning().onClick(() => finish(true)));
      }
      onClose() {
        this.contentEl.empty();
        finish(false);
      }
    }(app);
    modal.open();
  });
}

