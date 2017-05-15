// For more info check /node_modules/deepstream.io/conf/config.yml
// For more info check https://deepstream.io/docs/server/configuration/

const deepstreamConfig = {
    host: 'localhost',
    port: 6020,
    serverName: 'UUID',
    showLogo: true,
    sslKey: null,
    sslCert: null,
    sslCa: null,
}

// const pgConfig = {
//   host: 'localhost',
//   port: 5432,
//   database: 'sharla',
//   user: 'sharla',
//   password: 'sharla_pwd'
// }

const pgConfig = {
  host: 'sharla-pg-instance.cf04deef3pb5.us-west-2.rds.amazonaws.com',
  port: 5432,
  database: 'sharla',
  user: 'sharla',
  password: 'sharla_pwd'
}

const rethinkDBConfig = {
	//The host that RethinkDb is listening on
	host: 'localhost',

	//The port that RethinkDb is listening on
	port: 28015,

	//(Optional) Authentication key for RethinkDb
	// authKey: 'someString',

	//(Optional, defaults to 'deepstream')
	// database: 'someDb',

	//(Optional, defaults to 'deepstream_records')
	// defaultTable: 'someTable',

	/* (Optional) A character that's used as part of the
	* record names to split it into a tabel and an id part, e.g.
	*
	* books/dream-of-the-red-chamber
	*
	* would create a table called 'books' and store the record under the name
	* 'dream-of-the-red-chamber'
	*/
	splitChar: '/'
}


module.exports = {
    deepstreamConfig,
    pgConfig,
    rethinkDBConfig
}
