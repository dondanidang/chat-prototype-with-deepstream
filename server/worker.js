'use strict'
const moment = require('moment')

const F = require('fluture')

const Ru = require('../utils')

const deepstream = require('deepstream.io-client-js')

let dsClient = deepstream('127.0.0.1:6020')

const C = {
    usersStatusObj: 'usersStatus'
}

const tables = {
    presence: 'presences',
    message: 'messages',
    channel: 'channels',
    account: 'accounts'
}

const makeModel = spec => {
    let {
        userId,
        username
    } = spec
    return {
        id: userId,
        username,
        friendList: {}
    }
}

const userPresenceStatusHasChanged = Ru.curry(
    (client, recordOfAllUsersStatus, userId, status) => {

        recordOfAllUsersStatus.set(`${userId}.status`, status)

        let pUserRecordName = `${tables.presence}/${userId}`

        // UpdateUser presence status
        let userPresenceStatus = client.record.getRecord(pUserRecordName)

        userPresenceStatus.whenReady(presenceRecord => {
            presenceRecord.set('status', status)
        })
    }
)


const manageUserPresenceStatus = client => {

    const makePresenceObj = Ru.pipe(
        Ru.objOf('userId'),
        Ru.assoc('status', true)
    )

    // Retrieve currently loggin in the system
    client.presence.getAll(users => {
        // Get userStatus
        let usersStatusRecord = client.record.getRecord(`${tables.presence}/${C.usersStatusObj}`)
        //Waiting for the record to load
        usersStatusRecord.whenReady(usersStatusRecord => {

            // Get all the users that ever log into the chat systems
            const currentUsersStatus = usersStatusRecord.get()

            const setStatusToOnlineUsers = Ru.pipe(
                Ru.map(makePresenceObj),
                Ru.indexBy(Ru.prop('userId'))
            )

            const updateUserLoggedInList = Ru.pipe(
                setStatusToOnlineUsers,
                Ru.merge(currentUsersStatus)
            )

            usersStatusRecord.set(updateUserLoggedInList(users))

            // Start listening for all the user that loggin
            client
            .presence
            .subscribe(userPresenceStatusHasChanged(client, usersStatusRecord))

            Ru.log('Worker-manageUserPresenceStatus ready....', usersStatusRecord.get())
        })

    })

}

const rpcForUserStatusSubscription = client => {
    Ru.log('Worker rpcForUserStatusSubscription ready....')

    client
    .rpc
    .provide(
        'user-presence-status-subcription',
        (userId, response) => {
            Ru.log('userID::: ', userId)

            const presenceRecord = client.record.getRecord(`${tables.presence}/${userId}`)


            const sendResponse = err => {
                if (err) {
                    Ru.log('[rpcForUserStatusSubscription-err]: ', err)
                    return response.send({
                        status: 'ERROR',
                        text: JSON.stringify(err)
                    })
                }

                response.send({
                    status: 'READY',
                    text: `Can subscribe to record name "${tables.presence}/${userId}"`,
                    idForSubscription: `${tables.presence}/${userId}`
                })
            }

            presenceRecord.whenReady(presenceRecord => {

                const usersStatus = client.record.getRecord(`${tables.presence}/${C.usersStatusObj}`)

                usersStatus.whenReady(usersStatus => {

                    let defaultUStatus = {
                        userId,
                        status: false
                    }

                    // User status never register before
                    if ( Ru.isNil(usersStatus.get(`${userId}.status`)) ) {
                        returtn(
                            usersStatus
                            .set(
                                userId,
                                defaultUStatus,
                                err => {
                                    if (err) {
                                        return sendResponse(err)
                                    }

                                    presenceRecord
                                    .set(
                                        'status',
                                        usersStatus.get(`${userId}.status`),
                                        sendResponse
                                    )
                                }
                            )
                        )
                    }

                    presenceRecord
                    .set(
                        'status',
                        usersStatus.get(`${userId}.status`),
                        sendResponse
                    )

                })
            })
    })
}

