const mongoose = require('mongoose');
const Schema = mongoose.Schema;
let db = null;


//Initialize connection to MongoDB
module.exports.initMongo = async () => {
  return new Promise((resolve, reject) => {
    mongoose.connect(`mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PWD}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${process.env.MONGO_DB}`, { useNewUrlParser: true }, function(err){
      if(err){
        console.log('Connecting error');
        console.log(err);
        reject()
      }
      db = mongoose.connection;
      resolve(db);
    });
  })
  
}

const connectionSchema = new Schema({
  connection: {
    connectionId: String,
    room: String
  }
});

module.exports.Connection = mongoose.model('Connection', connectionSchema);
