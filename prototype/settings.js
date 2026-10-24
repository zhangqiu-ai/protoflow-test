document.getElementById('save').addEventListener('click', () => { document.getElementById('saved').hidden = false; });
for (const id of ['notify', 'weekly']) {
  document.getElementById(id).addEventListener('change', () => { document.getElementById('saved').hidden = true; });
}
