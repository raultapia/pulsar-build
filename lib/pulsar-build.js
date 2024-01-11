'use babel';

import { CompositeDisposable } from 'atom';
const fs = require('fs');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getTargets(makefile) {
  const content = fs.readFileSync(makefile, 'utf8');
  const targetRegex = /^([a-zA-Z0-9_-]+):/gm;
  const targets = [];
  let match;
  while((match = targetRegex.exec(content)) !== null) {
    targets.push(match[1]);
  }
  return targets;
}

class MyPanel {
  constructor(targets, result) {
    this.panelContent = document.createElement('div');
    this.panelContent.style.fontSize = '20px';
    this.panelContent.style.width = 'auto';
    this.result = result;

    this.optionList = document.createElement('ul');
    this.optionList.style.listStyleType = 'none';
    this.optionList.style.padding = '0';
    this.optionList.style.margin = '0';
    this.optionList.style.maxHeight = '600px';
    this.optionList.style.overflowY = 'auto';
    this.optionList.style.cursor = 'default';

    targets.forEach(option => {
      const listItem = document.createElement('li');
      listItem.textContent = option;
      listItem.addEventListener('mouseover', () => {listItem.style.backgroundColor = 'rgb(80, 80, 80)';});
      listItem.addEventListener('mouseout', () => {listItem.style.backgroundColor = '';});
      this.optionList.appendChild(listItem);
    });

    this.optionList.addEventListener('click', (event) => {
      if(event.target.tagName === 'LI') {
        this.handleOptionClick(event.target.textContent);
        this.destroy();
      }
    });

    this.panelContent.appendChild(this.optionList);

    this.panel = atom.workspace.addModalPanel({
      item: this.panelContent,
      visible: true
    });
  }

  handleOptionClick(option) {
    this.result.textContent = option;
  }

  destroy() {
    this.panel.destroy();
  }
}

module.exports = {
  async activate(state) {
    this.subscriptions = new CompositeDisposable();
    this.subscriptions.add(
      atom.commands.add('atom-workspace', {
        'pulsar-build:build': () => this.build(),
        'pulsar-build:select-target': () => this.manu(),
        'core:cancel': () => {if(this.panelTarget !== undefined) this.panelTarget.destroy();}
      })
    );

    await sleep(1000);

    const makefile = atom.project.getPaths()[0] + "/build/Makefile";
    this.currentTarget = document.createElement('div');
    this.currentTarget.classList.add('inline-block');
    if(fs.existsSync(makefile)) this.currentTarget.textContent = 'all';
    else this.currentTarget.textContent = 'No build';
    let statusBar = document.querySelector("status-bar");
    if(statusBar != null) {
      statusBar.addLeftTile({ item: this.currentTarget, priority: -1 });
      this.currentTarget.addEventListener('click', () => {this.build();});
      this.currentTarget.addEventListener('contextmenu', () => {this.menu();});
    }
  },

  deactivate() {
    this.subscriptions.dispose();
  },

  menu() {
    const makefile = atom.project.getPaths()[0] + "/build/Makefile";
    if(!fs.existsSync(makefile)) return;

    const targets = getTargets(makefile);
    this.panelTarget = new MyPanel(targets, this.currentTarget);
  },

  async build() {
    if(this.currentTarget.textContent === "No build"){
      return;
    }
    
    const command = "make " + this.currentTarget.textContent + " -C " + atom.project.getPaths()[0] + "/build -j8 --no-print-directory";
    if(atom.workspace.panelContainers.bottom.panels.length == 0){
      atom.commands.dispatch(atom.views.getView(atom.workspace), 'platformio-ide-terminal:new');
      await sleep(1000);
    }

    var need_toggle = true;
    for(const panel of atom.workspace.panelContainers.bottom.panels){
      if(panel.visible) need_toggle = false;
    }
    if(need_toggle){
      atom.commands.dispatch(atom.views.getView(atom.workspace), 'platformio-ide-terminal:toggle');
      await sleep(1000);
    }

    atom.config.set('platformio-ide-terminal.customTexts.customText2', command);
    await sleep(100);
    atom.commands.dispatch(atom.views.getView(atom.workspace), 'platformio-ide-terminal:insert-custom-text-2');
    await sleep(100);
    atom.config.set('platformio-ide-terminal.customTexts.customText2', '');
  }

};
