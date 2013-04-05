Meteor.startup(function() {

	audio();
	
	var booth = $('#booth'),
		canvas = $('canvas', booth)[0],
		context = canvas.getContext('2d'),
		video = $('video', booth)[0];
	
	navigator.getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia
	window.URL = window.URL || window.mozURL || window.webkitURL;
	
	if(navigator.mozGetUserMedia) {
		console.warn('Set media.navigator.enabled to true in about:config to make mozGetUserMedia work. If it is already working, woo for you.');
	}
	
	// Only show the booth when the user has allowed webcam use
	booth.hide();
	
	navigator.getUserMedia({'video': true}, function(stream) {
		video.src = window.URL.createObjectURL(stream);
		video.play();
		booth.show();
	}, function(err) {
		console.error('Video capture error', err); 
	});
	
	// Get the total count of the photos on the server so we can begin retrieving them
	Meteor.call('photosCount', function(err, count) {
		if(err) {
			return console.error('failed to count the photos', err);
		}
		
		console.log(count, 'photos available');
		
		// Retrieve photos in chunks
		var limit = 1;
		var chunkSize = 5;
		var subscriptons = [];
		
		(function bufferedSubscribe() {
			
			subscriptons.push(
				Meteor.subscribe('photos', limit, function() {
					if(limit == 1000000) return;
					
					console.log('Got first ' + limit + ' photos!');
					
					if(limit < count) {
						limit += chunkSize;
						chunkSize = chunkSize >= 15 ? 15 : chunkSize + 5;
					} else {
						limit = 1000000;
					}
					
					bufferedSubscribe();
					
					// Remove the previous subscription
					if(subscriptons.length) {
						subscriptons.shift().stop();
					}
				})
			);
			
		})();
	});

	// Do some d3 when the Photos collection changes.
	Deps.autorun(function(){
		renderPhotos();
	});

	// Trigger photo take
	booth.click(function() {
		context.drawImage(video, 0, 0, 160, 120);
		Photos.insert({url: canvas.toDataURL(), created: Date.now()});
	});

	
});

audio = function audio(){
	audio.foam = new buzz.sound( "/audio/foam", { formats: [ "ogg", "mp3" ] }).setVolume(20);
	audio.burst = new buzz.sound( "/audio/burst", { formats: [ "ogg", "mp3" ] }).setVolume(20);
	buzz.all().load();
};

function renderPhotos() {
	
	var photos = Photos.find().fetch();
	
	if(!photos.length) return;
	
	var width = document.documentElement.clientWidth;
	var height = document.documentElement.clientHeight;
	
	var svg = d3.select('#photos svg')
		.attr('width', width)
		.attr('height', height);
	
	var layout = d3.layout.pack().sort(d3.descending).size([width, height]);
	
	var data = photos.map(function(photo) {
		return {_id: photo._id, url: photo.url, value: getValue(photo.created)};
	});
	
	var photo = svg.selectAll('g')
		.data(layout.nodes({children: data}).filter(function(d) {return !d.children;}), function(d) {return d._id;});
	
	var photoEnter = photo.enter()
		.append('g')
		.attr('class', 'photo')
		.attr('transform', 'translate(' + (width / 2) + ', ' + (height / 2) + ')')
		.on("click", function(d) { 
			Photos.remove(d._id); 
			audio.burst.stop(); 
			audio.burst.play();
		}).call(function(selection){
			console.log("call", selection);
			for(var i = 0; i < selection.length; i++){
				audio.foam.stop();
				audio.foam.play();
			}
		});
	
	photoEnter.append('clipPath')
		.attr('id', function(d) { return 'cp-' + d._id; })
		.append('circle');
	
	photoEnter.append('image')
		.attr('xlink:href', function(d) { return d.url; })
		.attr('preserveAspectRatio', 'none')
		.attr('clip-path', function(d) { return 'url(#cp-' + d._id + ')'; });
	
	var photoUpdate = photo.transition()
		.attr('transform', function(d) { return 'translate(' + (d.x - d.r) + ', ' + (d.y - d.r) + ')'; });
	
	photoUpdate.select('image')
		.attr('width', function(d) { return d.r * 2; })
		.attr('height', function(d) { return d.r * 2; });
	
	photoUpdate.select('circle')
		.attr('r', function(d){ return d.r; })
		.attr('cx', function(d){ return d.r; })
		.attr('cy', function(d){ return d.r; });
	
	var photoExit = photo.exit();
	photoExit.transition().remove().select('circle').attr('r', 0);
}

// Time ranges in millis for getValue
var fifteenSeconds = 15000,
	thirtySeconds = fifteenSeconds * 2,
	oneMinute = thirtySeconds * 2,
	fiveMinutes = oneMinute * 5,
	fifteenMinutes = fiveMinutes * 3,
	thirtyMinutes = fifteenMinutes * 2,
	oneHour = thirtyMinutes * 2,
	fiveHours = oneHour * 5,
	fifteenHours = fiveHours * 3,
	thirtyHours = fifteenHours * 2;

function getValue(time) {
	
	var now = Date.now();
	
	if(time > now - fifteenSeconds)
		return 110;
	if(time > now - thirtySeconds)
		return 85;
	if(time > now - oneMinute)
		return 60;
	if(time > now - fiveMinutes)
		return 45;
	if(time > now - fifteenMinutes)
		return 30;
	if(time > now - thirtyMinutes)
		return 20;
	if(time > now - oneHour)
		return 15;
	if(time > now - fiveHours)
		return 10;
	if(time > now - fifteenHours)
		return 5;
	if(time > now - thirtyHours)
		return 2;
	
	return 1;
}
