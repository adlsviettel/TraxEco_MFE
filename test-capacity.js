fetch('http://localhost:8100/api/tcc/capacity/usage?factory=Test&date=2026-07-21')
  .then(r => r.json().then(data => ({status: r.status, data})))
  .then(res => console.log('RESPONSE:', res))
  .catch(err => console.error('ERROR:', err));
