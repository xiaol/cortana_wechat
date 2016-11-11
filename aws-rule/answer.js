var mydata = require('./../request');
var base = require('./../base');
var answer = {};
answer.rule = function(question,chat_item){
	var path = mydata.getMyine,rqd = {};
	rqd.storyid = '582146648ad0b506108ac854';
	rqd.question = question;
	base.dataConn(path,rqd,"get",function(data){
		msg_send.push({"text": "..","item":chat_item});
	});
}