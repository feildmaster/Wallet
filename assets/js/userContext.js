import auth from './login.js';

const userMenu = document.querySelector('#userMenu');
const loginMenu = document.querySelector('#loginMenu');
const linkedDialog = document.querySelector('#linkedDialog');
const linkRows = [...linkedDialog.querySelectorAll('.linked-row')];
const linkError = linkedDialog.querySelector('.link-error');

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

function showLinked(state) {
  linkRows.forEach((row) => {
    const isLinked = Boolean(state[row.dataset.provider]);
    row.querySelector('.status').hidden = !isLinked;
    row.querySelector('.link').hidden = isLinked;
  });
}

function refreshLinked(user) {
  if (!user || user.isAnonymous) {
    linkedDialog.close();
    return Promise.resolve();
  }
  return auth.linked(user).then((state) => {
    if (firebase.auth().currentUser === user) showLinked(state);
  }).catch(console.error);
}

firebase.auth().onAuthStateChanged(refreshLinked);

userMenu.querySelector('.open-linked').addEventListener('click', () => {
  userMenu.hidePopover();
  linkError.hidden = true;
  linkedDialog.showModal();
  refreshLinked(firebase.auth().currentUser);
});

linkedDialog.addEventListener('click', (event) => {
  if (event.target === linkedDialog) linkedDialog.close();
});

linkRows.forEach((row) => {
  const button = row.querySelector('.link');
  button.addEventListener('click', () => {
    const user = firebase.auth().currentUser;
    linkError.hidden = true;
    button.disabled = true;
    auth.link(row.dataset.provider)
      .then(() => refreshLinked(user))
      .catch((error) => {
        console.debug('Link error:', error);
        const message = auth.linkMessage(error);
        linkError.textContent = message;
        linkError.hidden = !message;
      })
      .finally(() => {
        button.disabled = false;
      });
  });
});
