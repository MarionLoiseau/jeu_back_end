var express = require('express');
var app = express();

//chargement du module HTTP.
const http = require('http');
//création du serveur HTTP.
var httpServer = http.createServer(app);

var socketIO = require('socket.io');
//  On utilise utilise la fonction obtenue avec notre serveur HTTP.
var io = socketIO.listen(httpServer);

var URL = 'mongodb://localhost:27017/jeu'
var db = require('db.js')
var session = require('express-session');
var cookieParser = require('cookie-parser');

// jade
var bodyParser = require('body-parser');
app.engine('jade', require('jade').__express);
app.use(bodyParser.urlencoded({
  extended: false
}));
app.set('view engine', 'jade');
app.set('views', 'html');

app.use(cookieParser());
app.use(session({
  secret:'123456789SECRET',       
  saveUninitialized : false,
  resave: false
}));

app.use(function(req, res, next) {
  if (req.session.connexion == undefined){
    req.session.connexion = 0;
  }
  next();
});

// Fichiers Statiques
app.use('/js', express.static(__dirname + '/js'));
app.use('/img', express.static(__dirname + '/img'));
app.use('/css', express.static(__dirname + '/css'));

db.connect(URL, function(err){
  if (err){
    console.log('Impossible de se connecter à la base de données.');
  } else {
    httpServer.listen(8888, function(){
      console.log('Le serveur est disponible sur le port 8888')
    });
  }
});

//fonction qui produit la réponse HTTP.
var writeResponse = function writeHTTPResponse(HTTPResponse, responseCode, responseBody) {
    HTTPResponse.writeHead(responseCode, {
        'Content-type': 'text/html; charset=UTF-8',
        'Content-length': responseBody.length
    });
    HTTPResponse.write(responseBody, function() {
        HTTPResponse.end();
    });
};

//fonction qui produit une réponse HTTP contenant un message d'erreur 404 si le document HTML n'est pas trouvé.
var send404NotFound = function(HTTPResponse) {
    writeResponse(HTTPResponse, 404, '<doctype html!><html><head>Page Not Found</head><body><h1>404: Page Not Found</h1><p>The requested URL could not be found</p></body></html>');
};

//fonction générant un id de 24 caractères au hasard
var randInt = '';
var random;
var createId = function() {
    randInt = '';
    var myArray = [
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        0,
        'a',
        'b',
        'c',
        'd',
        'e',
        'f',
        'g',
        'h',
        'i',
        'j',
        'k',
        'l',
        'm',
        'n',
        'o',
        'p',
        'q',
        'r',
        's',
        't',
        'u',
        'v',
        'w',
        'x',
        'y',
        'z'
    ]
    for (var i = 0; i < 24; i++) {
        random = Math.floor(Math.random() * (myArray.length) + 1);
        randInt += myArray[random];
    }
    return randInt
}

var joueursEnLigne = {
  pseudoJoueur : '',
  scoreTotalJoueur : ''
};

var tableauJoueurs = {};

var joueur = function(){
  this.publicId = createId();
  this.width = 250;
  this.pseudo = joueursEnLigne.pseudoJoueur;
  this.score = joueursEnLigne.scoreTotalJoueur;
  this.bonneReponse = 0,
  this.mauvaiseReponse = 0,
  this.backgroundColor = '#F7EE94', //yellow
  this.monPerso = 'false',
  this.nomJoueur = ''
};

// objets création
var lesLogos = {
  nom: 'containerLogos',
  backgroundColor : '#E6E6FA', //grey
  numeroImage : 1,
  nomImage : 'javascript.png'
};

