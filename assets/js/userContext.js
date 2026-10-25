import auth from './login.js';

const userMenu = document.querySelector('#userMenu');
const loginMenu = document.querySelector('#loginMenu');

userMenu.querySelector('.logout').addEventListener('click', () => {
  userMenu.hidePopover();
  auth.logout();
});

loginMenu.querySelectorAll('[data-provider]').forEach((button) => {
  button.addEventListener('click', () => {
    loginMenu.hidePopover();
    auth[button.dataset.provider]();
  });
});
