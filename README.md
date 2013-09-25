#Domotica

A Javascript library for working with the webkitSpeechRecognition API.

##Todo!
* Add support for routes with numbers for example "turn on number %d" would respond to "turn on number one" or "turn on number two".
* Add support for routes with wildcards for example "turn on the %w" would respond to "turn on the tv" or "turn on the toaster".
* Add the ability for domintica to automatically restart the listener if it stops for some reason.
* Add support for routes with word lists for example "turn on the %(tv|toaster)" would respond to "turn on the tv" or "turn on the toaster".

##Example

```javascript
var router = new (Domotica.Router.extend({
	routes: {
	  "house lights" : "toggleLights"
	},

	toggleLights: function(){
	  console.log("toggleLights")
	}
}));

Domotica.listener.listen();
```
