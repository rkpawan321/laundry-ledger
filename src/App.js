import React, { useState, useEffect } from 'react';
import './App.css';
import { db } from './firebase';
import moment from 'moment';

function App() {
  const [transactions, setTransactions] = useState([]);
  const [balances, setBalances] = useState({});
  const [form, setForm] = useState({
    transactionType: 'debit', // 'credit' or 'debit'
    amount: '',
    personName: 'Pawan', // Default to 'Pawan'
    creationDate: '',
  });
  
  const currentUser = 'Pawan'; // Placeholder for actual authentication logic

  console.log('RK transactions', transactions)

  useEffect(() => {
    // Fetch transactions from Firestore on component mount
    const unsubscribeTransactions = db.collection('laundryTransactions')
      .onSnapshot(snapshot => {
        const transactionsData = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
        }));
        console.log('PAL', transactionsData)
        setTransactions(transactionsData);
      });

    // Fetch and set balances from Firestore `balanceSheet` document
    const docRef = db.collection('balanceSheet').doc('vF0tW13zirjPaF93Lg0P');
    const unsubscribeBalanceSheet = docRef.onSnapshot(doc => {
      console.log('PAWAN doc', doc.data())
      if (doc.exists) {
        setBalances(doc.data());
      }
    });

    return () => {
      unsubscribeTransactions();
      unsubscribeBalanceSheet();
    };
  }, []);

  // const addTransaction = async (e) => {
  //   e.preventDefault();
  //   const { transactionType, amount, personName } = form;

  //   if (transactionType === 'credit' && personName !== 'Pawan') {
  //     alert("Only Pawan can perform credit transactions.");
  //     return;
  //   }

  //   if (transactionType === 'debit') {
  //     console.log(JSON.stringify(transactions, 2))
  //     // const currentBalance = Object.values(transactions).reduce((acc, value) => acc + value, 0); 
  //     const currentBalance = transactions[0].amount;
  //     console.log('PAWAN', {currentBalance, amount, balances })
  //     if (parseFloat(amount) > currentBalance) {
  //       alert("Debit amount exceeds current balance.");
  //       return;
  //     }
  //   }

  //   try {
  //     await db.collection('laundryTransactions').add({
  //       transactionType,
  //       amount: parseFloat(amount),
  //       personName,
  //       creationDate: new Date(),
  //     });
  //     alert('Transaction added successfully');
  //   } catch (error) {
  //     console.error('Error adding transaction:', error);
  //     alert('Failed to add transaction');
  //   }
  // };

  const addTransaction = async (e) => {
    e.preventDefault();
    const { transactionType, amount, personName } = form;
    const parsedAmount = parseFloat(amount);
  
    // Existing checks...
    if ((calculateCurrentBalance() < amount && transactionType === 'debit') || (transactionType === 'credit' && personName !== 'Pawan')) {
      // throw new Error('Invalid user for credit transaction!');
      alert('Invalid action: Please recharge with owner');
      return;
    }
  
    try {
      await db.collection('laundryTransactions').add({
        transactionType,
        amount: parsedAmount,
        personName,
        creationDate: new Date(),
      });
      
      // Update balances based on the transaction
      const balanceChange = transactionType === 'credit' ? -parsedAmount : parsedAmount;
      const balanceKey = personName.toLowerCase() + 'Owes';
      const newBalances = { ...balances, [balanceKey]: (balances[balanceKey] || 0) + balanceChange };
      if (transactionType === 'debit' && personName !== 'Pawan') {
        newBalances.pawanGetsBack = (newBalances.pawanGetsBack || 0) + parsedAmount;
      }
  
      await db.collection('balanceSheet').doc('vF0tW13zirjPaF93Lg0P').update(newBalances);
      alert('Transaction added and balances updated successfully');
    } catch (error) {
      console.error('Error adding transaction or updating balances:', error);
      alert('Failed to add transaction or update balances');
    }
  };
  

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  // const settlePayment = async (personName) => {
  //   if (currentUser !== 'Pawan') {
  //     alert("Only Pawan can settle payments.");
  //     return;
  //   }

  //   try {
  //     await db.collection('balanceSheet').doc('yourDocumentId').update({
  //       [`${personName.toLowerCase()}Owes`]: 0,
  //       // Update other necessary fields or logic as per your requirement
  //     });
  //     alert(`${personName}'s payment has been settled.`);
  //   } catch (error) {
  //     console.error('Error settling payment:', error);
  //     alert('Failed to settle payment.');
  //   }
  // };

  const settlePayment = async (personName) => {
    if (currentUser !== 'Pawan') {
      alert("Only Pawan can settle payments.");
      return;
    }
  
    const owedAmount = balances[`${personName.toLowerCase()}Owes`];
    try {
      await db.collection('balanceSheet').doc('vF0tW13zirjPaF93Lg0P').update({
        [`${personName.toLowerCase()}Owes`]: 0,
        pawanGetsBack: (balances.pawanGetsBack || 0) - owedAmount,
      });
      alert(`${personName}'s payment has been settled.`);
    } catch (error) {
      console.error('Error settling payment:', error);
      alert('Failed to settle payment.');
    }
  };


  const calculateCurrentBalance = () => {
    let balance = 0;
    transactions.forEach(txn => {
      if (txn.transactionType === 'credit') {
        balance += parseFloat(txn.amount);
      } else if (txn.transactionType === 'debit') {
        balance -= parseFloat(txn.amount);
      }
    });
    return balance;
  };
  
  console.log('PAWWW', balances)

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

      {calculateCurrentBalance() >= 0 && <div className="current-balance" style={{color: calculateCurrentBalance() <= 0 ? "red" : "blue"}}>
  <h2>Current Balance: ${calculateCurrentBalance().toFixed(2)}</h2>
</div>}


{balances.pawanGetsBack > 0 && <div className="balance-sheet">
        <h2>Balance Sheet</h2>
        {Object.entries(balances).map(([key, value]) => (
          key.endsWith('Owes') && value > 0 && currentUser === 'Pawan' ? (
            <div key={key} className="balance-entry">
              <p>{`${key.replace('Owes', '')} owes $${value.toFixed(2)} to Pawan`}</p>
              <button onClick={() => settlePayment(key.replace('Owes', ''))} className="settle-btn">Settle</button>
            </div>
          ) : null
        ))}
      </div>}

      <div className="transactions-list">
        <h2>Transactions</h2>
        <ul>
          {transactions.map(({ id, amount, personName, transactionType, creationDate }) => (
            <li key={id}>
              {`${personName} did a ${transactionType} of $${parseFloat(amount).toFixed(2)} on ${moment.unix(creationDate.seconds).format('h:mm A, MMM D YYYY')}`}
            </li>
          ))}
        </ul>
      </div>

    </div>
  );
}

export default App;
