class BraceletPicker extends HTMLElement {
  connectedCallback() {
    const configEl = this.querySelector('[data-bracelet-picker-config]');
    if (!configEl) return;

    this.config = JSON.parse(configEl.textContent);
    this.steps = [...this.config.steps];
    this.answers = {};
    this.stepIndex = 0;

    this.wizardEl = this.querySelector('[data-picker-wizard]');
    this.resultsEl = this.querySelector('[data-picker-results]');
    this.loadingEl = this.querySelector('[data-picker-loading]');
    this.progressFillEl = this.querySelector('[data-picker-progress-fill]');
    this.progressTextEl = this.querySelector('[data-picker-progress-text]');
    this.stepLabelEl = this.querySelector('[data-picker-step-label]');
    this.optionsEl = this.querySelector('[data-picker-options]');
    this.backBtn = this.querySelector('[data-picker-back]');
    this.skipBtn = this.querySelector('[data-picker-skip]');

    this.backBtn.textContent = this.config.text.back;
    this.skipBtn.textContent = this.config.text.skip;

    this.backBtn.addEventListener('click', this.goBack.bind(this));
    this.skipBtn.addEventListener('click', () => this.advanceStep(null, null));

    this.init();
  }

  async init() {
    try {
      const response = await fetch(this.config.collectionUrl);
      const text = await response.text();
      const doc = new DOMParser().parseFromString(text, 'text/html');
      const grid = doc.querySelector('#product-grid, [id^="product-grid"]');
      this.sectionId = grid ? grid.dataset.id : null;
    } catch (error) {
      this.sectionId = null;
    }

    if (!this.sectionId) {
      this.showResults();
      return;
    }

    this.loadStep(0);
  }

  buildParams(uptoIndex) {
    const params = new URLSearchParams();
    for (let i = 0; i < uptoIndex; i += 1) {
      const step = this.steps[i];
      const value = this.answers[step.param];
      if (value) params.append(step.param, value);
    }
    return params;
  }

  async fetchFilterDocument(params) {
    params.set('section_id', this.sectionId);
    const url = `${this.config.collectionUrl}?${params.toString()}`;
    const response = await fetch(url);
    const text = await response.text();
    return new DOMParser().parseFromString(text, 'text/html');
  }

  setLoading(isLoading) {
    this.loadingEl.hidden = !isLoading;
    this.wizardEl.classList.toggle('bracelet-picker__wizard--loading', isLoading);
  }

  updateProgress() {
    const total = this.steps.length;
    const percent = Math.round((this.stepIndex / total) * 100);
    this.progressFillEl.style.width = `${percent}%`;
    this.progressTextEl.textContent = `Step ${this.stepIndex + 1} of ${total}`;

    if (!this.debugProgressEl) {
      this.debugProgressEl = document.createElement('div');
      this.debugProgressEl.style.cssText = 'font-size:1.1rem;text-align:center;opacity:0.6;margin:0.4rem 0;';
      this.progressFillEl.closest('[data-picker-progress]').insertAdjacentElement('afterend', this.debugProgressEl);
    }
    const rect = this.progressFillEl.getBoundingClientRect();
    this.debugProgressEl.textContent = `DEBUG: stepIndex=${this.stepIndex}, total=${total}, percent=${percent}%, rect.width=${rect.width}px, trackWidth=${this.progressFillEl.parentElement.getBoundingClientRect().width}px, steps=${this.steps.map((s) => s.param).join(',')}`;
  }

  async loadStep(index) {
    if (index >= this.steps.length) {
      this.showResults();
      return;
    }

    this.setLoading(true);
    const step = this.steps[index];
    const params = this.buildParams(index);
    const doc = await this.fetchFilterDocument(params);
    this.setLoading(false);

    const input = doc.querySelector(`input[name="${step.param}"]`);
    if (!input) {
      this.loadStep(index + 1);
      return;
    }

    const fieldset = input.closest('fieldset');
    const optionInputs = (fieldset || doc).querySelectorAll(`input[name="${step.param}"]`);
    const seen = new Set();
    const options = [];

    optionInputs.forEach((optionInput) => {
      if (seen.has(optionInput.value)) return;
      seen.add(optionInput.value);

      const label = optionInput.closest('label');
      const labelText = label ? label.querySelector('.facet-checkbox__text-label') : null;
      const countText = label ? label.querySelector('.facet-checkbox__text') : null;
      const countMatch = countText ? countText.textContent.match(/\((\d+)\)/) : null;

      options.push({
        value: optionInput.value,
        label: labelText ? labelText.textContent.trim() : optionInput.value,
        count: countMatch ? countMatch[1] : null,
      });
    });

    if (options.length === 0) {
      this.loadStep(index + 1);
      return;
    }

    this.stepIndex = index;
    this.renderStep(step, options);
  }

