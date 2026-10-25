const PAGE_SIZE = 30;

let wallet = {};
let transactions = null;
let cursor = null;
let loading = false;
let done = false;
let session = 0;

const sentinel = document.createElement('div');
document.querySelector('#history').after(sentinel);

const observer = new IntersectionObserver((entries) => {
  if (entries.some(entry => entry.isIntersecting)) loadMore();
}, { rootMargin: '300px' });

function addEntry(data) {
  const container = document.createElement('div');
  container.innerHTML = document.querySelector('#entry').innerHTML;
  container.querySelector('.memo').textContent = data.memo;
  const amt = container.querySelector('.currency');
  amt.dataset.type = data.currency;
  amt.textContent = data.amount.toLocaleString();
  container.querySelector('.date').textContent = new Intl.DateTimeFormat().format(new Date(data.date.seconds * 1000));
  if (data.status === 'canceled') {
    container.querySelector('.entry').classList.add('canceled');
    const canceled = document.createElement('div');
    canceled.classList.add('note');
    canceled.textContent = 'Canceled';
    container.querySelector('.memo').append(canceled);
  }
  document.querySelector('#history').append(container);
}

function loadMore() {
  if (!transactions || loading || done) return;
  loading = true;
  const current = session;
  const query = cursor ? transactions.startAfter(cursor) : transactions;
  query.get().then((snap) => {
    if (current !== session) return;
    snap.docs.forEach(doc => addEntry(doc.data()));
    if (snap.docs.length) cursor = snap.docs[snap.docs.length - 1];
    done = snap.docs.length < PAGE_SIZE;
    loading = false;
    observer.unobserve(sentinel);
    if (!done) observer.observe(sentinel);
  }).catch((error) => {
    if (current !== session) return;
    console.error(error);
    loading = false;
  });
}

function loadWallet(user) {
  session += 1;
  observer.unobserve(sentinel);
  transactions = null;
  cursor = null;
  loading = false;
  done = false;
  document.querySelector('#history').textContent = '';
  if (!user) {
    wallet = {};
    return;
  }
  const ref = firebase.firestore().doc(`wallet/${user.uid}`);
  ref.get().then((snap) => {
    const data = snap.data();
    wallet = { ...data };
    Object.keys(data).forEach(key => document.querySelectorAll(`.balance[data-type="${key}"]`)
      .forEach(el => el.innerHTML = data[key].toLocaleString()));
  });
  // TODO: Cache and limit by timestamp updates
  transactions = ref.collection('transactions')
    .where('status', 'in', ['completed', 'canceled'])
    .orderBy('date', 'desc')
    .limit(PAGE_SIZE);
  loadMore();
}

firebase.auth().onAuthStateChanged(loadWallet);

export default () => ({ ...wallet });
