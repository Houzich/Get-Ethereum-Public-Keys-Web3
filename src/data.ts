import { createInterface, Interface } from "readline"
import * as fs from "fs"
import logger from './log'
import { Table } from './table'


export class Data {
  private readInterface!: Interface
  private readStream!: fs.ReadStream
  accounts = new Table()
  finded = new Table()
  noOutTrans = new Table()
  walletErr = new Table()

  constructor(filepath: string) {
    this.readStream = fs.createReadStream(filepath)
    this.readInterface = createInterface({
      input: this.readStream,
      escapeCodeTimeout: 9999999999999999,
    })
  }

  _save(clear: boolean, table: Table, path: string) {
    let handled = 0
    try {
      if (clear) {
        fs.unlinkSync(path)
      }
    } catch (e) { }
    const writeStream = fs.createWriteStream(path, {flags:'a'})
    for (let i = 0; i < table.getLength(); i++) {
      handled++
      // if (handled % 10000 === 0) {
      //   logger.info(`Save ${handled} rows in pubKey.csv`)
      // }
      writeStream.write(table.getAsLine(i))
    }
    writeStream.end()
    return handled;
  }


  save(clear: boolean) {
    let handledFinded = this._save(clear, this.finded, "./Tables/finded.csv")
    let handledNoOutTrans = this._save(clear, this.noOutTrans, "./Tables/no_out_trans.csv")
    let handledWalletErr = this._save(clear, this.walletErr, "./Tables/wallet_err.csv")

    if (clear) {
      logger.info('Отчистили файлы finded.csv, no_out_trans.csv, wallet_err.csv')
    }
    logger.info(`Сохранили ${handledFinded} строк в finded.csv и ${handledNoOutTrans} строк в no_out_trans.csv и ${handledWalletErr} строк в wallet_err.csv`)
    this.finded = new Table()
    this.noOutTrans = new Table()
    this.walletErr = new Table()
  }

  load() {
    return new Promise((resolve, reject) => {
      let handled = 0
      this.readInterface.on("line", (address: string) => {
        try {
          if (address.length != 40) throw "Неверный адрес"
          this.accounts.push([address, undefined, undefined])
          handled++
          if (handled % 1_000_000 === 0) {
            logger.info(`Handled ${handled} rows`)
          }
        } catch (e) {
          logger.error(e)
          logger.error(address)
          reject(`Ошибка загрузки аккаунтов. Неверный формат строки.`)
        }
      })
      this.readInterface.on("close", () => {
        logger.info(`Done!`)
        resolve(true)
      })
    })
  }
}