io.on('connection', function(socket) {

  console.log('vous etes bien connecté');
  
  tableauJoueurs[socket.id] = new joueur();
  var creaJoueur = tableauJoueurs[socket.id];
  
  //// ENVOIS Un //////////////////////////////////////////
    socket.broadcast.emit('envoisUn', { message:'message de l\'envois Un', creaJoueur});
  
  
  //// ENVOIS Deux /////////////////////////////////////////////
    socket.emit('envoisDeux', { message:'message de l\'envois Deux', lesLogos:lesLogos, tableauJoueurs, monPerso:creaJoueur.publicId });
  

   //// RECU Trois /////////////////////////////
    socket.on('envoisTrois', function(data){ //juste leRep
      
      
      // Transforme le Nombre String en Nombre Entier
      console.log('lesLogos.numeroImage: ' + lesLogos.numeroImage);
      
      //console.log(data.monPerso);
      
      
      // Récupére la Réponse du Joueur
      var reponse = data.laRep;

      var collection = db.get().collection('reponses');
      // Recherche de la donnée ayant le Numéro Image Correspondant
      collection.find({"numero":lesLogos.numeroImage}).toArray(function(err, data){

        // Si la Réponse est Bonne
        if (reponse == data[0].nom){
          // le Résultat est Positif
          
          tableauJoueurs[socket.id].bonneReponse++;
          tableauJoueurs[socket.id].mauvaiseReponse;
          
          console.log('joueur');
          console.log(tableauJoueurs[socket.id].score);
          console.log(tableauJoueurs[socket.id].bonneReponse);
          
          lesLogos.numeroImage++;
          
          if (tableauJoueurs[socket.id].bonneReponse == 10){
            console.log('entrer');
            var collectionJoueurs = db.get().collection('joueurs');
            collectionJoueurs.findOneAndUpdate({"pseudo":tableauJoueurs[socket.id].pseudo},{$inc:{"score":1}});

          };
          
          // Recherche de la donnée ayant le NEW Numéro Image Correspondant
           collection.find({"numero":lesLogos.numeroImage}).toArray(function(err, data){

              lesLogos.nomImage = data[0].img;

              var laCouleur = '#CFFFAB'; //green

              //lesLogos.backgroundColor = laCouleur;
              tableauJoueurs[socket.id].backgroundColor = laCouleur;

              /// ENVOIS Quatre //////////////////////////
              io.emit('envoisQuatre', { message:'message de l\'envois Quatre', lesLogos:lesLogos, backgroundColor:tableauJoueurs[socket.id].backgroundColor, nomImage:lesLogos.nomImage, numeroImage:lesLogos.numeroImage, id: tableauJoueurs[socket.id].publicId, bonneReponse:tableauJoueurs[socket.id].bonneReponse, mauvaiseReponse:tableauJoueurs[socket.id].mauvaiseReponse })

            }) // FIN 1er collection.fin()
         
        // Si la Réponse est Fausse
        } else {
          
          tableauJoueurs[socket.id].mauvaiseReponse++;
          tableauJoueurs[socket.id].bonneReponse;
          
          
          var laCouleur = '#FFBBB3'; //red
          
          tableauJoueurs[socket.id].backgroundColor = laCouleur;

          /// ENVOIS Quatre //////////////////////////
          io.emit('envoisQuatre', { message:'message de l\'envois Quatre', lesLogos:lesLogos, backgroundColor:tableauJoueurs[socket.id].backgroundColor, nomImage:lesLogos.nomImage, numeroImage:lesLogos.numeroImage, id: tableauJoueurs[socket.id].publicId, mauvaiseReponse:tableauJoueurs[socket.id].mauvaiseReponse, bonneReponse:tableauJoueurs[socket.id].bonneReponse})
          
        } //FIN else

      }); // FIN 2eme collection.find()
      
    }); // FIN envois Trois 
  
    // Deconnexion ///////////////////////////////////////
    socket.on('disconnect', function(data){
      socket.broadcast.emit('leftTheGame', {message:'parti', id: tableauJoueurs[socket.id]});
      delete tableauJoueurs[socket.id];
    });

});

// FAIT ACCUEIL
app.get('/', function(req, res){
  res.render('accueil',{nomPage : "Accueil"})
});


// FAIT INSCRIPTION
app.get('/inscription', function(req, res){
  res.render('inscription.jade', { nomPage: 'Inscription', message: "Veuillez saisir les informations suivantes"});
});

// FAIT ENREGISTREMENT JOUEUR
app.post('/enregistrement-joueur', function(req,res){
  var collection = db.get().collection('joueurs');
  if (req.body.pseudo != '' && req.body.mdp != ''){
    collection.find({pseudo:req.body.pseudo}).toArray(function(err, data){
      if (data.length !=0){
        res.render('inscription', {nomPage: "Inscription", message:"Un autre utilisateur a déjà ce pseudo, choisissez en un autre.."});
      } else {
        collection.insert({pseudo:req.body.pseudo, mdp:req.body.mdp, score:0});
        joueursEnLigne.pseudoJoueur = req.body.pseudo;
        joueursEnLigne.scoreTotalJoueur = 0;
        res.render('valide', {nomPage: "valide", pseudo:req.body.pseudo});
      }
    });
  } else {
    res.render('inscription', { nomPage: 'Inscription', message: "Veuillez saisir les informations suivantes : votre Pseudo et votre Mot de Passe"});
  }
});

// FAIT CONNEXION
app.get('/connexion', function(req,res){
  res.render('connexion.jade', { nomPage: 'Connexion', message: "Vueillez saisir les informations suivantes"});
});

// FAIT VERIFICATION CONNEXION
app.post('/connexion-verification', function(req, res){
  var collection = db.get().collection('joueurs'); 
  if (req.body.pseudo != '' && req.body.mdp != ''){
    collection.find({pseudo:req.body.pseudo, mdp:req.body.mdp}).toArray(function(err, data){
      //console.log(req.params.pseudo);
      if (data.length !=0){
        //console.log(data);
        joueursEnLigne.pseudoJoueur = data[0].pseudo;
        joueursEnLigne.scoreTotalJoueur = data[0].score;
        
          res.render('jeuBack', {nomPage: "Jouer", pseudo:req.body.pseudo, infosMulti:data, titre:'A vous de jouer..'});
        
      } else {
        //var dataRecup = {pseudo:req.body.pseudo, mdp:req.body.mdp};
        res.render('connexion',{nomPage : "Connexion", message: "Votre pseudo ou mot de passe est incorrect"});
      }
    });
  } else {
    res.render('connexion',{nomPage : "Connexion", message: "Veuillez saisir les informations suivantes : votre Pseudo et votre Mot de Passe"});
  }
});

// FAIT SCORE
app.get('/score', function(req, res){
  var collection = db.get().collection('joueurs');
  collection.find().limit(5).sort({score:-1}).toArray(function(err, data){
    res.render('score',{joueurs : data, nomPage : "Les scores"})
  })
});
