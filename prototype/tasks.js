document.getElementById('form').addEventListener('submit', event => {
  event.preventDefault();
  const input = document.getElementById('task');
  const error = document.getElementById('error');
  if (!input.value.trim()) { error.hidden = false; return; }
  error.hidden = true;
  const item = document.createElement('li');
  item.setAttribute('data-pf', 'tasks.item');
  item.setAttribute('data-pf-repeat', '');
  item.textContent = input.value.trim();
  const list = document.getElementById('list');
  list.append(item);
  document.getElementById('count').textContent = `${list.children.length} tasks`;
  input.value = '';
});
document.getElementById('task').addEventListener('input', () => { document.getElementById('error').hidden = true; });
