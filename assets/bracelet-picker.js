class BraceletPicker extends HTMLElement {
  connectedCallback() {
    const configEl = this.querySelector('[data-bracelet-picker-config]');
    if (!configEl) return;

    this.config = JSON.parse(configEl.textContent);
    this.answers = {};
    this.stepIndex = 0;

    this.wizardEl = this.querySelector('[data-picker-wizard]');
    this.resultsEl = this.querySelector('[data-picker-results]');
    this.loadingEl = this.querySelector('[data-picker-loading]');
    this.progressEl = this.querySelector('[data-picker-progress]');
    this.stepLabelEl = this.querySelector('[data-picker-step-label]');
    this.optionsEl = this.querySelector('[data-picker-options]');
    this.backBtn = this.querySelector('[data-picker-back]');
    this.skipBtn = this.querySelector('[data-picker-skip]');

    this.backBtn.textContent = this.config.text.back;
    this.skipBtn.textContent = this.config.text.skip;

    this.backBtn.addEventListener('click', this.goBack.bind(this));
    this.skipBtn.addEventListener('click', () => this.advanceStep(null));

    this.loadStep(0);
  }

  buildParams(uptoIndex) {
    const params = new URLSearchParams();
    for (let i = 0; i < uptoIndex; i += 1) {
      const step = this.config.steps[i];
      const value = this.answers[step.param];
      if (value) params.append(step.param, value);
    }
    return params;
  }

  async fetchFilterDocument(params) {
    params.set('section_id', this.config.sectionId);
    const url = `${this.config.collectionUrl}?${params.toString()}`;
    this.debugLog = this.debugLog || [];
    try {
      const response = await fetch(url);
      const text = await response.text();
      this.debugLog.push(
        `URL: ${url}\nStatus: ${response.status}\nLength: ${text.length}\nHas ProductGridContainer: ${text.includes(
          'ProductGridContainer'
        )}\nFirst 200 chars: ${text.slice(0, 200)}`
      );
      return new DOMParser().parseFromString(text, 'text/html');
    } catch (error) {
      this.debugLog.push(`URL: ${url}\nFETCH ERROR: ${error.message}`);
      throw error;
    }
  }

  setLoading(isLoading) {
    this.loadingEl.hidden = !isLoading;
    this.wizardEl.classList.toggle('bracelet-picker__wizard--loading', isLoading);
  }

  async loadStep(index) {
    if (index >= this.config.steps.length) {
      this.showResults();
      return;
    }

    this.setLoading(true);
    const step = this.config.steps[index];
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

    this.progressEl.textContent = `Step ${this.stepIndex + 1} of ${this.config.steps.length}`;
    this.stepLabelEl.textContent = step.label;
    this.backBtn.hidden = this.stepIndex === 0;

    this.optionsEl.innerHTML = '';
    options.forEach((option) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'bracelet-picker__option';

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

      button.addEventListener('click', () => this.advanceStep(option.value));
      this.optionsEl.appendChild(button);
    });
  }

  advanceStep(value) {
    const step = this.config.steps[this.stepIndex];
    if (value) {
      this.answers[step.param] = value;
    } else {
      delete this.answers[step.param];
    }
    this.loadStep(this.stepIndex + 1);
  }

  goBack() {
    if (this.stepIndex === 0) return;
    const previousStep = this.config.steps[this.stepIndex - 1];
    delete this.answers[previousStep.param];
    this.loadStep(this.stepIndex - 1);
  }

  restart() {
    this.answers = {};
    this.loadStep(0);
  }

  async showResults() {
    this.setLoading(true);
    const params = this.buildParams(this.config.steps.length);
    const doc = await this.fetchFilterDocument(params);
    this.setLoading(false);

    this.wizardEl.hidden = true;
    this.resultsEl.hidden = false;

    const grid = doc.getElementById('ProductGridContainer');
    const cards = grid ? grid.querySelectorAll('.grid__item') : [];

    if (!grid || cards.length === 0) {
      const debugHtml = (this.debugLog || [])
        .map((entry, i) => `<p><strong>Fetch ${i + 1}:</strong></p><pre style="white-space:pre-wrap;text-align:left;font-size:1.1rem;">${entry.replace(/</g, '&lt;')}</pre>`)
        .join('');
      this.resultsEl.innerHTML = `
        <div class="bracelet-picker__empty">
          <p>${this.config.text.empty}</p>
          <button type="button" class="button button--secondary" data-picker-restart>${this.config.text.restart}</button>
          <div data-picker-debug>${debugHtml}</div>
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
