let wallet = {};

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

function loadWallet(user) {
  if (!user) {
    wallet = {};
    document.querySelector('#history').textContent = '';
    return;
  }
  const ref = firebase.firestore().doc(`wallet/${user.uid}`);
  ref.get().then((snap) => {
    const data = snap.data();
    wallet = { ...data };
    Object.keys(data).forEach(key => document.querySelectorAll(`.balance[data-type="${key}"]`)
      .forEach(el => el.innerHTML = data[key].toLocaleString()));
  });
  ref.collection('transactions')
    .where('status', 'in', ['completed', 'canceled'])
    .orderBy('date', 'desc')
    .limit(30)
    .get().then(snap => snap.docs.forEach(doc => addEntry(doc.data())));
}

firebase.auth().onAuthStateChanged(loadWallet);

export default () => ({ ...wallet });
