firebase.app().options_.authDomain = 'auth.feildmaster.com'; // Override the default domain set by firebase

let authedUser = firebase.auth().currentUser;

function updateUser(user) {
  authedUser = user;
  console.debug(user);

  const isGuest = !user || user.isAnonymous;

  const displayName = isGuest ? 'Guest' : user.displayName || 'Unknown User';
  
  document.querySelector('body').classList.toggle('authed', !isGuest)

  document.querySelectorAll('.username').forEach(el => el.innerHTML = displayName);
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

firebase.auth().onAuthStateChanged(updateUser);

firebase.auth().getRedirectResult().catch(loginError);

const auth = {
  google,
  github,
  // twitter,
  // facebook,
  // email,
  // phone,
  logout,
};

export default auth;
