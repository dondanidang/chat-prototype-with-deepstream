const Ru = require('./Rutils/index.js')


const log = Ru.tap(console.log)

const newUtils = {
    log
}

module.exports = Ru.merge(
    Ru,
    newUtils
)
