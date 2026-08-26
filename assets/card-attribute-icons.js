function hideActiveLabel(icon) {
  icon.classList.remove('card-product-attribute-icon--show-label');
  const row = icon.closest('.card-product-attribute-icons');
  const label = row && row.querySelector('.card-product-attribute-icons__active-label');
  if (label) label.classList.remove('is-visible');
}

function showActiveLabel(icon) {
  icon.classList.add('card-product-attribute-icon--show-label');
  const row = icon.closest('.card-product-attribute-icons');
  const label = row && row.querySelector('.card-product-attribute-icons__active-label');
  if (label) {
    label.textContent = icon.dataset.label || '';
    label.classList.add('is-visible');
  }
}

document.addEventListener('click', function (event) {
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const icon = event.target.closest('.card-product-attribute-icon');

  document.querySelectorAll('.card-product-attribute-icon--show-label').forEach(function (openIcon) {
    if (openIcon !== icon) hideActiveLabel(openIcon);
  });

  if (!icon) return;

  if (!icon.classList.contains('card-product-attribute-icon--show-label')) {
    showActiveLabel(icon);
    if (icon.tagName === 'A') event.preventDefault();
  }
});
