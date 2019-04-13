const { initMongo, Connection } = require('./ConnectionSchema');
const AWS = require('aws-sdk');

require('./patch.js');

module.exports.handler = async(event, context) => {
  
  const db = await initMongo();
  
  if (event.requestContext.routeKey === "$connect") {
    let connectionObj = new Connection({ connection: { connectionId: event.requestContext.connectionId, room: "Default" } });
    const saveConn = await connectionObj.save();
    
    return {
      statusCode: 200,
      body: "Hello "
    };
  }
  else if (event.requestContext.routeKey === "$disconnect") {
    await deleteConnection(event.requestContext.connectionId);
  }
  else if (event.requestContext.routeKey === "$default") {
    return {
      statusCode: 200,
      body: "Default path"
    };
  }
  else if (event.requestContext.routeKey === "test") {
     const apigwManagementApi = new AWS.ApiGatewayManagementApi({
        apiVersion: '2018-11-29',
        endpoint: event.requestContext.domainName + '/' + event.requestContext.stage
    });    
    const body = JSON.parse(event.body);
    
    //Retrieve all connection Ids from Mongo
    const activeConnectionIds = await findConnectionIds();
    
    //Post message to each active connection
    try{
      const postAll = activeConnectionIds.map(async (id) => {
        if(id && id !== event.requestContext.connectionId){
          return postMessage(id, body.rcmsg, apigwManagementApi);  
        }
      });
      
      await Promise.all(postAll);
    }catch(err){
      console.log('Error posting to all connections');
      console.log(err);
    }
    return {
      statusCode: 200,
      body: JSON.stringify(body)
    };
  }
};

const deleteConnection = async (connectionId) => {
  return new Promise( (resolve, reject) => {
    Connection.deleteOne({ 'connection.connectionId': connectionId }, function(err) {
      if (err){
        console.log(`Error deleting connection ${err.toString()}`);
        reject()
      } 
      resolve();
    });
  })
}

const findConnectionIds = async () => {
  return new Promise((resolve, reject) => {
    Connection.find({}, function(err, connections){
      if(err){
        console.log('Error reading from DB');
        console.log(err);
        reject();
      }
      const connArr = connections.map(obj => obj.connection.connectionId);
      resolve(connArr);
    });
  });
};

const postMessage = async (connectionId, data, apigwManagementApi) => {
  try{
    await apigwManagementApi.postToConnection({
      ConnectionId: connectionId,
      Data: data
    }).promise();
  }catch(err){
    console.log(`Error posting to API`);
    console.log(err);
    if(err.statusCode === 410){
      await deleteConnection(connectionId);
    }
  }
};
