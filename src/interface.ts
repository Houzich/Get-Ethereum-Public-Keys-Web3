import * as Hdr from './provider_handle'
import Utils from './utils'
import logger from './log'
import { INFURA_KEY_LIST, ETHERSCAN_KEY_LIST } from './store/keys'
import { ethers } from 'ethers'
import { TransactionResponse } from '@ethersproject/abstract-provider';


export interface IPublicKeyFromTransaction {
    pubkey?: string;
    error?: string;
    message?: string;
    balance?: string;
    address?: string;
}
export interface IError {
    error?: boolean;
    message?: string;
}


export default class Interface extends Utils {
    net: Hdr.Network
    count_etherscan: number = 0
    count_infura: number = 0
    countHandledTransactions: number = 0
    constructor() {
        super()
        this.net = new Hdr.Network()
        for (var x = 0; x < 4; x++) {
            for (var i = 0; i < ETHERSCAN_KEY_LIST.length; i++) {
                this.net.addEtherscanHandle(ETHERSCAN_KEY_LIST[i], `etherscan_${x * ETHERSCAN_KEY_LIST.length + i}`)
            }
            for (var i = 0; i < INFURA_KEY_LIST.length; i++) {
                this.net.addInfuraHandle(INFURA_KEY_LIST[i], `infura_${x * INFURA_KEY_LIST.length + i}`)
            }
        }


    }

