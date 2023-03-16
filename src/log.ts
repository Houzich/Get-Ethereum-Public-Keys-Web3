

import winston from 'winston'
import fs from 'fs'

const { format } = winston;

const env = process.env.NODE_ENV;
const logDir = 'logs';

if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

const now = new Date();
var logger = winston.createLogger({
    transports: [
        new winston.transports.Console({
            
            format: format.combine(
                //format.label({label: "ANTON", message: true}),
                format.colorize({
                    all:true
                }),
                format.splat(),
                format.simple(),
                
                
            ),
            
        }),
        new winston.transports.File({
            filename: './logs/exceptions.log',
            //level: 'info',
            format: format.combine(
                //format.colorize(),
                format.splat(),
                format.simple()
            ),
        }),

        new (require('winston-daily-rotate-file'))({
            filename: `${logDir}/-apimodules.log`,
            timestamp: now,
            datePattern: 'dd-MM-yyyy',
            prepend: true,
            json: false,
        }),
    ],
    exitOnError: false,
});

export default logger
