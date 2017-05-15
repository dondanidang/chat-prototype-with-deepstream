$(() => {
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


    const Ru = require('./utils.js')

    const moment = require('moment')

    const F = require('fluture')

    const {promisify} = require('bluebird')

    let client = deepstream('127.0.0.1:6020')



    const getChannelList = Ru.id

    const addNewMessage = Ru.curry((client, channel, msg) => {
        let msgToAdd = Ru.pickAll(['text', 'user', 'sentDate'], msg)

        // Create message id
        let msgId = client.getUid()
        msgToAdd = Ru.assoc('id', msgId, msgToAdd)

        // create
        let msgRecord = client.record.getRecord(msgId)

        msgRecord.whenReady(msgRecord => {

            msgRecord.set(msgToAdd)

            channel.addEntry(msgId)
        })
    })

    const displayMsg = spec => {
        let {
            text,
            user,
            sentDate,
            id
        } = spec

        $('#messages').append($('<li>').text(text))
    }

    const clearTextInput = () => $('#m').val('')


    const processMsgRecord = msgRecord =>{
        //Subscribe to message text [TODO: IMPROVEMENT FOR EDIT OPTION]
        // msgRecord.subscribe('text', Ru.log)
        const go = Ru.pipe(
            r => r.get(),
            displayMsg
        )

        return go(msgRecord)
    }

    const processMsgsRecord = Ru.forEach( processMsgRecord )

    const displayUserStatus = (username, isLogged) => {
        console.log(username, isLogged)
        let text = `${username} has left the chat`

        if (isLogged) {
            text = `${username}  has joined the chat`
        }

        $('#memberOnline').append($('<li>').text(text))
    }


    // TODO::: Doesn't work properly
    // const loadMsgsF = Ru.curry((client, spec) => {
    //     const loadMsg = id => {
    //
    //         const go = done => {
    //             let msg = client.record.getRecord(id)
    //
    //             return msg.whenReady(done)
    //         }
    //
    //         return (
    //             F
    //             .node(go)
    //         )
    //     }
    //
    //     let {
    //         msgIds=[]
    //     } = spec
    //
    //     let msgsF = Ru.map(loadMsg, msgIds)
    //
    //     return (
    //         F
    //         .parallel(Infinity, msgsF)
    //     )
    //
    //     // load initial list
    //     // myList = client.record.getList( 'super-long-list', { start: 2000, end: 2200 });
    //
    //     // change window
    //     // myList.setOptions({ start: 2200, end: 2400 });
    //
    // })


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
    const startChatConversation = channelName => {
        // [TODO] Get or create conversation list
        let channel = client.record.getList(channelName)

        channel.whenReady(channel => {
            // Load the conversation messages
            let msgIdList  =  channel.getEntries()

            let conversationLength = Ru.length(msgIdList)

            let oldMsgSpec = {
                msgIds: msgIdList
            }

            loadMsgsC(client, oldMsgSpec)

            // TODO:: event on send button
            $('#s')
            .on(
                'click',
                () =>  {
                    let spec = {
                        text: $('#m').val(),
                        user: client.getUid(),
                        sentDate: moment().format()
                    }

                    addNewMessage(client, channel, spec)

                    clearTextInput()

                    return false
                }
            )


            // subscribe client channel change
            channel.subscribe( msgIds => {
                let newMsgIds = Ru.slice(conversationLength, Infinity, msgIds)

                conversationLength = Ru.length(msgIds)

                let spec = {
                    msgIds: newMsgIds
                }

                loadMsgsC(client, spec)
            })
        })
    }

    const userLoggedIn = s => {

        console.log('user logIn: ', s)

        // [TODO]subscribe to user presence to detect when he is online
        client.presence.subscribe(displayUserStatus)



        // [TODO] [Load list of user channels]
        let channelList = getChannelList()


        // When user select channel to start a conversation
        startChatConversation('channelSelected1')
    }


    $('#logIntoChat')
    .on(
        'click',
        () => {
            const username = $('#username').val()

            const user = {
                username
            }

            console.log('user:: ', user)

            // Login
            client.login(user, userLoggedIn)

            client.on('error', Ru.log)
        }
    )
})