    sleep(ms: number) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }

    _getTransactionHash = async (transactionHash: string, handleInfura: Hdr.ProviderHandle) => {
        const provider = handleInfura.providerInfura
        let tx
        try {
            tx = await provider.getTransaction(transactionHash)
        } catch (e) {
            await this.checkError(handleInfura, 'getTransaction(' + transactionHash + ')', e)
            tx = undefined
        }
        return tx;
    };

    getTransactionHash = async (transactionHash: string, handleInfura: Hdr.ProviderHandle) => {
        let tx
        do {
            tx = await this._getTransactionHash(transactionHash, handleInfura)
        }
        while (handleInfura.upgateIfError() || tx === undefined)
        return tx;
    };


    getPublicKeyFromTransactionHash = async (transactionHash, handleInfura: Hdr.ProviderHandle) => {
        const tx = await this.getTransactionHash(transactionHash, handleInfura)

        const expandedSig = {
            r: tx.r,
            s: tx.s,
            v: tx.v
        }

        const signature = ethers.utils.joinSignature(expandedSig);
        let transactionHashData;
        switch (tx.type) {
            case 0:
                transactionHashData = {
                    gasPrice: tx.gasPrice,
                    gasLimit: tx.gasLimit,
                    value: tx.value,
                    nonce: tx.nonce,
                    data: tx.data,
                    chainId: tx.chainId,
                    to: tx.to
                };
                break;
            case 1:
                transactionHashData = tx
                break;
            case 2:
                transactionHashData = {
                    gasLimit: tx.gasLimit,
                    value: tx.value,
                    nonce: tx.nonce,
                    data: tx.data,
                    chainId: tx.chainId,
                    to: tx.to,
                    type: 2,
                    maxFeePerGas: tx.maxFeePerGas,
                    maxPriorityFeePerGas: tx.maxPriorityFeePerGas
                }
                break;
            default: {
                logger.error('Unsupported tx type, tx: ', tx);
                throw 'Unsupported tx type';
            }
        }
        const rstransactionHash = await ethers.utils.resolveProperties(transactionHashData)
        const raw = ethers.utils.serializeTransaction(rstransactionHash) // returns RLP encoded transactionHash
        const msgHash = ethers.utils.keccak256(raw) // as specified by ECDSA
        const msgBytes = ethers.utils.arrayify(msgHash) // create binary hash
        const recoveredPubKey = ethers.utils.recoverPublicKey(msgBytes, signature)
        return recoveredPubKey
    }


    checkError = async (handle: Hdr.ProviderHandle, banner: string, e: any): Promise<IError> => {

        if ((e.message != undefined) && (e.message.search("CONNECTION ERROR: Couldn't connect to node") != -1) /* || (e.message.search('connection not open on send()')) != -1 */) {
            logger.error('ERROR FROM ' + banner + ': ' + e);
            logger.error('TRY RECCONECT')
            handle.initProvider()
            await this.sleep(2000)
            return { error: true, message: '' };
        }
        else if ((e.message != undefined) && (e.message.search('invalid hash') != -1)) {
            logger.warn('WRONG RESPONSE ' + banner + ': ' + 'invalid hash: ' + e.value + ', ID KEY: ' + handle.key);
            return { error: false, message: 'invalid hash: ' + e.value };
        }
        else if ((e.message != undefined) && (e.message.search('missing response') != -1)) {
            //logger.warn('WRONG RESPONSE ' + banner + ': ' + 'missing response' + ', ID KEY: ' + handle.key);
            return { error: true, message: 'missing response' };
        }
        else if ((e.message != undefined) && (e.message.search('failed response') != -1)) {
            logger.warn('WRONG RESPONSE ' + banner + ': ' + 'failed response' + ', ID KEY: ' + handle.key);
            return { error: true, message: 'failed response' };
        }
        else if ((e.message != undefined) && (e.message.search('timeout') != -1)) {
            logger.warn('WRONG RESPONSE ' + banner + ': ' + 'timeout' + ', ID KEY: ' + handle.key);
            return { error: true, message: 'timeout' };
        }
        else if ((e.message != undefined) && (e.message.search('daily request count exceeded') != -1)) {
            logger.warn('WRONG RESPONSE' + banner + ': ' + 'daily request count exceeded' + ', ID KEY: ' + handle.key);
            handle.pushErrState()
            return { error: true, message: 'daily request count exceeded' };
        }
        else if ((e.message != undefined) && (e.message.search('bad response') != -1)) {
            logger.warn('WRONG RESPONSE ' + banner + ': ' + 'bad response' + ', ID KEY: ' + handle.key);
            return { error: true, message: 'bad response' };
        }
        else if ((e.message != undefined) && (e.message.search('processing response error') != -1)) {
            logger.warn('WRONG RESPONSE ' + banner + ': ' + 'processing response error' + ', ID KEY: ' + handle.key);
            return { error: true, message: 'processing response error' };
        }
        else {
            logger.error('ERROR FROM ' + banner + ': ' + e);
            //header_provider.pushErrState()
            return { error: true, message: e.toString() };
        }
    }

    _getBalanceFromAddress = async (address: string, header_provider: Hdr.ProviderHandle) => {
        const header = header_provider
        const provider = header.providerInfura
        let balance: string
        try {
            const balanceBigNumber: ethers.BigNumber = await provider.getBalance(address)
            balance = ethers.utils.formatEther(balanceBigNumber.mul(1297)) //in $
            balance = balance.split('.')[0] + '$'
        } catch (e) {
            await this.checkError(header, 'getBalanceFromAddress(' + address + ')', e)
            balance = undefined
        }
        return balance;
    };

    getBalanceFromAddress = async (address: string, numInfura) => {
        const handleInfura = this.net.handleInfura[numInfura]
        let Resp: IPublicKeyFromTransaction = { balance: undefined }
        do {
            Resp.balance = await this._getBalanceFromAddress(address, handleInfura)
        }
        while (handleInfura.upgateIfError() || Resp.balance === undefined)
        return Resp;
    };


    _getPublicKeyFromAddress = async (address: string, handleEtherscan: Hdr.ProviderHandle, handleInfura: Hdr.ProviderHandle): Promise<IPublicKeyFromTransaction> => {
        const provider = handleEtherscan.providerEtherscan
        const name_provider = handleEtherscan.name
        let Resp: IPublicKeyFromTransaction = { pubkey: undefined, error: undefined, message: undefined }
        let transaction
        try {
            const history: Array<TransactionResponse> = await provider.getHistory(address)
            if (history === undefined) {
                logger.error('ERROR FROM getPublicKeyFromAddress(' + address + ',' + name_provider + '): ' + 'history === undefined')
                return { pubkey: 'none', message: 'no history' };
            }
            this.countHandledTransactions += history.length;
            transaction = history.find(element => element.from == address)
            if (transaction === undefined) {
                return { pubkey: 'none', message: 'no out transactions' };
            }
        } catch (e) {
            const resp: IError = await this.checkError(handleEtherscan, 'getHistory(' + address + ',' + name_provider + ')', e)
            if (!resp.error) {
                return { pubkey: undefined, message: resp.message };
            }
            if (e.message != undefined) {
                Resp.error = 'e.message: ' + e.message
            }
            else {
                Resp.error = 'e: ' + e
            }
            return Resp;
        }

        try {
            Resp.pubkey = await this.getPublicKeyFromTransactionHash(transaction.hash, handleInfura)
        } catch (e) {
            const resp: IError = await this.checkError(handleInfura, 'getPublicKeyFromTransactionHash(' + transaction.hash + ',' + handleInfura.name + ')', e)
            if (!resp.error) {
                return { pubkey: undefined, message: resp.message };
            }

            if (e.message != undefined) {
                Resp.error = 'e.message: ' + e.message
            }
            else {
                Resp.error = 'e: ' + e
            }
            return Resp;
        }
        return Resp;
    };


    getPublicKeyFromAddress = async (address, numEtherscan, numInfura): Promise<IPublicKeyFromTransaction> => {
        let Resp: IPublicKeyFromTransaction
        const handleEtherscan = this.net.handleEtherscan[numEtherscan]
        const handleInfura = this.net.handleInfura[numInfura]
        do {
            Resp = await this._getPublicKeyFromAddress(address, handleEtherscan, handleInfura)
        }
        while (handleInfura.upgateIfError() || handleEtherscan.upgateIfError() || Resp.error !== undefined)
        Resp.address = address
        return Resp
    }


}