  renderStep(step, options) {
    this.wizardEl.hidden = false;
    this.resultsEl.hidden = true;

    this.updateProgress();
    this.stepLabelEl.textContent = step.label;
    this.backBtn.hidden = this.stepIndex === 0;

    this.optionsEl.innerHTML = '';
    this.optionsEl.classList.toggle('bracelet-picker__options--with-images', Boolean(step.hasImages));

    options.forEach((option) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'bracelet-picker__option';
      button.dataset.optionValue = option.value;

      if (step.hasImages) {
        const imageWrap = document.createElement('span');
        imageWrap.className = 'bracelet-picker__option-image';
        const img = document.createElement('img');
        img.alt = '';
        img.loading = 'lazy';
        img.addEventListener('load', () => imageWrap.classList.add('is-loaded'));
        imageWrap.appendChild(img);
        button.appendChild(imageWrap);
      }

      const labelSpan = document.createElement('span');
      labelSpan.className = 'bracelet-picker__option-label';
      labelSpan.textContent = option.label;
      button.appendChild(labelSpan);

      if (option.count) {
        const countSpan = document.createElement('span');
        countSpan.className = 'bracelet-picker__option-count';
        countSpan.textContent = `${option.count} styles`;
        button.appendChild(countSpan);
      }

      button.addEventListener('click', () => this.advanceStep(option.value, option.label));
      this.optionsEl.appendChild(button);
    });

    if (step.hasImages) {
      this.loadOptionImages(step, options);
    }
  }

  async loadOptionImages(step, options) {
    await Promise.all(
      options.map(async (option) => {
        try {
          const params = this.buildParams(this.stepIndex);
          params.set(step.param, option.value);
          params.set('section_id', this.sectionId);
          const url = `${this.config.collectionUrl}?${params.toString()}`;
          const response = await fetch(url);
          const text = await response.text();
          const doc = new DOMParser().parseFromString(text, 'text/html');
          const cardImage = doc.querySelector('.card__media img');
          if (!cardImage) return;

          const button = this.optionsEl.querySelector(`[data-option-value="${window.CSS.escape(option.value)}"]`);
          const img = button ? button.querySelector('.bracelet-picker__option-image img') : null;
          if (img) {
            img.src = cardImage.getAttribute('src');
            img.srcset = cardImage.getAttribute('srcset') || '';
          }
        } catch (error) {
          // Leave the placeholder if a specific option's image fails to load.
        }
      })
    );
  }

  applyConditionalSteps(step, label) {
    (this.config.conditionalSteps || []).forEach((conditional) => {
      if (conditional.afterParam !== step.param) return;

      const insertIndex = this.stepIndex + 1;
      const alreadyInserted = this.steps[insertIndex] && this.steps[insertIndex].param === conditional.step.param;
      const shouldInsert = Boolean(label) && label.toLowerCase() === conditional.whenLabel.toLowerCase();

      if (shouldInsert && !alreadyInserted) {
        this.steps.splice(insertIndex, 0, conditional.step);
      } else if (!shouldInsert && alreadyInserted) {
        this.steps.splice(insertIndex, 1);
        delete this.answers[conditional.step.param];
      }
    });
  }

  advanceStep(value, label) {
    const step = this.steps[this.stepIndex];
    if (value) {
      this.answers[step.param] = value;
    } else {
      delete this.answers[step.param];
    }

    this.applyConditionalSteps(step, label);
    this.loadStep(this.stepIndex + 1);
  }

  goBack() {
    if (this.stepIndex === 0) return;
    const previousStep = this.steps[this.stepIndex - 1];
    delete this.answers[previousStep.param];
    this.loadStep(this.stepIndex - 1);
  }

  restart() {
    this.answers = {};
    this.steps = [...this.config.steps];
    this.loadStep(0);
  }

  async showResults() {
    this.setLoading(true);
    const params = this.buildParams(this.steps.length);
    const doc = await this.fetchFilterDocument(params);
    this.setLoading(false);

    this.wizardEl.hidden = true;
    this.resultsEl.hidden = false;

    const grid = doc.getElementById('ProductGridContainer');
    const cards = grid ? grid.querySelectorAll('.grid__item') : [];

    if (!grid || cards.length === 0) {
      this.resultsEl.innerHTML = `
        <div class="bracelet-picker__empty">
          <p>${this.config.text.empty}</p>
          <button type="button" class="button button--secondary" data-picker-restart>${this.config.text.restart}</button>
        </div>
      `;
    } else {
      this.resultsEl.innerHTML = `
        <div class="bracelet-picker__results-header">
          <button type="button" class="link bracelet-picker__restart" data-picker-restart>${this.config.text.restart}</button>
        </div>
        <div class="bracelet-picker__results-grid">${grid.innerHTML}</div>
      `;
    }

    const restartBtn = this.resultsEl.querySelector('[data-picker-restart]');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        this.restart();
        this.resultsEl.hidden = true;
        this.wizardEl.hidden = false;
      });
    }
  }
}

customElements.define('bracelet-picker', BraceletPicker);
