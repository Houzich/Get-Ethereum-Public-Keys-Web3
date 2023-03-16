import logger from './log'
import Interface, { IPublicKeyFromTransaction } from './interface'
import { Data } from "./data"
import { Config } from './config'

export default class DispetcherPubKeys extends Interface {
    constructor() {
        super()
    }

    connectEtherscan = async () => {
        //удаляем если не подключились
        do {
            let asyncFunctions: Promise<number>[] = [];
            this.net.handleEtherscan.forEach(function (header) {
                asyncFunctions.push(header.providerEtherscan.getBlockNumber())
            })

            logger.info(`Общее количество соединений ${this.net.handleEtherscan.length}`);
            let results
            try {
                results = await Promise.all(asyncFunctions);
                break;
            } catch (e) {
                const id = e.url.split('https://api.etherscan.io/api?module=proxy&action=eth_blockNumber&apikey=')
                logger.error('Ошибка подключения к провайдеру Etherscan Key: ' + id[1])
                logger.error('Message: ' + e.message)
                logger.error('Удаляем соединения связанные c ключем ' + id[1])
                let handle
                while ((handle = this.net.handleEtherscan.find(element => element.providerEtherscan.apiKey == id[1])) !== undefined) {
                    const index = this.net.handleEtherscan.indexOf(handle)
                    this.net.handleEtherscan.splice(index, 1)
                }
                this.sleep(100)
            }
        }
        while (true)
    }
    connectInfura = async () => {
        //удаляем если не подключились
        do {
            let asyncFunctions: Promise<number>[] = [];
            this.net.handleInfura.forEach(function (handle) {
                asyncFunctions.push(handle.providerInfura.getBlockNumber())
            })

            logger.info(`Общее количество соединений ${this.net.handleInfura.length}`);
            try {
                const results = await Promise.all(asyncFunctions);
                break;
            } catch (e) {
                const id = e.url.split('https://mainnet.infura.io/v3/')
                logger.error('Ошибка подключения к провайдеру Infura ID: ' + id[1])
                logger.error('Message: ' + e.message)
                logger.error('Удаляем соединения связанные c ID ' + id[1])
                let handle
                while ((handle = this.net.handleInfura.find(element => element.providerInfura.apiKey == id[1])) !== undefined) {
                    const index = this.net.handleInfura.indexOf(handle)
                    this.net.handleInfura.splice(index, 1)
                }
                this.sleep(100)
            }
        }
        while (true)
    }

    snifferPubKeys = async (tables: Data) => {
        let time_start, time
        //for (var i = 0; i < 10; i++) {
        const numNumRequestProvider = 1
        const numNumEtherscanProviders = this.net.getNumEtherscanProvider()
        const numNumRequest = numNumRequestProvider * numNumEtherscanProviders
        let asyncFunction = [];
        time_start = new Date().getTime()
        for (var i = 0; i < tables.accounts.getLength(); i++) {
            let address: string = tables.accounts.getAddress(i)
            // let resp = await this.getPublicKeyFromAddress(address)
            // const balance = await this.getBalanceFromAddress(address)
            asyncFunction.push(this.getPublicKeyFromAddress(address, this.count_etherscan, this.count_infura))
            asyncFunction.push(this.getBalanceFromAddress(address, this.count_infura))
            if (++this.count_etherscan == this.net.getNumEtherscanProvider()) this.count_etherscan = 0
            if (++this.count_infura == this.net.getNumInfuraProvider()) this.count_infura = 0

            if (((i + 1) % numNumRequest == 0) || (i == tables.accounts.getLength() - 1)) {

                const Result: IPublicKeyFromTransaction[] = await Promise.all(asyncFunction);
                let pubKeys: IPublicKeyFromTransaction[] = [];
                let balances: IPublicKeyFromTransaction[] = [];
                for (let x = 0; x < Result.length / 2; x++) {
                    pubKeys.push(Result[x * 2])
                    balances.push(Result[x * 2 + 1])
                }
                asyncFunction = [];
                for (let x = 0; x < pubKeys.length; x++) {
                    if (pubKeys[x].pubkey === undefined) {
                        tables.walletErr.push([pubKeys[x].address, "undefined", balances[x].balance, pubKeys[x].message])
                    }
                    else if (pubKeys[x].pubkey === 'none') {
                        tables.noOutTrans.push([pubKeys[x].address, "none", balances[x].balance, pubKeys[x].message])
                    }
                    else {
                        let pubKey = pubKeys[x].pubkey.slice(4); //remove '0x04'
                        tables.finded.push([pubKeys[x].address, pubKey, balances[x].balance])
                    }
                }

            }

            if (((i + 1) % numNumRequest === 0) || (i == tables.accounts.getLength() - 1)) {
                time = new Date().getTime() - time_start
                time_start = new Date().getTime()
                logger.info(`Всего обработано ${i + 1} аккаунтов и ` + new Intl.NumberFormat("en-US", { style: "decimal", }).format(this.countHandledTransactions) + ` транзакций. Время запроса: ${time / 1000}`)
                if ((i + 1) == numNumRequest) {
                    tables.save(true)
                }
                else {
                    tables.save(false)
                }
            }

        }


        logger.warn('\n')
        logger.info('******************* ОБРАБОТАЛИ ВСЕ АДРЕСА УСПЕШНО!! ********************');
        logger.info('******************* ОБРАБОТАЛИ ВСЕ АДРЕСА УСПЕШНО!! ********************');
        logger.info('******************* ОБРАБОТАЛИ ВСЕ АДРЕСА УСПЕШНО!! ********************');

        time = new Date().toLocaleTimeString()
        logger.info('End Time: ' + time)

        while (1) {
            await this.sleep(100)
        }

    };


    init = async () => {
        const config = new Config()
        await config.load()
        return {
            config
        }
    }

    run = async () => {

        const { config } = await this.init()
        const accounts = new Data(config.properties.path_addresses)

        await accounts.load()
        logger.info(`Аккаунты успешно загружены.`)


        logger.info('******************* ПОДКЛЮЧАЕМСЯ К INFURA (МОЖЕТ ЗАНЯТЬ НЕСКОЛЬКО МИНУТ) *******************');
        logger.warn('.....');
        await this.connectInfura()
        logger.info('******************* ПОДКЛЮЧАЕМСЯ К ETHERSCAN (МОЖЕТ ЗАНЯТЬ НЕСКОЛЬКО МИНУТ) ****************');
        logger.warn('.....');
        await this.connectEtherscan()
        logger.info('******************* ПОДКЛЮЧИЛИСЬ УСПЕШНО! ********************\n');



        const time = new Date().toLocaleTimeString()
        logger.info('Start Time: ' + time)
        logger.warn('.....');
        this.snifferPubKeys(accounts)
    }
}
