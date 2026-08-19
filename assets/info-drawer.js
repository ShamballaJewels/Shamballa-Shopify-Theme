class InfoDrawer extends HTMLElement {
  constructor() {
    super();
    this.overlay = this.querySelector('[data-info-drawer-overlay]');
    this.closeButton = this.querySelector('[data-info-drawer-close]');
    this.inner = this.querySelector('.info-drawer__inner');

    this.closeButton.addEventListener('click', this.close.bind(this));
    this.overlay.addEventListener('click', this.close.bind(this));
    this.addEventListener('keyup', (event) => {
      if (event.code.toUpperCase() === 'ESCAPE') this.close();
    });
  }

  open(opener) {
    this.openedBy = opener;
    this.classList.add('active');
    document.body.classList.add('overflow-hidden');
    if (typeof trapFocus === 'function') trapFocus(this, this.inner);
  }

  close() {
    this.classList.remove('active');
    document.body.classList.remove('overflow-hidden');
    if (typeof removeTrapFocus === 'function') removeTrapFocus(this.openedBy);
  }
}

customElements.define('info-drawer', InfoDrawer);

document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-open-drawer]');
  if (trigger) {
    const drawerId = trigger.getAttribute('data-open-drawer');
    const drawer = document.querySelector(`info-drawer[data-drawer-id="${drawerId}"]`);
    if (drawer) drawer.open(trigger);
    return;
  }

  document.querySelectorAll('info-drawer.active').forEach((drawer) => {
    if (drawer.inner && !drawer.inner.contains(event.target)) {
      drawer.close();
    }
  });
});
