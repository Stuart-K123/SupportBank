// SupportBank main code

const csv = require('csv-parser')
const fs = require('fs')
const readlineSync = require('readline-sync')

let transactions = []

function read_csv() {
    return new Promise(function (resolve, reject) {
        fs.createReadStream('Transactions2014.csv')
            .pipe(csv())
            .on('data', (data) => transactions.push(data))
            .on('end', () => {
                resolve(transactions)
            })
    })
}

class personal_account {
    constructor(name) {
        this.name = name
        this.balance = 0.0
        this.transaction_log = []
    }

    print_balance() {
        let balance = (Math.round(this.balance * 100) / 100).toFixed(2)
        console.log(this.name + ": £" + balance)
        // console.log(this.balance)
    }

    print_log() {
        let balance = (Math.round(this.balance * 100) / 100).toFixed(2)
        console.log(`${this.name}, total balance: £${balance}`)
        console.log("Transactions:")
        for (let entry of this.transaction_log) {
            entry.print()
        }
    }
}

class transaction_log_entry {
    constructor(amount, person, date, narrative) {
        this.amount = amount
        this.person = person
        this.date = date
        this.narrative = narrative
    }

    print() {
        console.log(`Date: ${this.date}, Person: ${this.person}, Amount: £${this.amount}, Purpose: ${this.narrative}`)
    }
}

function get_all_accounts(transactions) {
    let accounts = new Map()
    // console.log(transactions.length)
    for (let i=0; i<transactions.length; i++) {
        accounts = process_single_transaction(transactions[i], accounts)
    }
    return accounts
}

function process_single_transaction(transaction, accounts) {
    // Check accounts exits, make them if required
    if (! accounts.has(transaction.From)) {
        accounts.set(transaction.From, new personal_account(transaction.From))
    }
    if (! accounts.has(transaction.To)) {
        accounts.set(transaction.To, new personal_account(transaction.To))
    }

    // Update balances
    accounts.get(transaction.From).balance -= parseFloat(transaction.Amount)
    accounts.get(transaction.To).balance += parseFloat(transaction.Amount)

    // Log transactions
    accounts.get(transaction.From).transaction_log.push(new transaction_log_entry(-transaction.Amount,
        transaction.To,
        transaction.Date,
        transaction.Narrative))
    accounts.get(transaction.To).transaction_log.push(new transaction_log_entry(transaction.Amount,
        transaction.From,
        transaction.Date,
        transaction.Narrative))
    return accounts
}


// List all functionality
function list_all(transactions) {
    accounts = get_all_accounts(transactions)
    accounts.forEach((account) => {account.print_balance()})
}

function list_all_wrap() {
    read_csv().then((transactions) => list_all(transactions))
}

// list_all_wrap()

// List account
function get_account(transactions, name) {
    let account = new personal_account(name)
    for (let t of transactions) {
        if (t.From == name) {
            account.balance -= +(t.Amount)
            account.transaction_log.push(new transaction_log_entry(-t.Amount,
                t.To,
                t.Date,
                t.Narrative))
        }
        else if (t.To == name) {
            account.balance += parseFloat(t.Amount)
            account.transaction_log.push(new transaction_log_entry(+t.Amount,
                t.From,
                t.Date,
                t.Narrative))
        }
    }
    return account
}

function list_account(transactions, name) {
    let account = get_account(transactions, name)
    account.print_log()
}

function list_account_wrap(name) {
    read_csv().then((transactions => list_account(transactions, name)))
}

// list_account_wrap("Tim L")

function main(){
    console.log("Hi! how would you like to inspect the transactions?")
    let user_input = readlineSync.question("\"List All\", \"List [Name]\", or \"exit\": ")
    if (user_input == "List All") {
        list_all_wrap()
    }
    else if (user_input.slice(0,5) == "List ") {
        list_account_wrap(user_input.slice(5))
    }
    else if (user_input == "exit") {
        return
    }
}

main()
