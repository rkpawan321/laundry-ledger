import React, { useState, useEffect } from 'react';
import './App.css';
import { db } from './firebase';

function App() {
  const [transactions, setTransactions] = useState([]);
  const [balances, setBalances] = useState({});
  const [form, setForm] = useState({
    transactionType: 'credit', // 'credit' or 'debit'
    amount: '',
    personName: 'Pawan', // Default to 'Pawan'
  });
  
  const currentUser = 'Pawan'; // Placeholder for actual authentication logic

  useEffect(() => {
    // Fetch transactions from Firestore on component mount
    const unsubscribeTransactions = db.collection('laundryTransactions')
      .onSnapshot(snapshot => {
        const transactionsData = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
        }));
        setTransactions(transactionsData);
      });

    // Fetch and set balances from Firestore `balanceSheet` document
    const docRef = db.collection('balanceSheet').doc('vF0tW13zirjPaF93Lg0P');
    const unsubscribeBalanceSheet = docRef.onSnapshot(doc => {
      if (doc.exists) {
        setBalances(doc.data());
      }
    });

    return () => {
      unsubscribeTransactions();
      unsubscribeBalanceSheet();
    };
  }, []);

  const addTransaction = async (e) => {
    e.preventDefault();
    const { transactionType, amount, personName } = form;

    if (transactionType === 'credit' && personName !== 'Pawan') {
      alert("Only Pawan can perform credit transactions.");
      return;
    }

    if (transactionType === 'debit') {
      console.log(JSON.stringify(transactions, 2))
      // const currentBalance = Object.values(transactions).reduce((acc, value) => acc + value, 0); 
      const currentBalance = transactions[0].amount;
      console.log('PAWAN', {currentBalance, amount, balances })
      if (parseFloat(amount) > currentBalance) {
        alert("Debit amount exceeds current balance.");
        return;
      }
    }

    try {
      await db.collection('laundryTransactions').add({
        transactionType,
        amount: parseFloat(amount),
        personName,
        creationDate: new Date(),
      });
      alert('Transaction added successfully');
    } catch (error) {
      console.error('Error adding transaction:', error);
      alert('Failed to add transaction');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const settlePayment = async (personName) => {
    if (currentUser !== 'Pawan') {
      alert("Only Pawan can settle payments.");
      return;
    }

    try {
      await db.collection('balanceSheet').doc('yourDocumentId').update({
        [`${personName.toLowerCase()}Owes`]: 0,
        // Update other necessary fields or logic as per your requirement
      });
      alert(`${personName}'s payment has been settled.`);
    } catch (error) {
      console.error('Error settling payment:', error);
      alert('Failed to settle payment.');
    }
  };

  return (
    <div className="app">
      <h1>Laundry Expense Tracker</h1>
      <form onSubmit={addTransaction} className="transaction-form">
        <input
          className="input-field"
          name="amount"
          type="number"
          placeholder="Amount"
          value={form.amount}
          onChange={handleInputChange}
          required
        />
        <select
          className="input-field"
          name="personName"
          value={form.personName}
          onChange={handleInputChange}
          required
        >
          <option value="Pawan">Pawan</option>
          <option value="Peter">Peter</option>
          <option value="Sravan">Sravan</option>
          <option value="Harshit">Harshit</option>
        </select>
        <select
          className="input-field"
          name="transactionType"
          value={form.transactionType}
          onChange={handleInputChange}
          required
        >
          <option value="credit">Credit</option>
          <option value="debit">Debit</option>
        </select>
        <button type="submit" className="submit-btn">Add Transaction</button>
      </form>
      <div className="transactions-list">
        <h2>Transactions</h2>
        <ul>
          {transactions.map(({ id, amount, personName, transactionType }) => (
            <li key={id}>
              {`${personName} did a ${transactionType} of $${parseFloat(amount).toFixed(2)}`}
            </li>
          ))}
        </ul>
      </div>
      <div className="balance-sheet">
        <h2>Balance Sheet</h2>
        {Object.entries(balances).map(([key, value]) => (
          key.endsWith('Owes') && value > 0 && currentUser === 'Pawan' ? (
            <div key={key}>
              <p>{`${key.replace('Owes', '')} owes $${value.toFixed(2)} to Pawan`}</p>
              <button onClick={() => settlePayment(key.replace('Owes', ''))}>Settle Payment</button>
            </div>
          ) : null
        ))}
      </div>
    </div>
  );
}

export default App;
