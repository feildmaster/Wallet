const PAGE_SIZE = 30;

let wallet = {};
let transactions = null;
let entries = new Map();
let loading = false;
let done = false;
let session = 0;
let unsubscribers = [];

const sentinel = document.createElement('div');
document.querySelector('#history').after(sentinel);

const observer = new IntersectionObserver((observed) => {
  if (observed.some(entry => entry.isIntersecting)) loadMore();
}, { rootMargin: '300px' });

function createEntry(data) {
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
  return container;
}

function timeOf({ doc }) {
  const { date } = doc.data();
  return date ? date.toMillis() : Number.MAX_SAFE_INTEGER;
}

function byNewest(a, b) {
  const difference = timeOf(b) - timeOf(a);
  if (difference) return difference;
  if (a.doc.id === b.doc.id) return 0;
  return a.doc.id < b.doc.id ? 1 : -1;
}

function upsert(doc) {
  entries.set(doc.id, { doc, element: createEntry(doc.data()) });
}

function render() {
  const sorted = [...entries.values()].sort(byNewest);
  document.querySelector('#history').replaceChildren(...sorted.map(({ element }) => element));
}

function loadMore() {
  if (!transactions || loading || done || !entries.size) return;
  loading = true;
  const current = session;
  const cursor = [...entries.values()].sort(byNewest).pop().doc;
  transactions.startAfter(cursor).get().then((snap) => {
    if (current !== session) return;
    snap.docs.forEach(upsert);
    render();
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
  const current = session;
  unsubscribers.forEach(unsubscribe => unsubscribe());
  unsubscribers = [];
  observer.unobserve(sentinel);
  transactions = null;
  entries = new Map();
  loading = false;
  done = false;
  document.querySelector('#history').textContent = '';
  if (!user) {
    wallet = {};
    return;
  }
  const ref = firebase.firestore().doc(`wallet/${user.uid}`);
  unsubscribers.push(ref.onSnapshot((snap) => {
    wallet = { ...snap.data() };
    Object.keys(wallet).forEach(key => document.querySelectorAll(`.balance[data-type="${key}"]`)
      .forEach(el => el.innerHTML = wallet[key].toLocaleString()));
  }, console.error));
  // TODO: Cache and limit by timestamp updates
  transactions = ref.collection('transactions')
    .where('status', 'in', ['completed', 'canceled'])
    .orderBy('date', 'desc')
    .limit(PAGE_SIZE);
  let initialized = false;
  unsubscribers.push(transactions.onSnapshot((snap) => {
    if (current !== session) return;
    snap.docChanges().forEach(({ type, doc }) => {
      if (type !== 'removed') upsert(doc);
    });
    render();
    if (initialized) return;
    initialized = true;
    done = snap.size < PAGE_SIZE;
    if (!done) observer.observe(sentinel);
  }, console.error));
}

firebase.auth().onAuthStateChanged(loadWallet);

export default () => ({ ...wallet });
