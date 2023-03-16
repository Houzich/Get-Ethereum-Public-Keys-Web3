import * as fs from "fs"
import { isMainThread } from "node:worker_threads"

export type ConfigProps = {
  path_addresses: string
  logLevel: "default" | "detailed",
}

let singleton!: Config

export class Config {
  private path = "./src/config/config.json"

  properties: ConfigProps = {
    path_addresses: "",
    logLevel: "detailed"
  }

  constructor() {
    if (singleton) return singleton
    singleton = this
  }

  async load() {
    let body: string = ""
    try {
      body = await fs.promises.readFile(this.path, { encoding: "utf-8" })
    } catch(e) {
      console.log(e)
      throw new Error(`Ошибка инициализации. Отсутствует файл конфигурации "${this.path}".`)
    }   
    try {
      const props = JSON.parse(body)
      if (!props.path_addresses) throw new Error(`Ошибка инициализации. Не указан путь к файлу с адресами`)
      this.properties.path_addresses = props.path_addresses
      this.properties.logLevel = props.logLevel || "default"
      if (isMainThread) console.log(this.properties)
      return true
    } catch(e) {
      console.log(e)
      throw new Error(`Ошибка инициализации. Неверный формат файла конфигурации.`)
    }
  }

}
