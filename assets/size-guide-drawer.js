class SizeGuideDrawer extends HTMLElement {
  constructor() {
    super();
    this.overlay = this.querySelector('[data-size-guide-overlay]');
    this.closeButton = this.querySelector('[data-size-guide-close]');
    this.inner = this.querySelector('.size-guide-drawer__inner');

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

customElements.define('size-guide-drawer', SizeGuideDrawer);

document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-size-guide-open]');
  if (trigger) {
    const drawer = document.querySelector('size-guide-drawer');
    if (drawer) drawer.open(trigger);
    return;
  }

  const activeDrawer = document.querySelector('size-guide-drawer.active');
  if (activeDrawer && activeDrawer.inner && !activeDrawer.inner.contains(event.target)) {
    activeDrawer.close();
  }
});
