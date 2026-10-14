const more = document.getElementById('more');
const details = document.getElementById('details');
more.addEventListener('click', () => {
  details.hidden = !details.hidden;
  more.textContent = details.hidden ? 'Show details' : 'Hide details';
});
