Meteor.startup(function() {
	
	var booth = $('#booth'),
		canvas = $('canvas', booth)[0],
		context = canvas.getContext('2d'),
		video = $('video', booth)[0];
	
	// Only show the booth when the user has allowed webcam use
	booth.hide();
	
	try {
		
		navigator.getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia;
		window.URL = window.URL || window.mozURL || window.webkitURL;
		
		navigator.getUserMedia({'video': true}, function(stream) {
			video.src = window.opera ? stream : window.URL.createObjectURL(stream);
			video.play();
			booth.show();
		}, function(err) {
			console.error('Video capture error', err); 
		});
		
	} catch(err) {
		console.log('navigator.getUserMedia error', err);
	}
	
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
		
		(function chunkedSubscribe() {
			
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
					
					chunkedSubscribe();
					
					// Remove the previous subscription
					if(subscriptons.length) {
						subscriptons.shift().stop();
					}
				})
			);
			
		})();
	});
	
	// Do some d3 when the Photos collection changes.
	Tracker.autorun(renderPhotos);
	
	// Trigger photo take
	booth.click(function() {
		context.drawImage(video, 0, 0, 160, 120);
		Photos.insert({url: canvas.toDataURL(), created: Date.now()});
	});
});

var audio = (function audio() {
	audio.foam = new buzz.sound( "/audio/foam", { formats: [ "ogg", "mp3" ] }).setVolume(80);
	audio.burst = new buzz.sound( "/audio/burst", { formats: [ "ogg", "mp3" ] }).setVolume(80);
	buzz.all().load();
	return audio;
})();

function renderPhotos() {
	
	var photos = Photos.find().fetch();
	
	if(!photos.length) return;
	
	var width = document.documentElement.clientWidth;
	var height = document.documentElement.clientHeight;
	
	var svg = d3.select('#photos svg')
		.attr('width', width)
		.attr('height', height);
	
	var layout = d3.layout.pack().sort(d3.descending).size([width, height]);
	
	var minCreated = Date.now();
	var maxCreated = 0;
	
	photos.forEach(function(photo) {
		if(photo.created < minCreated) {
			minCreated = photo.created;
		}
		if(photo.created > maxCreated) {
			maxCreated = photo.created;
		}
	});
	
	// Create the scale
	var scale = d3.scale.linear().domain([minCreated, maxCreated]).range([1, photos.length]);
	
	var data = photos.map(function(photo) {
		return {_id: photo._id, url: photo.url, value: scale(photo.created)};
	});
	
	var photo = svg.selectAll('g')
		.data(layout.nodes({children: data}).filter(function(d) {return !d.children;}), function(d) {return d._id;});
	
	var photoEnter = photo.enter()
		.append('g')
		.attr('class', 'photo')
		.attr('transform', 'translate(' + (width / 2) + ', ' + (height / 2) + ')')
		.on('click', function(d) {
			Photos.remove(d._id);
		}).call(function(selection) {
			if(!selection.empty()) audio.foam.stop().play();
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
	
	photoExit.call(function(selection) {
		if(!selection.empty()) audio.burst.stop().play();
	});
	
	photoExit.transition().remove().select('circle').attr('r', 0);
}