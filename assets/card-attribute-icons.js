document.addEventListener('click', function (event) {
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const icon = event.target.closest('.card-product-attribute-icon');

  document.querySelectorAll('.card-product-attribute-icon--show-label').forEach(function (openIcon) {
    if (openIcon !== icon) openIcon.classList.remove('card-product-attribute-icon--show-label');
  });

  if (!icon) return;

  if (!icon.classList.contains('card-product-attribute-icon--show-label')) {
    icon.classList.add('card-product-attribute-icon--show-label');
    if (icon.tagName === 'A') event.preventDefault();
  }
});
