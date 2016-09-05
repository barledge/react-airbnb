import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import session from 'express-session';
import passport from 'passport';
import massive from 'massive';
import path from 'path';
import Auth0Strategy from 'passport-auth0';
import AWS from 'aws-sdk';

// Configs
import serverConfig from './config.json';
import awsConfig from './AWS/config.json';

const connectionString = serverConfig.postgresPath; //database path
const app = module.exports = express();

app.use(express.static(__dirname + '/../public'));

app.use('/node_modules', express.static('./node_modules'));
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(session({
    secret: serverConfig.sessionSecret, //session secret
    saveUninitialized: false,
    resave: true
}));

AWS.config.update({
  accessKeyId: awsConfig.aws_key,  //aws config begins
  secretAccessKey: awsConfig.aws_secret,
  region: awsConfig.region
})

const s3 = new AWS.S3();

app.use(passport.initialize());
app.use(passport.session());
app.use(cors());
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

var strategy = new Auth0Strategy({
   domain:       serverConfig.authDomain,      //authO config begin
   clientID:     serverConfig.authId,
   clientSecret: serverConfig.authSecret,
   callbackURL:  '/callback'
  },
  function(accessToken, refreshToken, extraParams, profile, done) {
    console.log('Login successfull');
    return done(null, profile);
  }
);

passport.use(strategy);


passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

app.get('/become-a-host', function(request, response){
  response.sendFile(path.resolve(__dirname, '../public', 'BecomeAHost.html'))
});

app.get('/callback',
  passport.authenticate('auth0', { failureRedirect: '/login' }),
  function(req, res) {
    if (!req.user) {
      throw new Error('user null');
    }
    res.redirect("/");
  }
);

app.get('/login',
  passport.authenticate('auth0', {}), function (req, res) {
  res.redirect("/");
});

app.post('/postImage', function(req, res, next) {
  console.log('hi');
  const buf = new Buffer(req.body.imageBody.replace(/^data:image\/\w+;base64,/, ""), 'base64');

  const bucketName = 'matttran/' + req.body.userEmail; //uniqueID
  const params = {
    Bucket: bucketName,
    Key: req.body.imageName,
    Body: buf,
    ContentType: 'image/' + req.body.imageExtension,
    ACL: 'public-read'
  }

  s3.upload(params, function(err, data) {
    if (err) {
      console.log('ERROR', err);
      return res.status(500).send(err)};
    console.log('UPLOADED:', data);
    res.status(200).json(data);
  })
})

http.listen(3000, function() {
    console.log('Hosting port: ', 3000);
});