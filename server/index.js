/*
    - SERVER node API
        https://deepstream.io/docs/server/node-api/

    - SERVER configuration
        https://deepstream.io/docs/server/configuration/
 */

'use strict'


const R = require('ramda')

const express = require('express')

const DeepStreamServer = require('deepstream.io')

const PostgresConnector = require('deepstream.io-storage-postgres')

const RethinkDBConnector = require('deepstream.io-storage-rethinkdb')

const {
    deepstreamConfig,
    pgConfig,
    rethinkDBConfig
} = require('./config.js')

/**
* DatabaseConnectors connect deepstream to a database such as
* PostgresSQL, Mysql, MongoDB, RethinkDB etc...
* @type DatabaseConnector
*/

const dbConnector = new PostgresConnector(pgConfig)

let server = new DeepStreamServer(deepstreamConfig)

server.set('storage', dbConnector)

server.start()
