
import BN from 'bn.js'
import { BigNumber } from "@ethersproject/bignumber";
import logger from './log'
import { BigNumberish, ethers, logger as logger_ethers } from 'ethers';

export default class Utils {
    constructor() {
    }

    getRandomInt(max: number):number {
        return Math.floor(Math.random() * max);
    }

    sleep(ms: number) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }

// Normalize the hex string
    toHex(value: string | BN): string {

    // For BN, call on the hex string
    if (typeof(value) !== "string") {
        return this.toHex(value.toString(16));
    }

    // If negative, prepend the negative sign to the normalized positive value
    if (value[0] === "-") {
        // Strip off the negative sign
        value = value.substring(1);

        // Cannot have multiple negative signs (e.g. "--0x04")
        if (value[0] === "-") { logger_ethers.throwArgumentError("invalid hex", "value", value); }

        // Call toHex on the positive component
        value = this.toHex(value);

        // Do not allow "-0x00"
        if (value === "0x00") { return value; }

        // Negate the value
        return "-" + value;
    }

    // Add a "0x" prefix if missing
    if (value.substring(0, 2) !== "0x") { value = "0x" + value; }

    // Normalize zero
    if (value === "0x") { return "0x00"; }

    // Make the string even length
    if (value.length % 2) { value = "0x0" + value.substring(2); }

    // Trim to smallest even-length string
    while (value.length > 4 && value.substring(0, 4) === "0x00") {
        value = "0x" + value.substring(4);
    }

    return value;
}

    ethToWei(eth: BigNumber|number|string):BigNumber {
        let val
        if(typeof(eth) === "number"||typeof(eth) === "string"){
            val = BigNumber.from(eth).mul(1000000000000000000)
        }else{
            val = eth.mul(1000000000000000000)
        }
        return val
    };
    weiToETH(wei: BigNumber) {
        const val = wei.div(1000000000000000000)
        return val
    };

    weiToStrEth(wei: BigNumberish) {
        return ethers.utils.formatUnits(wei, 'ether')
    };
    weiToStrGwei(wei: BigNumberish) {
        return ethers.utils.formatUnits(wei, 'gwei')
    };

    printBalance(balance: BigNumberish) {
        var str = this.weiToStrEth(balance);
        logger.info(str + " ETH");
    };
    
}

