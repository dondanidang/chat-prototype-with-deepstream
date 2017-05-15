'use strict'

const R = require('ramda')

const express = require('express')

const http = require('http')

let app = new express()

const server = http.createServer(app)

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'))
app.get('/communication.js', (req, res) => res.sendFile(__dirname + '/bundle.js'))

server.listen(3000, () => console.log('listening on *:3000'))
