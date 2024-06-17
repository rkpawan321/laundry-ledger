import React, { useState, useEffect } from 'react';
import './App.css';
import { db } from './firebase';
import moment from 'moment';

const config = {
  names: ['Pawan', 'Peter', 'Sravan', 'Harshit', 'Ruthwik'],
  defaultUser: 'Pawan',
  dbCollections: {
    dev: {
      balanceSheet: 'balanceSheetTest',
      laundryTransactions: 'laundryTransactionsTest',
      documentId: 'rDLZ8RbIRYedlNjMAQgD',
    },
    prod: {
      balanceSheet: 'balanceSheet',
      laundryTransactions: 'laundryTransactions',
      documentId: 'vF0tW13zirjPaF93Lg0P',
    },
  },
  passcodes: {
    settlePayment: '6969',
    resetDatabase: '9481765927',
  },
};

const getDBCollectionDetails = () => {
  const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
  return isDev ? config.dbCollections.dev : config.dbCollections.prod;
};

const App = () => {
  const [transactions, setTransactions] = useState([]);
  const [balances, setBalances] = useState({});
  const [form, setForm] = useState({
    transactionType: 'debit',
    amount: '',
    personName: config.defaultUser,
    creationDate: '',
  });

  const currentUser = config.defaultUser;

  useEffect(() => {
    const fetchTransactions = () => {
      db.collection(getDBCollectionDetails().laundryTransactions)
        .orderBy('creationDate', 'desc')
        .onSnapshot(snapshot => {
          const transactionsData = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
          }));
          setTransactions(transactionsData);
        });
    };

    const fetchBalances = () => {
      const docRef = db.collection(getDBCollectionDetails().balanceSheet).doc(getDBCollectionDetails().documentId);
      docRef.onSnapshot(doc => {
        if (doc.exists) {
          setBalances(doc.data());
        }
      });
    };

    fetchTransactions();
    fetchBalances();

    return () => {
      db.collection(getDBCollectionDetails().laundryTransactions).onSnapshot(() => {});
      db.collection(getDBCollectionDetails().balanceSheet).doc(getDBCollectionDetails().documentId).onSnapshot(() => {});
    };
  }, []);

  const addTransaction = async e => {
    e.preventDefault();
    const { transactionType, amount, personName } = form;
    const parsedAmount = parseFloat(amount);

    if ((calculateCurrentBalance() < parsedAmount && transactionType === 'debit') || (transactionType === 'credit' && personName !== currentUser)) {
      alert('Invalid action: Please recharge with owner');
      return;
    }

    const isConfirmed = window.confirm(`Are you sure you want to add a ${transactionType} of $${parsedAmount}? This action cannot be undone.`);
    if (!isConfirmed) return;

    try {
      await db.collection(getDBCollectionDetails().laundryTransactions).add({
        transactionType,
        amount: parsedAmount,
        personName,
        creationDate: new Date(),
      });

      const balanceChange = transactionType === 'credit' ? -parsedAmount : parsedAmount;
      const balanceKey = personName.toLowerCase() + 'Owes';
      const newBalances = { ...balances, [balanceKey]: (balances[balanceKey] || 0) + balanceChange };
      if (transactionType === 'debit' && personName !== currentUser) {
        newBalances.pawanGetsBack = (newBalances.pawanGetsBack || 0) + parsedAmount;
      }

      await db.collection(getDBCollectionDetails().balanceSheet).doc(getDBCollectionDetails().documentId).update(newBalances);
      alert('Transaction added and balances updated successfully');
    } catch (error) {
      console.error('Error adding transaction or updating balances:', error);
      alert('Failed to add transaction or update balances');
    }
  };

  const handleInputChange = e => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const settlePayment = async personName => {
    if (currentUser !== 'Pawan') {
      alert('Only Pawan can settle payments.');
      return;
    }

    const passcode = prompt('Enter the 4-digit passcode to settle payment:');
    if (passcode !== config.passcodes.settlePayment) {
      alert('Incorrect passcode. Payment settlement aborted.');
      return;
    }

    const owedAmount = balances[`${personName.toLowerCase()}Owes`];
    try {
      await db.collection(getDBCollectionDetails().balanceSheet).doc(getDBCollectionDetails().documentId).update({
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
    return transactions.reduce((balance, txn) => {
      return txn.transactionType === 'credit' ? balance + parseFloat(txn.amount) : balance - parseFloat(txn.amount);
    }, 0);
  };

  const resetDatabase = async () => {
    const passcode = prompt('Enter the 10-digit passcode to reset database:');
    if (passcode !== config.passcodes.resetDatabase) {
      alert('Incorrect passcode. RESET aborted.');
      return;
    }

    if (!window.confirm('Are you sure you want to reset the database? This action cannot be undone.')) return;

    const collectionsToReset = [getDBCollectionDetails().laundryTransactions, getDBCollectionDetails().balanceSheet];
    try {
      for (const collectionName of collectionsToReset) {
        const snapshot = await db.collection(collectionName).get();
        const batch = db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();

        if (collectionName === getDBCollectionDetails().balanceSheet) {
          await db.collection(collectionName).doc(getDBCollectionDetails().documentId).set({
            pawanGetsBack: 0,
            harshitOwes: 0,
            sravanOwes: 0,
            peterOwes: 0,
            pawanOwes: 0,
            ruthwikOwes: 0,
          });
        }
      }

      alert('Database has been reset.');
    } catch (error) {
      console.error('Error resetting the database: ', error);
      alert('Failed to reset the database.');
    }
  };

  return (
    <div className="app">
      {!process.env.NODE_ENV || process.env.NODE_ENV === 'development' ? <h1 style={{ color: 'red', fontSize: '1rem' }}>IN DEV MODE</h1> : null}
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
          {config.names.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
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

      <div className="current-balance" style={{ color: calculateCurrentBalance() <= 0 ? 'red' : 'blue' }}>
        <h2>Current Balance: ${calculateCurrentBalance().toFixed(2)}</h2>
      </div>

      {balances.pawanGetsBack > 0 && (
        <div className="balance-sheet">
          <h2>Balance Sheet</h2>
          {Object.entries(balances).map(([key, value]) => (
            key.endsWith('Owes') && value > 0 && currentUser === 'Pawan' ? (
              <div key={key} className="balance-entry">
                <p>{`${key.replace('Owes', '')} owes $${value.toFixed(2)} to ${currentUser}`}</p>
                <button onClick={() => settlePayment(key.replace('Owes', ''))} className="settle-btn">Settle</button>
              </div>
            ) : null
          ))}
        </div>
      )}

      <div className="transactions-list">
        <h2>Transactions</h2>
        <ul>
          {transactions.map(({ id, amount, personName, transactionType, creationDate }) => (
            <li key={id}>
              {`${personName} did a ${transactionType} of $${parseFloat(amount).toFixed(2)} on ${moment(creationDate.seconds * 1000).format('h:mm A, MMM D YYYY')}`}
            </li>
          ))}
        </ul>
      </div>

      <button onClick={resetDatabase} className="reset-database-btn">Factory Reset</button>
      <div className='dev-details'>-- Beta version: In development
      -- Built by RK --</div>
    </div>
  );
};

export default App;
