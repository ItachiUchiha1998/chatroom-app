var express = require('express'); // import express
var app = express(); // create framework app
var server = require('http').createServer(app); // create server
var io = require('socket.io').listen(server); // import socket.io
var mongoose = require('mongoose'); // import mongoose module

mongoose.connect('mongodb://localhost/chatApp',function(err){// setting up Database
	if(err){ // incase of error
		console.log(err);
	}else{ // if no error
		console.log('Connection established with database');
	}
});

var chatSchema = mongoose.Schema({ // Setting up Schema
	username: String,
	message: String,
	created: {type:String,default:Date.now()} 
});

var Chat = mongoose.model('Message',chatSchema); // create a collection called messages

users = {};  // list for users
connections = []; // array for no. of connections

server.listen(3000); // listen to port mentioned
console.log('Server Running..'); // console output that server is running

app.get('/',function(req,res) {
	res.sendFile(__dirname + '/index.html'); // get index.html when port is accessed
}) ;

io.sockets.on('connection',function(socket){ // set up connection
	var query = Chat.find({}); //  find all queries
	query.sort('created').limit(20).exec(function(err,docs){ // sort in desc by date,show only latest 20 msgs
		if(err) throw err; // in case of error 
		console.log("Sending old msgs");
		socket.emit("load old msgs",docs); // load old messages from server side
	});

	connections.push(socket); // get connections
	console.log('Connected: %s sockets',connections.length); // ouput no of connections


	// Disconnect
	socket.on('disconnect',function(data) {
		//if(!socket.username) return;
		delete users[socket.username];// delete username when user disconnects
		/*users.splice(users.indexOf(socket.username),1); // remove username when it disconnects*/	
		updateUsernames(); // goto func
		connections.splice(connections.indexOf(socket),1); // remove user when it disconnects
		console.log('Disconnected:%s connected',connections.length);
	});

	// Send Message
	socket.on('send message',function(data,callback) { /*call back later*/
		var msg = data.trim(); /* trim of in case of spaces at the begging */
		if(msg.substr(0,3)==='/w '){ /*check in case of whisper */ 
			msg = msg.substr(3); // get first 3 characters
			var ind = msg.indexOf(' '); // find index of first space
			if(ind!==-1){ // check space presence
			var name = msg.substring(0,ind); // get name for private msg
			var msg = msg.substring(ind+1); // retreive message
			if(name in users){
				users[name].emit('whisper',{msg: msg,user: socket.username}); // emit message to a specified user
				console.log('whisper'); /* in case of whisper */
			}
			else{
				//callback("Errorii");
			}
			}
			else{
				//callback('Error');
			}
		}
		else{
				var newMsg = new Chat({message:msg,username:socket.username});// send public message
				newMsg.save(function(err){ // save in databse
					if(err) throw err;
				io.sockets.emit('new message',{msg: msg,user: socket.username}); // emit throgh socket the new msg and username of user sending it to index.html					
				});
			}
	});

	// new user
	socket.on('new user',function(data,callback) { // when userform is submitted
		callback(true); ////
		socket.username = data; // return username entered
	/*	users.push(socket.username); */// append username in users array
		users[socket.username] = socket /* blank */
		updateUsernames();// goto func
	});

	function updateUsernames() {
		io.sockets.emit('get users',Object.keys(users)); // instead of Object.keys only users..
	}

});