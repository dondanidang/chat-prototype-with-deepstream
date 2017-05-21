const Ru = require('rutils')


const log = (...arr) => Ru.tap(Ru.apply(console.log))(arr)

const newUtils = {
    log
}

module.exports = Ru.merge(
    Ru,
    newUtils
)
