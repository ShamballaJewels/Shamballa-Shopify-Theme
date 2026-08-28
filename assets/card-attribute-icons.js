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
  const icon = event.target.closest('.card-product-attribute-icon');

  // The overlay layout (floats on the photo, desktop widths) relies on
  // real :hover and its own nested label, so leave clicks on it alone.
  // Only the inline layout (a plain row below the photo, mobile widths)
  // has no hover at all and needs tap-to-reveal handled here.
  const row = icon && icon.closest('.card-product-attribute-icons');
  if (row && row.classList.contains('card-product-attribute-icons--overlay')) return;

  document.querySelectorAll('.card-product-attribute-icon--show-label').forEach(function (openIcon) {
    if (openIcon !== icon) hideActiveLabel(openIcon);
  });

  if (!icon) return;

  if (!icon.classList.contains('card-product-attribute-icon--show-label')) {
    showActiveLabel(icon);
    if (icon.tagName === 'A') event.preventDefault();
  }
});
