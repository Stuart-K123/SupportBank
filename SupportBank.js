// SupportBank main code
const log4js = require('log4js')

log4js.configure({
    appenders: {
        file: { type: 'fileSync', filename: 'logs/debug.log' }
    },
    categories: {
        default: { appenders: ['file'], level: 'debug'}
    }
});

const logger = log4js.getLogger('SupportBank.js')

const csv = require('csv-parser')
const fs = require('fs')
const readlineSync = require('readline-sync')
const moment = require('moment')

const file_name = "DodgyTransactions2015.csv"

class transaction {
    constructor(date, from, to, narrative, amount) {
        let _date = moment(date, "DD MM YYYY")
        if (! _date.isValid()) {
            logger.warn("Transaction has invalid date; it was recorded anyway. Date given: " + date)
        }
        this.date = _date
        this.from = from
        this.to = to
        this.narrative = narrative
        let _amount = +amount
        if (isNaN(_amount)) {
            logger.error("Amount field in transaction is not a number so cannot be interpreted as transaction"
                + "Transaction is logged but value is £0.00. Amount given: " + amount)
            this.amount = 0.0
        }
        else {
            this.amount = _amount
        }
    }

    static from_object(object) {
        let date = object.Date
        let from = object.From
        let to = object.To
        let narrative = object.Narrative
        let amount = object.Amount

        return new transaction(date, from, to, narrative, amount)
    }
}

function transactions_from_csv() {
    return new Promise(function (resolve, reject) {
        let transactions = []
        fs.createReadStream(file_name)
            .pipe(csv())
            .on('data', (data) => {transactions.push(transaction.from_object(data))})
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

    update_balance(value, receiver) {
        let _num_value = 0
        if (receiver) {_num_value = +value}
        else {_num_value = -value}
        if (_num_value == NaN) {
            logger.error(`Transaction value ${value} is not a number. This error should not appear`)
        }
        this.balance += _num_value
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

    static from_transaction(transaction, receiver) {
        let amount = 0.0
        let person = ""
        let date = transaction.date
        let narrative = transaction.narrative
        if (receiver) {
            amount = transaction.amount
            person = transaction.from
        }
        else {
            amount = -transaction.amount
            person = transaction.to
        }
        return new transaction_log_entry(amount, person, date, narrative)
    }

    print() {
        console.log(`Date: ${this.date}, Person: ${this.person}, Amount: £${this.amount}, Purpose: ${this.narrative}`)
    }
}

function get_all_accounts(transactions) {
    let accounts = new Map()
    transactions.forEach((transaction) =>  {
        accounts = process_single_transaction(transaction, accounts)
    })
    return accounts
}

function process_single_transaction(trans, accounts) {
    // Check accounts exist, make them if required
    if (! accounts.has(trans.from)) {
        accounts.set(trans.from, new personal_account(trans.from))
    }
    if (! accounts.has(trans.to)) {
        accounts.set(trans.to, new personal_account(trans.to))
    }

    // Update balances
    accounts.get(trans.from).update_balance(trans.amount, false)
    accounts.get(trans.to).update_balance(trans.amount, true)

    // Log transactions
    accounts.get(trans.from).transaction_log.push(transaction_log_entry.from_transaction(trans, false))
    accounts.get(trans.to).transaction_log.push(transaction_log_entry.from_transaction(trans, true))
    return accounts
}

// List account
function get_account(transactions, name) {
    let account = new personal_account(name)
    transactions.forEach((t) => {
        if (t.from == name) {
            account.update_balance(t.amount, false)
            account.transaction_log.push(transaction_log_entry.from_transaction(t, false))
        }
        else if (t.to == name) {
            account.update_balance(t.amount, true)
            account.transaction_log.push(transaction_log_entry.from_transaction(t, true))
        }
    })
    return account
}

// Top level functions
function list_all() {
    transactions_from_csv().then((transactions) => {
        // console.log(transactions)
        let accounts = get_all_accounts(transactions)
        accounts.forEach((account) => {account.print_balance()})
    })
}

function list_account(name) {
    transactions_from_csv().then((transactions) => {
        // console.log(transactions)
        let account = get_account(transactions, name)
        account.print_log()
    })
}

function main() {
    logger.trace("Beginning SupportBank, please keep your arms inside the cart at all times.")
    console.log("Hi! how would you like to inspect the transactions?")
    let user_input = readlineSync.question("\"List All\", \"List [Name]\", or \"exit\": ")
    if (user_input == "List All") {
        list_all()
    }
    else if (user_input.slice(0,5) == "List ") {
        list_account(user_input.slice(5))
    }
    else if (user_input == "exit") {
        return
    }
    logger.trace("Ending SupportBank, we hope you enjoyed your stay.")
}

main()