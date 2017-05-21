const initClient = () => {
    /*
        When sharla open
         * Login with userId to chat system -> to appear to other
         * Get the list of all the channelName user has been engaged to and get the
            last 10 message from each channel
         * Subscribe on presence of all the users you have on your chat
            (To know when they are online)

        When user click on someone to chat
         * Get or create channelName in sharla reign and create used data to start
            or continue a chat conversation

        Add listener to the chat for capturing sharla rdv

        Authentication process

     */
    const deepstream = require('deepstream.io-client-js')

    const Ru = require('../utils.js')

    const moment = require('moment')

    const F = require('fluture')

    const {promisify} = require('bluebird')

    let client = deepstream('127.0.0.1:6020')


    const addNewMessage = Ru.curry((client, channel, msg) => {

        let msgToAdd = Ru.pickAll(['text', 'user', 'sentDate'], msg)

        client
        .rpc
        .make(
            'message-create-id',
            '',
            (err, msgId) => {
                msgToAdd = Ru.assoc('id', msgId, msgToAdd)

                // create
                let msgRecord = client.record.getRecord(msgId)

                msgRecord.whenReady(msgRecord => {

                    msgRecord.set(msgToAdd)

                    channel.addEntry(msgId)
                })
            }
        )
    })

    // Temporary Will be replace
    const displayMsg = spec => {
        let {
            text,
            user,
            sentDate,
            id
        } = spec

        let s = `${user}[${sentDate}]-said: ${text}`

        $('#messages').append($('<li>').text(s))
    }

    const clearTextInput = () => $('#m').val('')


    const processMsgRecord = msgRecord => {
        //Subscribe to message text [TODO: IMPROVEMENT FOR EDIT OPTION]
        // msgRecord.subscribe('text', Ru.log)
        const go = Ru.pipe(
            r => r.get(),
            displayMsg
        )

        return go(msgRecord)
    }

    const processMsgsRecord = Ru.forEach( processMsgRecord )

    // Temporary, will be replaced
    const displayUserStatus = Ru.curry((username, isLogged) => {
        console.log(username, isLogged)
        let text = `${username} is offline`

        if (isLogged) {
            text = `${username}  has joined the chat`
        }

        $('#memberOnline').append($('<li>').text(text))
    })


    const loadMsgsC = Ru.curry((client, spec) => {

        const loadMsg = id => {

            let msg = client.record.getRecord(id)

            return msg.whenReady( processMsgRecord )
        }

        let {
            msgIds=[]
        } = spec

        let msgsF = Ru.map(loadMsg, msgIds)
    })

    // ################## When a chat conversation ####################
    const startChatConversation = Ru.curry((client, userId, friendId) => {
        // Get channelId
        client
        .rpc
        .make(
            'channel-get-id',
            {userId, friendId},
            (err, channelId) => {

                if (err) {
                    return Ru.log('Could not get the channel', err)
                }

                Ru.log('channelId::: ', channelId)

                // Subscribe to friend presence
                let friendPresenceRecord = client.record.getRecord(`presence/${friendId}`)

                friendPresenceRecord.whenReady(fpr => {
                    fpr.subscribe('status', displayUserStatus(friendId))
                })

                // Request the server to start updating friend status
                client
                .rpc
                .make(
                    'user-presence-status-subcription',
                    friendId,
                    (err, _) => {

                        if (err) {
                            return Ru.log('Could not request for user presence status order failed', err)
                        }


                        Ru.log('user-presence-status-subcription: ', _)

                        let channel = client.record.getList(channelId)

                        channel.whenReady(channel => {
                            // Load the conversation messages
                            let msgIdList  =  channel.getEntries()

                            let oldMsgSpec = {
                                msgIds: msgIdList
                            }

                            loadMsgsC(client, oldMsgSpec)

                            // Temporary, will be replaced
                            // TODO:: Submit button
                            $('#s')
                            .on(
                                'click',
                                () =>  {
                                    let spec = {
                                        text: $('#m').val(),
                                        user: userId,
                                        sentDate: moment().format()
                                    }

                                    addNewMessage(client, channel, spec)

                                    // Temporary, will be removed
                                    clearTextInput()

                                    return false
                                }
                            )


                            // subscribe client channel change
                            channel.on('entry-added', msgId => {

                                let spec = {
                                    msgIds: [msgId]
                                }

                                loadMsgsC(client, spec)
                            })
                        })
                    }
                )


            }
        )
    })


    const openChatRoom = Ru.curry((client, user, s) => {
        console.log('user logIn: ', s)

        let {
            username
        } = user

        client
        .rpc
        .make(
            'user-check-existance',
            username,
            (err, alreadyExist) => {
                if (err) {
                    return Ru.log('Could not check user existance', err)
                }


                if (alreadyExist) {
                    //TODO [load User info]
                    return Ru.log(username, ' already exists')
                }

                // Create user account unless exist
                client
                .rpc
                .make(
                    'user-create-account',
                    username,
                    Ru.log
                )
            }
        )

        // Simulating user selecting chat conversation
        $('#selectChat')
        .on(
            'click',
            () => {
                const friendname = $('#friendname').val()

                startChatConversation(client, username, friendname)

            }
        )

    })

    // Simulating user opening chat
    $('#openChatRoom')
    .on(
        'click',
        () => {
            const username = $('#username').val()

            const user = {
                username
            }

            console.log('user:: ', user)

            // Login
            client.login(user, openChatRoom(client, user))

            client.on('error', Ru.log)
        }
    )
}

$(initClient)

/*
    * if user go into chatRoom >>>>>>>>>> log into chat with {userName, and userId}
        * Load user save info if already register or create new account
    * If user leave the chatRoom >>>>>>>>> logout the chat
    * When user start conversation >>>>>>>>> check if receiver status is online
    * Data synchronization between sharla-app and sharla-chat
 */
