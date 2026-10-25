firebase.app().options_.authDomain = 'auth.feildmaster.com'; // Override the default domain set by firebase

let authedUser = firebase.auth().currentUser;

function updateUser(user) {
  authedUser = user;
  console.debug(user);

  const isGuest = !user || user.isAnonymous;

  const displayName = isGuest ? 'Guest' : user.displayName || 'Unknown User';
  
  document.querySelector('body').classList.toggle('authed', !isGuest)

  document.querySelectorAll('.username').forEach(el => el.textContent = displayName);
}

function loginError(error) {
  const errorCode = error.code;
  const errorMessage = error.message;
  const email = error.email;
  const credential = error.credential;
  switch (errorCode) {
    case 'auth/account-exists-with-different-credential': // Ask to login with different provider, link accounts
    case 'auth/auth-domain-config-required': // initialized without authDomain
    case 'auth/credential-already-in-use': // Already linked to a different user, sign in with error.credential
    case 'auth/email-already-in-use': // Auth#fetchProvidersForEmail, User#linkWithCredential
    case 'auth/operation-not-allowed':
    case 'auth/operation-not-supported-in-this-environment':
    case 'auth/timeout':
    case 'auth/internal-error': // We need to re-auth or revoke the token
  }
  console.debug('Login error:', error);
}
  
function login(provider) {
  if (authedUser) {
    authedUser.linkWithPopup(provider).catch(loginError);
  } else {
    firebase.auth().signInWithPopup(provider).catch(loginError);
  }
}

function logout() {
  return firebase.auth().signOut().then(() => {
    console.debug('signed out');
  });
}

function google() {
  const provider = new firebase.auth.GoogleAuthProvider();
  // provider.addScope(''); // https://developers.google.com/identity/protocols/googlescopes
  login(provider);
}
function twitter() {
  const provider = new firebase.auth.TwitterAuthProvider();
  login(provider);
}
function facebook() {
  const provider = new firebase.auth.FacebookAuthProvider();
  // provider.addScope(); // https://developers.facebook.com/docs/facebook-login/permissions/
  login(provider);
}
function github() {
  const provider = new firebase.auth.GithubAuthProvider();
  // provider.addScope(); // https://developer.github.com/apps/building-oauth-apps/scopes-for-oauth-apps/
  login(provider);
}
function discord() {
  window.open(`https://auth.feildmaster.com/discord?origin=${encodeURIComponent(location.origin)}`, 'auth', 'height=800,width=400');
}

const AUTH_ORIGIN = 'https://auth.feildmaster.com';

const LINK_PROVIDERS = {
  google: () => new firebase.auth.GoogleAuthProvider(),
  github: () => new firebase.auth.GithubAuthProvider(),
};

const ALREADY_ATTACHED = 'That account is already attached to a different wallet account.';
const LINK_MESSAGES = {
  'auth/credential-already-in-use': ALREADY_ATTACHED,
  'functions/already-exists': ALREADY_ATTACHED,
  'auth/provider-already-linked': 'That account type is already linked.',
  'auth/popup-blocked': 'Your browser blocked the sign-in window.',
  'functions/permission-denied': 'Discord did not accept that sign-in.',
};
const LINK_IGNORED = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'link/cancelled'];

function linkMessage(error) {
  const code = error && error.code;
  if (LINK_IGNORED.includes(code)) return '';
  return LINK_MESSAGES[code] || 'Could not link that account.';
}

function linkDiscord() {
  return new Promise((resolve, reject) => {
    const nonce = crypto.randomUUID();
    const query = new URLSearchParams({ origin: location.origin, mode: 'link', nonce });
    const popup = window.open(`${AUTH_ORIGIN}/discord?${query}`, 'auth', 'height=800,width=400');
    if (!popup) {
      reject({ code: 'auth/popup-blocked' });
      return;
    }
    let received = false;

    function onMessage({ origin, data, source }) {
      if (origin !== AUTH_ORIGIN || !data || data.event !== 'Discord link' || data.nonce !== nonce) return;
      received = true;
      clearInterval(timer);
      window.removeEventListener('message', onMessage);
      if (source) source.postMessage({ event: 'Discord link received', nonce }, AUTH_ORIGIN);
      const { state, code, redirect } = data;
      firebase.functions().httpsCallable('auth-discord-token')({ state, code, redirect })
        .then(({ data: result }) => {
          if (result !== 'LINKED') throw new Error('Unexpected response');
          return authedUser.getIdToken(true);
        })
        .then(() => resolve(), reject);
    }

    const timer = setInterval(() => {
      if (!popup.closed) return;
      clearInterval(timer);
      setTimeout(() => {
        if (received) return;
        window.removeEventListener('message', onMessage);
        reject({ code: 'link/cancelled' });
      }, 1000);
    }, 500);

    window.addEventListener('message', onMessage);
  });
}

function link(name) {
  if (!authedUser || authedUser.isAnonymous) return Promise.reject({ code: 'link/signed-out' });
  if (name === 'discord') return linkDiscord();
  const create = LINK_PROVIDERS[name];
  if (!create) return Promise.reject({ code: 'link/unknown' });
  return authedUser.linkWithPopup(create());
}

async function linked(user) {
  const { claims } = await user.getIdTokenResult();
  const ids = user.providerData.map(({ providerId }) => providerId);
  return {
    google: ids.includes('google.com'),
    github: ids.includes('github.com'),
    discord: claims['discord.com'] === true,
  };
}

firebase.auth().onAuthStateChanged(updateUser);

firebase.auth().getRedirectResult().catch(loginError);

const auth = {
  google,
  github,
  twitter,
  facebook,
  discord,
  link,
  linked,
  linkMessage,
  // email,
  // phone,
  logout,
};

export default auth;
