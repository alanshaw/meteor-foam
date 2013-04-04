Meteor.startup(function() {
	
	// Grab elements, create settings, etc.
	var canvas = $('#booth canvas')[0],
		context = canvas.getContext('2d'),
		video = $('#booth video')[0],
		videoObj = {'video': true},
		errBack = function(error) {
			console.error('Video capture error', error.code); 
		};
	
	// Put video listeners into place
	if(navigator.getUserMedia) { // Standard
		navigator.getUserMedia(videoObj, function(stream) {
			video.src = stream;
			video.play();
		}, errBack);
	} else if(navigator.webkitGetUserMedia) {
		navigator.webkitGetUserMedia(videoObj, function(stream){
			video.src = window.webkitURL.createObjectURL(stream);
			video.play();
		}, errBack);
	} else if(navigator.mozGetUserMedia) {
		console.warn('Set media.navigator.enabled to true in about:config to make mozGetUserMedia work. If it is already working, woo for you.');
		navigator.mozGetUserMedia(videoObj, function(stream){
			video.src = window.URL.createObjectURL(stream);
			video.play();
		}, errBack);
	}
	
	// Get the total count of the photos on the server so we can begin retrieving them
	Meteor.call('photosCount', function(err, count) {
		if(err) {
			return console.error('failed to count the photos', err);
		}
		
		// Retrieve photos in 5 item chunks
		var limit = 5;
		var subscriptons = [];
		
		(function bufferedSubscribe() {
			
			subscriptons.push(
				Meteor.subscribe('photos', limit, function() {
					if(limit == 1000000) return;
					
					console.log('Got first ' + limit + ' photos!');
					
					if(limit < count) {
						limit += 5;
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
	$('#booth button').click(function() {
		context.drawImage(video, 0, 0, 160, 120);
		Photos.insert({url: canvas.toDataURL()});
	});
});

function renderPhotos(){
	var data = Photos.find().fetch();
	var width = document.documentElement.clientWidth;
	var height = document.documentElement.clientHeight;
	
	var area = width * height;
	var photoArea = area / data.length;
	
	// The magic number is 12 because the photos are in 4:3 proportion
	var multiplier = Math.floor(Math.sqrt(photoArea / 12));
	
	var photoWidth = 4 * multiplier;
	var photoHeight = 3 * multiplier;
	
	console.log("Rendering", data.length, photoWidth, photoHeight);

	var photos = d3.select('#photos');
	
	var viz = photos.selectAll("img").data(data, function(d){ return d._id});

	viz.enter()
		.append('img')
		.attr('src', function(d) { return d.url });

	viz.transition().attr('width', photoWidth).attr('height', photoHeight);
}
