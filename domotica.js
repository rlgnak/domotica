(function(){
  var root = this;

  var Domotica;
  if (typeof exports !== 'undefined') {
    Domotica = exports;
  } else {
    Domotica = root.Domotica = {};
  }

  Domotica.VERSION = '0.0.1';

  //these are used when attepting to recognize numbers
  var numbers = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

  var Router = Domotica.Router = function(options){
    options || (options = {});
    this._bindRoutes();
    this.initialize.apply(this, arguments);
  }

  _.extend(Router.prototype, {
    initialize: function(){},

    route: function(phrase, callback) {
      var router = this;
      Domotica.listener.route(phrase, function(transcript){
        //todo parse the transcript and pass its results to the callback
        callback && callback.call(router, transcript);
      });
      return this;
    },

    _bindRoutes: function() {
      if (!this.routes) return;
      var route, routes = _.keys(this.routes);
      while ((route = routes.pop()) != null) {
        this.route(route, this[this.routes[route]]);
      }
    },
  });

  var Listener = Domotica.Listener = function(options){
    options || (options = {});

    if (!('webkitSpeechRecognition' in window)) 
      throw new Error("Domotica can only listen in Chrome....");

    if(this._listener) 
      throw new Error("Domotica.listener has already been started");

    _.bindAll(this, '_start', '_end', '_error', '_result');

    this.handlers = [];

    //create the listener
    var listener = this._listener = new webkitSpeechRecognition();

    //set the options
    listener.continuous = options.continuous ? options.continuous: true;
    listener.interimResults = options.interimResults ? options.interimResults: false;
    listener.maxAlternatives  = options.maxAlternatives  ? options.maxAlternatives : 1;
    listener.lang = options.lang  ? options.lang : "en";

    //attach the speech events
    listener.onstart = this._start;
    listener.onend = this._end;
    listener.onerror = this._error;
    listener.onresult = this._result;

    this.initialize.apply(this, arguments);
  }

  _.extend(Listener.prototype, {

    //these are for the user to override if they wish
    initialize: function(){},
    start: function(){},
    end: function(){},
    onerror: function(){},
    onresult: function(){},

    listen: function(){
      this._listener.start();
    },

    _start: function(){
      this.start.apply(this, arguments);
    },

    _end: function(){
      this.end.apply(this, arguments);
    },

    _error: function(){
      this.onerror.apply(this, arguments);
    },

    _result: function(e){
      //see if there are any actual results
      if (typeof(e.results) == 'undefined') {
        return;
      }

      var listener = this;
      var newSpeechRecognitionResults = _.toArray(e.results).slice(e.resultIndex)
      _.each(newSpeechRecognitionResults, function(speechRecognitionResult){
        _.each(speechRecognitionResult, function(speechRecognitionAlternative){      
            console.log(speechRecognitionAlternative.transcript)

            //ignore anything that doesn't match with atleast a 50% confidence;
            if(speechRecognitionAlternative.confidence < 0.50) return;

            listener.loadTask(speechRecognitionAlternative.transcript);
          });
      });

      this.onresult.apply(this, arguments);
    },

    loadTask: function(transcript){  
      transcript = transcript.trim();
      var matched = _.any(this.handlers, function(handler) {
        var phraseFragments = handler.phrase.split(" "); //handler.match(/%[a-z]|([^%]*)/g);
        var transcriptFragments = transcript.split(" "); 

        //for now we are just going to assume the number of words are the same and if they
        //they are not the same then it just doesn't match.
        if(phraseFragments.length != transcriptFragments.length){
          return false;
        }

        var i, phraseFragment, transcriptFragment, levenshteinDistanceTotal = 0;
        for(i = 0; i < phraseFragments.length; i++){
          phraseFragment = phraseFragments[i];
          transcriptFragment = transcriptFragments[i];

          if(phraseFragment === "%d"){
            if(_.isNumber(parseInt(transcriptFragment))){
              continue;
            };

            levenshteinDistanceTotal += _.min(numbers, function(number){
              return Levenshtein(transcriptFragment, number);
            });
          }else if(phraseFragment === "%w"){
            continue;
          }else{ 
            levenshteinDistanceTotal += Levenshtein(transcriptFragment, phraseFragment);
          }
        }

        //check the levenshtein distance between the route phrase and the transcript 
        //if atleast levenshtein distance is less then 25% of the length lets assume it matches
        if(levenshteinDistanceTotal <= transcript.length / 4){
          handler.callback(transcript);
          return true;
        }
      });
      return matched;
    },


    route: function(phrase, callback){
      this.handlers.unshift({phrase: phrase, callback: callback});
    }
  });

  // Create the default Domotica.listener.
  Domotica.listener = new Listener;


  // Helpers
  // -------

  //Carlos R. L. Rodrigues (http://www.jsfromhell.com)
  var Levenshtein = function(s1, s2){
    var s, i, j, m, n;
    var s = s1.split("");
    var c = s2.split("");
    var l = s1.length;
    var t = s2.length;

    if(!(l || t)) return Math.max(l, t);
    for(var a = [], i = l + 1; i; a[--i] = [i]);
    for(i = t + 1; a[0][--i] = i;);
    for(i = -1, m = s.length; ++i < m;)
        for(j = -1, n = c.length; ++j < n;)
            a[(i *= 1) + 1][(j *= 1) + 1] = Math.min(a[i][j + 1] + 1, a[i + 1][j] + 1, a[i][j] + (s[i] != c[j]));
    return a[l][t];
  }

  //Backbone.extend (http://www.backbonejs.org)
  var extend = function(protoProps, staticProps) {
    var parent = this;
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent's constructor.
    if (protoProps && _.has(protoProps, 'constructor')) {
      child = protoProps.constructor;
    } else {
      child = function(){ return parent.apply(this, arguments); };
    }

    // Add static properties to the constructor function, if supplied.
    _.extend(child, parent, staticProps);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function.
    var Surrogate = function(){ this.constructor = child; };
    Surrogate.prototype = parent.prototype;
    child.prototype = new Surrogate;

    // Add prototype properties (instance properties) to the subclass,
    // if supplied.
    if (protoProps) _.extend(child.prototype, protoProps);

    // Set a convenience property in case the parent's prototype is needed
    // later.
    child.__super__ = parent.prototype;

    return child;
  };

  Router.extend = Listener.extend = extend;

}).call(this);