const rpcForMessageIdCreation = client => {
    Ru.log('Worker rpcForMessageIdCreation ready....')
    client
    .rpc
    .provide(
        'message-create-id',
        (_, response) => {
        response.send(`${tables.message}/${client.getUid()}`)
    })
}

const rpcForUserAccountCreation = client => {
    Ru.log('Worker rpcForUserStatusSubscription ready....')
    client
    .rpc
    .provide(
        'user-create-account',
        (userId, response) => {

        let userRecord = client.record.getRecord(`${tables.account}/${userId}`)

        userRecord.whenReady(userRecord => {
            // Use model to create userRecord set
            userRecord.set(makeModel({userId}))
            response.send(client.getUid())
        })
    })
}

const rpcForUserExistenceChecking = client => {
    Ru.log('Worker rpcForUserExistenceChecking ready....')
    client
    .rpc
    .provide(
        'user-check-existance',
        (userId, response) => {

        let userRecord = client.record.getRecord(`${tables.account}/${userId}`)

        userRecord.whenReady(userRecord => {
            // Use model to create userRecord set
            response.send(!Ru.isNil(userRecord.get('id')))
        })
    })
}

const rpcForChannelIdRetrievement = client => {
    Ru.log('Worker rpcForChannelIdRetrievement ready....')
    client
    .rpc
    .provide(
        'channel-get-id',
        (spec, response) => {

        let {
            userId,
            friendId
        } = spec

        let userRecord = client.record.getRecord(`${tables.account}/${userId}`)

        userRecord.whenReady(userRecord => {
            let channelId = userRecord.get(`friendList.${friendId}.channelId`)

            if ( Ru.isNil(channelId) ) {
                let channelId = `${tables.channel}/${client.getUid()}`
                // [TODO]--> createChannel

                return(
                    userRecord
                    .set(
                        `friendList.${friendId}`,
                        {channelId},
                        err => {
                            let friendRecord = client.record.getRecord(`${tables.account}/${friendId}`)
                            friendRecord.whenReady(fr => {
                                // if friend doesn't exist, create it
                                if (Ru.isEmpty(fr.get())) {
                                    let m = makeModel({userId: friendId})
                                    let f = {
                                        [userId] : {channelId}
                                    }
                                    m = Ru.assoc('friendList', f, m)

                                    return fr.set(
                                        m,
                                        err => {
                                            return response.send(channelId)
                                        }
                                    )
                                }

                                fr
                                .set(
                                    `friendList.${userId}`,
                                    {channelId},
                                    err => {
                                        if (err) {
                                            return Ru.log('rpcForChannelIdRetrievement[Error] ', err)
                                        }
                                        return response.send(channelId)
                                    }
                                )

                            })

                        }
                    )
                )
            }

            response.send(channelId)
        })
    })
}

dsClient.login({username: 'serverDSClient-1'}, () => {
    Ru.log('Worker starts bootstraping....')
    // Manage user presence
    manageUserPresenceStatus(dsClient)

    //RPC for presence subcription
    rpcForUserStatusSubscription(dsClient)

    //RPC for messageid creation
    rpcForMessageIdCreation(dsClient)

    //RPC for account creation
    rpcForUserAccountCreation(dsClient)

    // RPC for existence checking
    rpcForUserExistenceChecking(dsClient)

    // RPC for channelId retrievement
    rpcForChannelIdRetrievement(dsClient)
})



dsClient.on('error', Ru.log)


// let userSchema = {
//     id: sharlaUserId,
//     username: 'string'
//     status:
//     friendList:{
//         sharlaUserId1: {
//             channelId: 'channelId1',
//             username: 'sharlaUserId1'
//         },
//         sharlaUserId1: {
//             channelName: 'channelId2',
//             username: 'sharlaUserId2'
//         }
//     },
//     groupList:{
//
//     }
// }
//
//
// let channelUserSchema = {
//     Available:
// }
