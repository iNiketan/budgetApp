import { SHEET_URL, PASSWORD } from './constants';

export async function fetchExpenses() {
  const res = await fetch(`${SHEET_URL}?password=${PASSWORD}`);
  const json = await res.json();
  if (json.status !== 'success') throw new Error('Fetch failed');
  return (json.data || []).map(row => ({
    date: row['Date'] || '',
    desc: row['Description'] || '',
    cat: (row['Category'] || '').toLowerCase(),
    subcat: row['Subcategory'] || '',
    amount: parseFloat(row['Amount']) || 0,
    who: row['Paid By'] || 'Me',
    month: parseInt(row['Month']) || 0,
    year: parseInt(row['Year']) || 0,
  })).filter(e => e.amount > 0);
}

export async function saveExpense(entry) {
  const res = await fetch(SHEET_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ ...entry, password: PASSWORD }),
  });
  const json = await res.json();
  if (json.status !== 'success') throw new Error('Save failed');
  return true;
}
