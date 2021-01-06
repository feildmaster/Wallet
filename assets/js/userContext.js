import { default as tippy } from './tippy.js';
import wallet from './wallet.js';
import auth from './login.js';

tippy('#user', {
  content: document.querySelector('#userContext').innerHTML,
  interactive: true,
  onMount(i) {
    i.popper.querySelector('.logout').addEventListener('click', () => {
      auth.logout();
      i.hide();
    });
  },
  onShow(i) {
    i.popper.querySelectorAll('.balance').forEach((el) => {
      el.textContent = wallet()[el.dataset.type] || 0;
    });
  },
});

tippy('#login', {
  content() {
    const container = document.createElement('div');
    [
      ['Google', auth.google],
      ['Github', auth.github],
    ].forEach(([title, fn]) => {
      const el = document.createElement('div');
      el.textContent = title;
      el.addEventListener('click', fn);
      container.append(el);
    });
    return container;
  },
  interactive: true,
});
