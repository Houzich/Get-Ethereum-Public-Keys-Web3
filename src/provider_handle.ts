import { ethers, providers, Wallet } from "ethers";
import BN from 'bn.js'
import logger from './log'


export const STATE = { OK: 0, ERROR: 1, WAIT: 2, RECCONECT: 3 }

class InfoTrans {
    hash: string
    nonce: number
    blockHash: string | null
    blockNumber: number | null
    transactionIndex: number | null
    from: string
    to: string | null
    value: string
    gasPrice: string
    maxPriorityFeePerGas?: number | string | BN
    maxFeePerGas?: number | string | BN
    gas: number
    input: string
}
export class InfoTransactions {
    type: string = ''
    transaction: InfoTrans
    constructor() {
        this.transaction = new InfoTrans()
    }
}

import { InfuraProvider, EtherscanProvider } from "@ethersproject/providers";

export const ETH_NETWORKS = {
    mainnet: 'homestead',
    testnet: 'rinkeby',
};
export class ProviderHandle {
    name: string = 'UNDEFINED'
    countKeys: number = 0
    key: string = ''
    Keys: { key: string, state: number }[] = []
    queueState: number[] = []
    providerEtherscan?: EtherscanProvider
    providerInfura?: InfuraProvider
    constructor(keys: string[], name: string) {
        this.name = name
        keys.forEach(element => this.Keys.push({ key: element, state: 0 }));
        var rund_num = 0;
        this.countKeys = rund_num
        this.key = this.Keys[rund_num].key;
    }

    pushErrState() {
        this.queueState.push(STATE.ERROR)
    }
    pushRecconectState() {
        this.queueState.push(STATE.RECCONECT)
    }

    isError() {
        if (this.queueState.find(w => w === STATE.ERROR) !== undefined) {
            return true
        }
        if (this.queueState.find(w => w === STATE.RECCONECT) !== undefined) {
            return true
        }
        return false
    }

    isRecconect() {
        if (this.queueState.find(w => w === STATE.RECCONECT) !== undefined) {
            return true
        }
        return false
    }
    changeKey(): string {
        this.countKeys++
        if (this.countKeys >= this.Keys.length) this.countKeys = 0
        this.key = this.Keys[this.countKeys].key;
        logger.info("NEW " + this.name + " KEY: " + this.key + ", Count: " + this.countKeys + ", Max count: " + this.Keys.length);
        return this.key
    }
    initProviderEtherscan() {
        this.providerEtherscan = new ethers.providers.EtherscanProvider(ETH_NETWORKS.mainnet, this.key)
        this.providerEtherscan.pollingInterval = 1000*60;
        
    }
    initProviderInfura() {
        //this.providerInfura = ethers.providers.InfuraProvider.getWebSocketProvider(ETH_NETWORKS.mainnet, this.key)
        this.providerInfura = new  ethers.providers.InfuraProvider(ETH_NETWORKS.mainnet, this.key)
    }
    changeProvider() {
        this.changeKey()
        if (this.providerEtherscan != null) {
            this.initProviderEtherscan()
        } else if (this.providerInfura != null) {
            this.initProviderInfura()
        }
    }
    initProvider() {
        if (this.providerEtherscan != null) {
            this.initProviderEtherscan()
        } else if (this.providerInfura != null) {
            this.initProviderInfura()
        }
    }
    upgateIfError() {
        if (this.queueState.find(w => w === STATE.ERROR) !== undefined) {
            this.changeProvider()
            this.queueState.length = 0
            return true
        }
        //if no errors, but need recconect 
        if (this.queueState.find(w => w === STATE.RECCONECT) !== undefined) {
            logger.info("RECCONECT " + this.name + " KEY: " + this.key + ", Count: " + this.countKeys + ", Max count: " + this.Keys.length);
            this.initProvider()
            this.queueState.length = 0
            return true
        }

        return false
    }
}

export class Network {
    handleInfura: ProviderHandle[] = []
    handleEtherscan: ProviderHandle[] = []
    constructor() {
    }
    //*************************************************************************/
    addInfuraHandle(urls: string[], name: string) {
        const provider = new ProviderHandle(urls, name)
        provider.initProviderInfura()
        this.handleInfura.push(provider)
    }
    addEtherscanHandle(urls: string[], name: string) {
        const provider = new ProviderHandle(urls, name)
        provider.initProviderEtherscan()
        this.handleEtherscan.push(provider)
    }
    getInfuraHeader(name: string): ProviderHandle {
        return this.handleInfura.find(w => w.name === name)
    }
    getEtherscanHeader(name: string): ProviderHandle {
        return this.handleEtherscan.find(w => w.name === name)
    }
    getInfuraProvider(name: string) {
        return this.getInfuraHeader(name).providerInfura
    }
    getEtherscanProvider(name: string) {
        return this.getEtherscanHeader(name).providerEtherscan
    }
    upgateInfuraIfError(name: string) {
        return this.getInfuraHeader(name).upgateIfError()
    }
    isInfuraProviderError(name: string) {
        return this.getInfuraHeader(name).isError()
    }
    isInfuraError() {
        for (const w of this.handleInfura) {
            if (w.isError()) return true
        };
        return false
    }
    getNumEtherscanProvider(): number {
        return this.handleEtherscan.length;
    }
    getNumInfuraProvider(): number {
        return this.handleInfura.length;
    }
}






