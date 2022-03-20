export default class View {
  constructor() {
    this.btnStart = document.getElementById('start')
    this.btnStop = document.getElementById('stop')
    this.buttons = () => Array.from(document.querySelectorAll('button'))
    async function onBtnClick() { }
    this.onBtnClick = onBtnClick
    this.ignoreButtons = new Set(['unassigned']);
    this.DISABLE_BTN_TIMEOUT = 200;
  }

  onLoad() {
    this.changeCommandButtonsVisibility();
    this.btnStart.onclick = this.onStartClicked.bind(this);
  }

  changeCommandButtonsVisibility(hide = true) {
    Array.from(document.querySelectorAll('[name=command]'))
      .forEach(button => {
        const fn = hide ? 'add' : 'remove';
        button.classList[fn]('unassigned');
        function onClickReset() { }
        button.onclick = onClickReset;
      });
  }

  configureOnBtnClick(fn) {
    this.onBtnClick = fn;
  }

  async onStartClicked({
    srcElement: {
      innerText
    }
  }) {
    const btnText = innerText;
    await this.onBtnClick(btnText);
    this.toggleBtnStart();
    this.changeCommandButtonsVisibility(false);

    this.buttons()
      .filter(btn => this.notIsUnassignedButton(btn))
      .forEach(this.setupBtnAction.bind(this))
  }

  setupBtnAction(btn) {
    const text = btn.innerText.toLowerCase();

    if (text.includes('start')) return;
    if (text.includes('stop')) {
      btn.onclick = this.onStopBtn.bind(this);
      return;
    }

    btn.onclick = this.onCommandClick.bind(this)
  }

  async onCommandClick(btn) {
    const {
      srcElement: {
        classList,
        innerText
      }
    } = btn;
    this.toggleDisableCommandBtn(classList);
    await this.onBtnClick(innerText);

    setTimeout(
      () => this.toggleDisableCommandBtn(classList),
      this.DISABLE_BTN_TIMEOUT
    );
  }

  toggleDisableCommandBtn(classList) {
    if (!classList.contains('active')) {
      classList.add('active')
      return
    }

    classList.remove('active')
  }

  onStopBtn({
    srcElement: {
      innerText
    }
  }) {
    this.toggleBtnStart(false);
    this.changeCommandButtonsVisibility(true);
    return this.onBtnClick(innerText)
  }

  notIsUnassignedButton(btn) {
    const classes = Array.from(btn.classList);

    return !(!!classes.find(classItem => this.ignoreButtons.has(classItem)));
  }

  toggleBtnStart(active = true) {
    if (active) {
      this.btnStart.classList.add('hidden');
      this.btnStop.classList.remove('hidden');
      return;
    }
    this.btnStart.classList.remove('hidden');
    this.btnStop.classList.add('hidden');
  }
}