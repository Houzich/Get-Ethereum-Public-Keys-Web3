export class Table {
  table: Array<Array<string>>;

  constructor() {
    this.table = new Array();
  }

  push(line: Array<string>) {
    this.table.push(line);
    return this.table[this.table.length - 1];
  }
  setBalance(index: number, balance: string) {
    this.table[index][1] = balance
  }
  setPubKey(index: number, pubKey: string) {
    this.table[index][2] = pubKey
  }
  setData(index: number, balance: string, pubKey: string) {
    this.setBalance(index, balance)
    this.setPubKey(index, pubKey)
  }

  getAsLine(index: number) {
    const line = this.table[index]
    let resp = ''
    for (let i = 0; i < line.length; i++) {
      resp += i == (line.length -1) ? (line[i] + "\n"): (line[i] + ",")
    }
    return resp;
  }
  getAddress(index: number) {
    const line = this.table[index]
    return "0x" + line[0];
  }
  getLength() {
    return this.table.length;
  }
}

